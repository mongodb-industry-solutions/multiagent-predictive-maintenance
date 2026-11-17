import { NextResponse } from "next/server";
import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { createActivityLog } from "@/lib/contestable/activityLog.js";
import {
  AUDIT_AGENT_REGISTRY,
  AUDIT_COLLECTIONS,
  CHANGE_RECORDS_VALIDATOR,
} from "@/lib/auditTrail/constants.js";
import { getAuditScenarioByKey } from "@/lib/auditTrail/scenarios.js";
import {
  computeEvidenceSha256,
  evaluateControlPolicy,
  reconstructInterventionContext,
} from "@/lib/auditTrail/policyEngine.js";
import {
  ensureAuditTrailProvisioned,
  getAuditTrailStatus,
  seedAuditTrailData,
} from "@/lib/auditTrail/seedData.js";
import {
  runDraftChangeRecordStep,
  runGovernedRetrievalStep,
} from "@/agents/audit-trail/graph.js";

function streamNdjson(work) {
  const encoder = new TextEncoder();
  let chain = Promise.resolve();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event) => {
        chain = chain.then(() => {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        });
        return chain;
      };
      try {
        const result = await work(emit);
        await emit({ type: "result", ...(result || {}) });
      } catch (error) {
        console.error("Audit Trail stream failed:", error);
        await emit({
          type: "error",
          message: error?.message || "Audit Trail request failed",
        });
      } finally {
        try {
          await chain;
        } catch {
          // Client may have disconnected
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

async function getClientAndDb() {
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required");
  }
  const client = await getMongoClientPromise();
  return { client, db: client.db(dbName) };
}

function stripMongoId(doc) {
  if (!doc) return null;
  const copy = { ...doc };
  delete copy._id;
  return copy;
}

function summarizeAnnex11FieldChanges(prevDoc, nextDoc) {
  if (!prevDoc) {
    return [
      {
        field: "status",
        before: null,
        after: nextDoc.status,
      },
      {
        field: `intervention.${nextDoc.intervention?.parameter || "setpoint"}`,
        before: `${nextDoc.intervention?.before_value} ${nextDoc.intervention?.unit || ""}`.trim(),
        after: `Proposed ${nextDoc.intervention?.proposed_value} ${nextDoc.intervention?.unit || ""}`.trim(),
      },
      {
        field: "intervention.mes_order_id",
        before: null,
        after: nextDoc.intervention?.mes_order_id || "UNBOUND",
      },
    ];
  }

  const diffs = [];
  const pushIfChanged = (field, beforeVal, afterVal) => {
    const b = beforeVal ?? null;
    const a = afterVal ?? null;
    if (JSON.stringify(b) !== JSON.stringify(a)) {
      diffs.push({ field, before: b, after: a });
    }
  };

  pushIfChanged("status", prevDoc.status, nextDoc.status);
  pushIfChanged(
    "intervention.execution_state",
    prevDoc.intervention?.execution_state,
    nextDoc.intervention?.execution_state
  );
  pushIfChanged(
    "intervention.applied_value",
    prevDoc.intervention?.applied_value,
    nextDoc.intervention?.applied_value
  );
  pushIfChanged(
    "policy_evaluation.classification",
    prevDoc.policy_evaluation?.classification,
    nextDoc.policy_evaluation?.classification
  );
  if (
    !prevDoc.governed_requirements &&
    nextDoc.governed_requirements?.approved_procedures
  ) {
    diffs.push({
      field: "governed_requirements.approved_procedures",
      before: null,
      after: nextDoc.governed_requirements.approved_procedures.map(
        (p) => `${p.doc_id} v${p.version}`
      ),
    });
  }
  pushIfChanged(
    "approval.decision",
    prevDoc.approval?.decision,
    nextDoc.approval?.decision
  );
  pushIfChanged(
    "approval.meaning_of_signature",
    prevDoc.approval?.meaning_of_signature,
    nextDoc.approval?.meaning_of_signature
  );
  pushIfChanged(
    "outcome.loop_status",
    prevDoc.outcome?.loop_status,
    nextDoc.outcome?.loop_status
  );

  return diffs;
}

/**
 * Atomically writes the current change record and appends an immutable, hash-chained snapshot
 * to `change_record_revisions` using a MongoDB multi-document transaction.
 */
async function commitVersionedRecord({
  client,
  db,
  previousDoc = null,
  recordDoc,
  stage,
  triggeredBy,
  agentId,
  changeNote,
  isInsert = false,
}) {
  const recordsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS);
  const revisionsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS);

  const cleanDoc = stripMongoId(recordDoc);
  const prevHash = previousDoc?.evidence_sha256 || null;
  const snapshotHash = computeEvidenceSha256({
    prev_snapshot_sha256: prevHash,
    intervention_id: cleanDoc.intervention_id,
    v: cleanDoc.v,
    status: cleanDoc.status,
    intervention: cleanDoc.intervention,
    policy_evaluation: cleanDoc.policy_evaluation,
    governed_procedures: (
      cleanDoc.governed_requirements?.approved_procedures || []
    ).map((p) => `${p.doc_id}@${p.version}`),
    draft_record: cleanDoc.draft_record,
    approval: cleanDoc.approval,
    outcome: cleanDoc.outcome,
  });

  const persistedDoc = {
    ...cleanDoc,
    evidence_sha256: snapshotHash,
  };

  const fieldChanges = summarizeAnnex11FieldChanges(previousDoc, persistedDoc);

  const revisionDoc = {
    intervention_id: persistedDoc.intervention_id,
    v: persistedDoc.v,
    stage,
    triggered_by: triggeredBy,
    agent_id: agentId,
    change_note: changeNote,
    field_changes: fieldChanges,
    prev_snapshot_sha256: prevHash,
    snapshot_sha256: snapshotHash,
    snapshot: persistedDoc,
    changed_at: persistedDoc.updated_at || persistedDoc.created_at,
  };

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      if (isInsert) {
        await recordsCol.insertOne({ ...persistedDoc }, { session });
      } else {
        await recordsCol.replaceOne(
          { intervention_id: persistedDoc.intervention_id },
          { ...persistedDoc },
          { session, upsert: true }
        );
      }
      await revisionsCol.insertOne({ ...revisionDoc }, { session });
    });
  } catch (txError) {
    if (
      /Transaction numbers are only allowed|transactions are not supported/i.test(
        String(txError?.message)
      )
    ) {
      if (isInsert) {
        await recordsCol.insertOne({ ...persistedDoc });
      } else {
        await recordsCol.replaceOne(
          { intervention_id: persistedDoc.intervention_id },
          { ...persistedDoc },
          { upsert: true }
        );
      }
      await revisionsCol.insertOne({ ...revisionDoc });
    } else {
      throw txError;
    }
  } finally {
    await session.endSession();
  }

  return { record: persistedDoc, revision: revisionDoc };
}

async function buildInterventionId(db) {
  const count = await db
    .collection(AUDIT_COLLECTIONS.CHANGE_RECORDS)
    .countDocuments();
  const suffix = String(100 + count + 1).padStart(4, "0");
  const rand = String(Math.floor(Math.random() * 90) + 10);
  return `CHG-2026-${suffix}-${rand}`;
}

async function fetchRevisionsForId(db, interventionId) {
  return db
    .collection(AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS)
    .find({ intervention_id: interventionId }, { projection: { _id: 0 } })
    .sort({ v: 1 })
    .toArray();
}

async function fetchLineageBundle(db, interventionId) {
  const pipeline = [
    { $match: { intervention_id: interventionId } },
    {
      $lookup: {
        from: AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS,
        let: { id: "$intervention_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$intervention_id", "$$id"] } } },
          { $sort: { v: 1 } },
          { $project: { _id: 0 } },
        ],
        as: "revisions",
      },
    },
    { $project: { _id: 0 } },
  ];

  const docs = await db
    .collection(AUDIT_COLLECTIONS.CHANGE_RECORDS)
    .aggregate(pipeline)
    .toArray();

  return {
    lineage: docs[0] || null,
    pipeline,
    validator: CHANGE_RECORDS_VALIDATOR,
  };
}

export async function GET() {
  try {
    const { db } = await getClientAndDb();
    let status = await getAuditTrailStatus(db);
    if (!status.seeded || !status.schemaValidationActive) {
      await ensureAuditTrailProvisioned();
      status = await getAuditTrailStatus(db);
    }

    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { message: error?.message || "Failed to read Audit Trail status" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === "provision") {
      const summary = await seedAuditTrailData({ force: Boolean(body.force) });
      const { db } = await getClientAndDb();
      const status = await getAuditTrailStatus(db);
      return NextResponse.json({ summary, status });
    }

    // STEP 1: Production Agent captures event + Documentation Agent reconstructs MongoDB context -> saves v1
    if (action === "capture_context") {
      const scenarioKey = body.scenario_key || "routine_trim";
      const dataSource = body.data_source === "local" ? "local" : "leafy";
      const factorySnapshot = body.factory_snapshot || null;

      return streamNdjson(async (emit) => {
        await ensureAuditTrailProvisioned();
        const { client, db } = await getClientAndDb();
        const scenario = getAuditScenarioByKey(scenarioKey);
        const nowIso = new Date().toISOString();
        const interventionId = await buildInterventionId(db);

        const prodLog = createActivityLog(
          (ev) => emit({ ...ev, agent: "production_agent" }),
          "production_agent"
        );
        const docLog = createActivityLog(
          (ev) => emit({ ...ev, agent: "documentation_agent" }),
          "documentation_agent"
        );

        const captureRunId = await prodLog.toolStart("capture_intervention", {
          intervention_id: interventionId,
          station: "LTW-04 · Laser Tab Welding",
          parameter: scenario.parameter_label,
          before_value: scenario.before_value,
          proposed_value: scenario.proposed_value,
          unit: scenario.unit,
        });

        const reconstructed = await reconstructInterventionContext({
          db,
          scenarioKey,
          dataSource,
          factorySnapshot,
        });

        await prodLog.toolEnd(captureRunId, "capture_intervention", {
          ts: nowIso,
          agent: reconstructed.agents.production_agent.display_name,
          credential: reconstructed.agents.production_agent.credential_type,
        });

        const ctxRunId = await docLog.toolStart("reconstruct_mongodb_context", {
          data_source: dataSource,
          collections:
            reconstructed.reconstructed_context.mongodb_collections_joined,
        });

        await docLog.toolEnd(ctxRunId, "reconstruct_mongodb_context", {
          mes_order_id:
            reconstructed.reconstructed_context.order_context.mes_order_id ||
            "UNBOUND",
          material_master:
            reconstructed.reconstructed_context.material_spec.materialMaster,
          max_weld_temp_c:
            reconstructed.reconstructed_context.material_spec.maxWeldTempC,
          pre_peak_temp_c:
            reconstructed.reconstructed_context.telemetry_window.pre_peak_temp_c,
        });

        const initialRecord = {
          intervention_id: interventionId,
          schema_version: 1,
          v: 1,
          scenario_key: scenario.key,
          data_source: dataSource,
          status: "captured",
          agents: reconstructed.agents,
          intervention: {
            ...reconstructed.intervention,
            ts: nowIso,
          },
          reconstructed_context: reconstructed.reconstructed_context,
          policy_evaluation: null,
          governed_requirements: null,
          episodic_recall: [],
          draft_record: null,
          approval: null,
          outcome: null,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const committed = await commitVersionedRecord({
          client,
          db,
          recordDoc: initialRecord,
          stage: "Captured & Context Reconstructed",
          triggeredBy: "Production Agent",
          agentId: "production_agent",
          changeNote: `Captured ${scenario.parameter_label} (${scenario.before_value} → ${scenario.proposed_value} ${scenario.unit}) and joined operational context from MongoDB.`,
          isInsert: true,
        });

        return {
          record: committed.record,
        };
      });
    }

    // STEP 2: Deterministic policy rules + Governed $vectorSearch SOP retrieval -> saves v2
    if (action === "check_policy_and_retrieve") {
      const interventionId = body.intervention_id;
      if (!interventionId) {
        return NextResponse.json(
          { message: "intervention_id is required" },
          { status: 400 }
        );
      }

      return streamNdjson(async (emit) => {
        const { client, db } = await getClientAndDb();
        const existing = await db
          .collection(AUDIT_COLLECTIONS.CHANGE_RECORDS)
          .findOne({ intervention_id: interventionId });

        if (!existing) {
          throw new Error(`Change record '${interventionId}' not found`);
        }

        const docLog = createActivityLog(
          (ev) => emit({ ...ev, agent: "documentation_agent" }),
          "documentation_agent"
        );

        const policyRunId = await docLog.toolStart("check_control_policy", {
          mode: "deterministic_rules",
          recipe_id:
            existing.reconstructed_context?.recipe_envelope?.recipe_id,
          parameter: existing.intervention?.parameter,
          proposed_value: existing.intervention?.proposed_value,
        });

        const policyEvaluation = evaluateControlPolicy({
          agents: existing.agents,
          intervention: existing.intervention,
          reconstructedContext: existing.reconstructed_context,
        });

        await docLog.toolEnd(policyRunId, "check_control_policy", {
          classification: policyEvaluation.classification_label,
          routing_mode: policyEvaluation.routing_mode,
          all_passed: policyEvaluation.all_passed,
        });

        const recordWithPolicy = {
          ...stripMongoId(existing),
          intervention: {
            ...existing.intervention,
            applied_value: policyEvaluation.applied_value,
            execution_state: policyEvaluation.execution_state,
          },
          policy_evaluation: policyEvaluation,
        };

        const retrieval = await runGovernedRetrievalStep({
          recordDoc: recordWithPolicy,
          scenarioKey: existing.scenario_key,
          log: docLog,
        });

        const nowIso = new Date().toISOString();
        const updatedRecord = {
          ...recordWithPolicy,
          v: Number(existing.v || 1) + 1,
          status: "policy_evaluated",
          governed_requirements: retrieval.governed_requirements,
          episodic_recall: retrieval.episodic_recall,
          updated_at: nowIso,
        };

        const committed = await commitVersionedRecord({
          client,
          db,
          previousDoc: existing,
          recordDoc: updatedRecord,
          stage: "Policy Checked & SOPs Retrieved",
          triggeredBy: "Documentation Agent",
          agentId: "documentation_agent",
          changeNote: `Policy classified as '${policyEvaluation.classification_label}'; retrieved ${retrieval.governed_requirements.approved_procedures.length} approved SOP(s) via governed $vectorSearch.`,
        });

        return {
          record: committed.record,
        };
      });
    }

    // STEP 3: Documentation Agent drafts Change Record and routes for auto-approval / human sign-off / quarantine -> saves v3
    if (action === "draft_and_route") {
      const interventionId = body.intervention_id;
      if (!interventionId) {
        return NextResponse.json(
          { message: "intervention_id is required" },
          { status: 400 }
        );
      }

      return streamNdjson(async (emit) => {
        const { client, db } = await getClientAndDb();
        const existing = await db
          .collection(AUDIT_COLLECTIONS.CHANGE_RECORDS)
          .findOne({ intervention_id: interventionId });

        if (!existing) {
          throw new Error(`Change record '${interventionId}' not found`);
        }

        const docLog = createActivityLog(
          (ev) => emit({ ...ev, agent: "documentation_agent" }),
          "documentation_agent"
        );

        const draftRecord = await runDraftChangeRecordStep({
          recordDoc: existing,
          scenarioKey: existing.scenario_key,
          log: docLog,
        });

        const nowIso = new Date().toISOString();
        const routingMode =
          existing.policy_evaluation?.routing_mode || "human_esignature";

        let nextStatus = "pending_human_review";
        let approvalBlock = {
          required: true,
          routing_mode: "human_esignature",
          decision: "pending",
          authority_basis:
            "Out-of-PAR deviation held: awaiting Quality Engineer 21 CFR Part 11 electronic signature under SOP-QMS-008 v2.0.",
        };

        if (routingMode === "automated") {
          nextStatus = "auto_approved";
          approvalBlock = {
            required: false,
            routing_mode: "automated",
            decision: "auto_approved",
            meaning_of_signature:
              "Automated In-PAR Verification (SOP-LTW-014 v3.2)",
            authority_basis:
              "In-bounds adjustment within pre-validated Proven Acceptable Range (PAR) auto-verified under SOP-LTW-014 v3.2.",
            signed_at: nowIso,
          };
        } else if (routingMode === "security_quarantine") {
          nextStatus = "quarantined_blocked";
          approvalBlock = {
            required: false,
            routing_mode: "security_quarantine",
            decision: "blocked_quarantined",
            meaning_of_signature:
              "Automated OT Security Gate Block (POL-OTSEC-003 v1.1)",
            authority_basis:
              "Unverified external write blocked at OT gate under POL-OTSEC-003 v1.1.",
            signed_at: nowIso,
          };
        }

        const updatedRecord = {
          ...stripMongoId(existing),
          v: Number(existing.v || 2) + 1,
          status: nextStatus,
          draft_record: draftRecord,
          approval: approvalBlock,
          updated_at: nowIso,
        };

        const committed = await commitVersionedRecord({
          client,
          db,
          previousDoc: existing,
          recordDoc: updatedRecord,
          stage: "Change Record Drafted & Routed",
          triggeredBy: "Documentation Agent",
          agentId: "documentation_agent",
          changeNote: `Drafted standards-aligned Change Record and routed via '${routingMode}'.`,
        });

        return {
          record: committed.record,
        };
      });
    }

    // STEP 3 (Human Sign-Off on Scenario 2): Quality Engineer commits e-signature -> saves v4
    if (action === "submit_review") {
      const interventionId = body.intervention_id;
      const decision =
        body.decision === "approve_override"
          ? "approve_override"
          : "reject_hold";
      const humanAgent = AUDIT_AGENT_REGISTRY.quality_engineer;
      const reviewerName = String(
        body.reviewer_name || humanAgent.default_reviewer_name || "Elena Rostova"
      ).trim();
      const reviewerRole = String(
        body.reviewer_role ||
          humanAgent.default_reviewer_role ||
          "Lead Quality Engineer"
      ).trim();
      const signerUserId = String(
        body.signer_user_id || humanAgent.user_id || "e.rostova@leafy-factory.com"
      ).trim();
      const signingPin = String(body.signing_pin ?? "1121").trim();

      if (signingPin.length < 4) {
        return NextResponse.json(
          {
            message:
              "21 CFR Part 11 (11.200) requires two-factor re-authentication (User ID + Signing PIN) to execute an electronic signature.",
          },
          { status: 400 }
        );
      }

      const rationale = String(
        body.rationale ||
          (decision === "approve_override"
            ? "Authorized 1-batch 1560 W trial override with active thermal monitoring."
            : "Rejected 1560 W override per CHG-2026-0089 precedent; clean laser optics and resume at 1460 W.")
      ).trim();

      const meaningOfSignature =
        decision === "approve_override"
          ? "Temporary Controlled Deviation Authorization (SOP-QMS-008 v2.0)"
          : "Quality Rejection & Optics Maintenance Hold (SOP-QMS-008 v2.0)";

      const { client, db } = await getClientAndDb();
      const existing = await db
        .collection(AUDIT_COLLECTIONS.CHANGE_RECORDS)
        .findOne({ intervention_id: interventionId });

      if (!existing) {
        return NextResponse.json(
          { message: `Change record '${interventionId}' not found` },
          { status: 404 }
        );
      }

      if (existing.status !== "pending_human_review") {
        return NextResponse.json(
          {
            message: `Cannot sign record in '${existing.status}' state (must be 'pending_human_review').`,
          },
          { status: 409 }
        );
      }

      const nowIso = new Date().toISOString();
      const signatureHash = computeEvidenceSha256({
        intervention_id: interventionId,
        prior_evidence_sha256: existing.evidence_sha256,
        agent_id: humanAgent.agent_id,
        signer_user_id: signerUserId,
        reviewer_name: reviewerName,
        reviewer_role: reviewerRole,
        meaning_of_signature: meaningOfSignature,
        decision,
        rationale,
        signed_at: nowIso,
      });

      const appliedValue =
        decision === "approve_override"
          ? existing.intervention.proposed_value
          : existing.reconstructed_context?.recipe_envelope?.parameter_bounds
              ?.nominal || 1460;

      const nextStatus =
        decision === "approve_override" ? "approved_signed" : "rejected";
      const executionState =
        decision === "approve_override"
          ? "override_applied_signed"
          : "rejected_containment_applied";

      const updatedRecord = {
        ...stripMongoId(existing),
        v: Number(existing.v || 3) + 1,
        status: nextStatus,
        agents: {
          ...existing.agents,
          quality_engineer: {
            agent_id: humanAgent.agent_id,
            user_id: signerUserId,
            display_name: `${reviewerName} · ${reviewerRole}`,
            reviewer_name: reviewerName,
            reviewer_role: reviewerRole,
            credential_type: humanAgent.credential_type,
          },
        },
        intervention: {
          ...existing.intervention,
          applied_value: appliedValue,
          execution_state: executionState,
        },
        approval: {
          required: true,
          routing_mode: "human_esignature",
          decision,
          signer_user_id: signerUserId,
          reviewer_name: reviewerName,
          reviewer_role: reviewerRole,
          auth_method:
            "21 CFR 11.200 Two-Factor (Authenticated Session + Signing PIN)",
          meaning_of_signature: meaningOfSignature,
          rationale,
          linked_record_sha256: existing.evidence_sha256,
          signature_sha256: signatureHash,
          signed_at: nowIso,
        },
        updated_at: nowIso,
      };

      const committed = await commitVersionedRecord({
        client,
        db,
        previousDoc: existing,
        recordDoc: updatedRecord,
        stage: "Quality Engineer E-Signature",
        triggeredBy: `${reviewerName} (${reviewerRole})`,
        agentId: "quality_engineer",
        changeNote: `${meaningOfSignature} — ${rationale}`,
      });

      return NextResponse.json({
        record: committed.record,
      });
    }

    // STEP 4: Documentation Agent verifies post-change shopfloor outcome & closes audit loop -> saves final revision
    if (action === "close_loop") {
      const interventionId = body.intervention_id;
      if (!interventionId) {
        return NextResponse.json(
          { message: "intervention_id is required" },
          { status: 400 }
        );
      }

      return streamNdjson(async (emit) => {
        const { client, db } = await getClientAndDb();
        const existing = await db
          .collection(AUDIT_COLLECTIONS.CHANGE_RECORDS)
          .findOne({ intervention_id: interventionId });

        if (!existing) {
          throw new Error(`Change record '${interventionId}' not found`);
        }

        if (existing.status === "pending_human_review") {
          throw new Error(
            "Out-of-PAR deviation requires Quality Engineer 21 CFR Part 11 electronic signature before closing the loop."
          );
        }

        const docLog = createActivityLog(
          (ev) => emit({ ...ev, agent: "documentation_agent" }),
          "documentation_agent"
        );

        const scenario = getAuditScenarioByKey(existing.scenario_key);
        let simKey = "auto";
        if (existing.policy_evaluation?.routing_mode === "security_quarantine") {
          simKey = "quarantine";
        } else if (existing.approval?.decision === "approve_override") {
          simKey = "approve_override";
        } else if (existing.approval?.decision === "reject_hold") {
          simKey = "reject_hold";
        }

        const simOutcome =
          scenario.outcome_simulation?.[simKey] ||
          Object.values(scenario.outcome_simulation || {})[0];

        const monRunId = await docLog.toolStart("verify_shopfloor_outcome", {
          intervention_id: interventionId,
          station: existing.intervention.machine_id,
          applied_value: simOutcome.applied_value,
          batches_verified: simOutcome.batches_verified,
        });

        const nowIso = new Date().toISOString();
        const outcomeBlock = {
          ...simOutcome,
          material_limit_c:
            existing.reconstructed_context?.material_spec?.maxWeldTempC || 230,
          closed_at: nowIso,
        };

        await docLog.toolEnd(monRunId, "verify_shopfloor_outcome", {
          loop_status: outcomeBlock.loop_status,
          post_peak_temp_c: outcomeBlock.post_peak_temp_c,
          weld_ok: outcomeBlock.weld_ok,
          exception: outcomeBlock.exception_opened?.capa_id || null,
        });

        let finalStatus = "closed_verified";
        if (existing.status === "quarantined_blocked") {
          finalStatus = "quarantined_blocked";
        } else if (!outcomeBlock.verified) {
          finalStatus = "closed_exception";
        }

        const closedRecord = {
          ...stripMongoId(existing),
          v: Number(existing.v || 3) + 1,
          status: finalStatus,
          intervention: {
            ...existing.intervention,
            applied_value: outcomeBlock.applied_value,
          },
          outcome: outcomeBlock,
          updated_at: nowIso,
        };

        const committed = await commitVersionedRecord({
          client,
          db,
          previousDoc: existing,
          recordDoc: closedRecord,
          stage: "Outcome Verified & Loop Closed",
          triggeredBy: "Documentation Agent",
          agentId: "documentation_agent",
          changeNote: outcomeBlock.summary,
        });

        const revisions = await fetchRevisionsForId(db, interventionId);

        return {
          record: committed.record,
          revisions,
        };
      });
    }

    if (action === "get_lineage") {
      const interventionId = body.intervention_id;
      if (!interventionId) {
        return NextResponse.json(
          { message: "intervention_id is required" },
          { status: 400 }
        );
      }
      const { db } = await getClientAndDb();
      const bundle = await fetchLineageBundle(db, interventionId);
      return NextResponse.json(bundle);
    }

    if (action === "test_schema_guard") {
      await ensureAuditTrailProvisioned();
      const { db } = await getClientAndDb();
      const col = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS);

      const unattributedAttempt = {
        intervention_id: `UNATTRIBUTED-BYPASS-${Date.now()}`,
        schema_version: 1,
        v: 1,
        status: "uncontrolled_bypass",
        agents: {
          production_agent: {
            // Missing required agent_id and credential_type
            note: "External script attempting direct database write without agent attribution",
          },
        },
        intervention: {
          machine_id: "LTW-04",
          station: "Laser Tab Welding",
          parameter: "laser_power_w",
          before_value: 1450,
          proposed_value: 1620,
        },
        created_at: new Date().toISOString(),
      };

      try {
        await col.insertOne(unattributedAttempt);
        await col.deleteOne({
          intervention_id: unattributedAttempt.intervention_id,
        });
        return NextResponse.json({
          rejectedByMongo: false,
          attemptedDocument: unattributedAttempt,
          message:
            "Validator did not reject the write (check cluster collMod permissions).",
        });
      } catch (validationError) {
        return NextResponse.json({
          rejectedByMongo: true,
          errorCode: validationError?.code || 121,
          codeName: validationError?.codeName || "DocumentValidationFailure",
          errorMessage:
            validationError?.message || "Document failed validation",
          attemptedDocument: unattributedAttempt,
        });
      }
    }

    return NextResponse.json(
      { message: `Unsupported Audit Trail action '${action}'` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Audit Trail API error:", error);
    return NextResponse.json(
      { message: error?.message || "Audit Trail API error" },
      { status: 500 }
    );
  }
}
