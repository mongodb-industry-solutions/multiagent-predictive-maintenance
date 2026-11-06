import { NextResponse } from "next/server";
import { ObjectId } from "bson";
import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { gatherContestableEvidence } from "@/lib/contestable/evidence.js";
import {
  computeCandidateScores,
  DEFAULT_CANDIDATES,
} from "@/lib/contestable/scoring.js";
import { buildBenchmarkArguments } from "@/lib/contestable/scenarios.js";
import { runVibrationPatternAgent } from "@/agents/contestable/vibrationAgent.js";
import { runMaintenanceHistoryAgent } from "@/agents/contestable/maintenanceAgent.js";
import { runContestableRefinerAgent } from "@/agents/contestable/refinerAgent.js";

async function getDb() {
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required");
  }
  const client = await getMongoClientPromise();
  return client.db(dbName);
}

function buildIncidentFilter(incidentId) {
  if (!incidentId) return null;
  const strId =
    typeof incidentId === "object" && incidentId.$oid
      ? incidentId.$oid
      : String(incidentId);
  if (ObjectId.isValid(strId) && strId.length === 24) {
    return { $or: [{ _id: new ObjectId(strId) }, { _id: strId }] };
  }
  return { _id: strId };
}

async function fetchLineageDocument(db, sessionId) {
  const pipeline = [
    { $match: { session_id: sessionId } },
    {
      $lookup: {
        from: "argument_records",
        localField: "session_id",
        foreignField: "session_id",
        as: "argument_records",
      },
    },
    { $project: { _id: 0, "argument_records._id": 0 } },
  ];
  const results = await db
    .collection("contestable_sessions")
    .aggregate(pipeline)
    .toArray();
  return results[0] || null;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;
    const db = await getDb();

    if (action === "start_session") {
      const {
        incident = null,
        alert = null,
        machineId = "M1",
        dataSource = "leafy",
        mode = "agent", // "agent" | "benchmark"
      } = body;

      const shortSuffix = Math.floor(1000 + Math.random() * 9000);
      const sessionId = `incident-${shortSuffix}`;
      const nowIso = new Date().toISOString();

      const evidence = await gatherContestableEvidence({
        incident,
        alert,
        machineId: incident?.machine_id || alert?.machine_id || machineId,
        dataSource,
      });

      let rawArguments = [];
      if (mode === "benchmark") {
        rawArguments = buildBenchmarkArguments(sessionId);
      } else {
        const [vibArgs, maintArgs] = await Promise.all([
          runVibrationPatternAgent({
            sessionId,
            candidates: evidence.candidates,
            vibrationSpectrum: evidence.vibration_spectrum,
            machineId: evidence.machine_id,
          }),
          runMaintenanceHistoryAgent({
            sessionId,
            candidates: evidence.candidates,
            maintenanceHistory: evidence.maintenance_history,
            machineId: evidence.machine_id,
          }),
        ]);
        rawArguments = [...vibArgs, ...maintArgs];
      }

      const scored = computeCandidateScores(rawArguments, evidence.candidates);

      // Write each argument as its own individual document in argument_records
      const argCol = db.collection("argument_records");
      if (scored.arguments.length > 0) {
        await argCol.insertMany(
          scored.arguments.map((arg) => ({
            session_id: arg.session_id,
            argument_id: arg.argument_id,
            candidate: arg.candidate,
            agent: arg.agent,
            stance: arg.stance,
            score: Number(arg.score),
            reason: arg.reason,
            created_at: arg.created_at || nowIso,
            final_score: arg.final_score,
            evidence_refs: arg.evidence_refs || [],
            status: arg.status || "active",
            human_action: arg.human_action || null,
            original_reason: null,
            original_score: Number(arg.score),
            reviewed_by: null,
            updated_at: null,
          }))
        );
      }

      const sessionDoc = {
        session_id: sessionId,
        machine_id: evidence.machine_id,
        data_source: dataSource,
        incident_id: incident?._id ? String(incident._id) : null,
        error_code: evidence.error_code,
        error_name: evidence.error_name,
        original_incident: incident
          ? {
              _id: String(incident._id || ""),
              error_code: incident.error_code,
              error_name: incident.error_name,
              root_cause: incident.root_cause,
              repair_instructions: incident.repair_instructions,
              machine_id: incident.machine_id,
            }
          : null,
        candidates: evidence.candidates,
        evidence_summary: {
          vibration_spectrum: evidence.vibration_spectrum,
          maintenance_history: evidence.maintenance_history,
          similar_work_orders: evidence.similar_work_orders,
          manual_sections: evidence.manual_sections,
          technician_interviews: evidence.technician_interviews,
        },
        scoring_formula:
          "score = sigmoid(tau + 0.3 * total_support - 0.3 * total_challenge)",
        tau: 0,
        alpha: 0.3,
        scores_before: scored.candidateScores,
        scores_after: scored.candidateScores,
        winning_candidate_before: scored.winningCandidate,
        winning_candidate: scored.winningCandidate,
        review_events: [],
        resolution: null,
        status: "in_review",
        created_at: nowIso,
        updated_at: nowIso,
      };

      await db.collection("contestable_sessions").insertOne({ ...sessionDoc });

      return NextResponse.json({
        session: sessionDoc,
        arguments: scored.arguments,
        candidateScores: scored.candidateScores,
        rankedCandidates: scored.rankedCandidates,
        winningCandidate: scored.winningCandidate,
      });
    }

    if (action === "contest_action") {
      const {
        session_id,
        action_type, // "accept" | "reject" | "modify" | "restore" | "add"
        argument_id,
        reason,
        score,
        candidate,
        stance,
        reviewer_role = "Reliability Engineer",
        note = "",
      } = body;

      if (!session_id) {
        return NextResponse.json(
          { message: "session_id is required" },
          { status: 400 }
        );
      }

      const nowIso = new Date().toISOString();
      const argCol = db.collection("argument_records");
      const sessionCol = db.collection("contestable_sessions");

      if (action_type === "add") {
        const newArgId =
          argument_id ||
          `${session_id}_eng_${candidate}_${stance}_${Date.now().toString().slice(-4)}`;
        const numericScore = Math.max(
          0,
          Math.min(1, Number(score ?? 0.85))
        );
        const newArgDoc = {
          session_id,
          argument_id: newArgId,
          candidate: candidate || "misalignment",
          agent: "reliability_engineer",
          stance: stance || "support",
          score: numericScore,
          reason: String(reason || "").trim(),
          created_at: nowIso,
          final_score: numericScore,
          evidence_refs: ["Reliability Engineer floor verification"],
          status: "active",
          human_action: "add",
          original_reason: null,
          original_score: numericScore,
          reviewed_by: reviewer_role,
          updated_at: nowIso,
        };
        await argCol.insertOne(newArgDoc);
      } else {
        const existingArg = await argCol.findOne({
          session_id,
          argument_id,
        });
        if (!existingArg) {
          return NextResponse.json(
            { message: `Argument ${argument_id} not found` },
            { status: 404 }
          );
        }

        const updateFields = {
          reviewed_by: reviewer_role,
          updated_at: nowIso,
        };

        if (action_type === "reject") {
          updateFields.status = "rejected";
          updateFields.human_action = "reject";
        } else if (action_type === "accept") {
          updateFields.status = "active";
          updateFields.human_action = "accept";
        } else if (action_type === "restore") {
          updateFields.status = "active";
          updateFields.human_action = null;
          if (existingArg.original_reason) {
            updateFields.reason = existingArg.original_reason;
          }
          if (typeof existingArg.original_score === "number") {
            updateFields.score = existingArg.original_score;
          }
        } else if (action_type === "modify") {
          updateFields.status = "active";
          updateFields.human_action = "modify";
          updateFields.original_reason =
            existingArg.original_reason || existingArg.reason;
          updateFields.original_score =
            existingArg.original_score ?? existingArg.score;
          if (typeof reason === "string" && reason.trim()) {
            updateFields.reason = reason.trim();
          }
          if (score !== undefined && score !== null) {
            updateFields.score = Math.max(0, Math.min(1, Number(score)));
          }
        }

        await argCol.updateOne(
          { session_id, argument_id },
          { $set: updateFields }
        );
      }

      // Reload all arguments for this session and recalculate scores
      const sessionArgs = await argCol
        .find({ session_id }, { projection: { _id: 0 } })
        .toArray();
      const sessionDoc = await sessionCol.findOne(
        { session_id },
        { projection: { _id: 0 } }
      );
      const candidates = sessionDoc?.candidates || DEFAULT_CANDIDATES;

      const scored = computeCandidateScores(sessionArgs, candidates);

      // Update final_score on each argument record
      await Promise.all(
        scored.arguments.map((arg) =>
          argCol.updateOne(
            { session_id, argument_id: arg.argument_id },
            { $set: { final_score: arg.final_score } }
          )
        )
      );

      const reviewEvent = {
        seq: (sessionDoc?.review_events?.length || 0) + 1,
        action: action_type,
        argument_id: argument_id || "added_argument",
        candidate:
          candidate ||
          sessionArgs.find((a) => a.argument_id === argument_id)?.candidate ||
          "",
        actor_role: reviewer_role,
        reason: note || reason || `Engineer applied ${action_type}`,
        winning_candidate_after: scored.winningCandidate,
        winning_score_after:
          scored.candidateScores[scored.winningCandidate]?.score ?? 0.5,
        timestamp: nowIso,
      };

      await sessionCol.updateOne(
        { session_id },
        {
          $set: {
            scores_after: scored.candidateScores,
            winning_candidate: scored.winningCandidate,
            updated_at: nowIso,
          },
          $push: {
            review_events: reviewEvent,
          },
        }
      );

      const updatedSession = await sessionCol.findOne(
        { session_id },
        { projection: { _id: 0 } }
      );

      return NextResponse.json({
        session: updatedSession,
        arguments: scored.arguments,
        candidateScores: scored.candidateScores,
        rankedCandidates: scored.rankedCandidates,
        winningCandidate: scored.winningCandidate,
      });
    }

    if (action === "generate_refinement") {
      const { session_id } = body;
      const argCol = db.collection("argument_records");
      const sessionCol = db.collection("contestable_sessions");

      const sessionDoc = await sessionCol.findOne(
        { session_id },
        { projection: { _id: 0 } }
      );
      if (!sessionDoc) {
        return NextResponse.json(
          { message: "Session not found" },
          { status: 404 }
        );
      }

      const sessionArgs = await argCol
        .find({ session_id }, { projection: { _id: 0 } })
        .toArray();
      const scored = computeCandidateScores(
        sessionArgs,
        sessionDoc.candidates || DEFAULT_CANDIDATES
      );

      const refinement = await runContestableRefinerAgent({
        machineId: sessionDoc.machine_id || "M1",
        candidates: sessionDoc.candidates || DEFAULT_CANDIDATES,
        winningCandidateId: scored.winningCandidate,
        scoresBefore: sessionDoc.scores_before,
        scoresAfter: scored.candidateScores,
        argumentsList: scored.arguments,
        reviewEvents: sessionDoc.review_events || [],
        originalIncident: sessionDoc.original_incident,
      });

      await sessionCol.updateOne(
        { session_id },
        {
          $set: {
            resolution: refinement,
            scores_after: scored.candidateScores,
            winning_candidate: scored.winningCandidate,
            updated_at: new Date().toISOString(),
          },
        }
      );

      const lineage = await fetchLineageDocument(db, session_id);

      return NextResponse.json({
        refinement,
        candidateScores: scored.candidateScores,
        winningCandidate: scored.winningCandidate,
        lineage,
      });
    }

    if (action === "commit_incident") {
      const {
        session_id,
        incident_id,
        root_cause,
        repair_instructions,
        rationale,
        reviewer_role = "Reliability Engineer",
        create_if_missing = true,
      } = body;

      const sessionCol = db.collection("contestable_sessions");
      const argCol = db.collection("argument_records");
      const incidentCol = db.collection("incident_reports");

      const sessionDoc = await sessionCol.findOne(
        { session_id },
        { projection: { _id: 0 } }
      );
      const sessionArgs = await argCol
        .find({ session_id }, { projection: { _id: 0 } })
        .toArray();
      const scored = computeCandidateScores(
        sessionArgs,
        sessionDoc?.candidates || DEFAULT_CANDIDATES
      );

      const winningId = scored.winningCandidate;
      const winningInfo = scored.candidateScores[winningId] || {};
      const nowIso = new Date().toISOString();

      const parsedInstructions = Array.isArray(repair_instructions)
        ? repair_instructions.map((step, i) => ({
            step: Number(step.step) || i + 1,
            description:
              typeof step === "string"
                ? step
                : String(step.description || "").trim(),
          }))
        : String(repair_instructions || "")
            .split("\n")
            .map((line) => line.replace(/^[-\s]*Step\s*\d+:\s*/i, "").trim())
            .filter(Boolean)
            .map((desc, idx) => ({
              step: idx + 1,
              description: desc,
            }));

      const contestationMetadata = {
        session_id,
        winning_candidate: winningId,
        winning_label: winningInfo.label || winningId,
        score: winningInfo.score ?? 0.5,
        percentage: winningInfo.percentage ?? 50,
        reviewer_role,
        interventions_count: sessionArgs.filter((a) => Boolean(a.human_action))
          .length,
        rationale: rationale || sessionDoc?.resolution?.rationale || "",
        contested_at: nowIso,
      };

      const targetIncidentId = incident_id || sessionDoc?.incident_id;
      let updatedIncident = null;

      if (targetIncidentId) {
        const filter = buildIncidentFilter(targetIncidentId);
        await incidentCol.updateOne(filter, {
          $set: {
            root_cause,
            repair_instructions: parsedInstructions,
            contestation: contestationMetadata,
          },
        });
        updatedIncident = await incidentCol.findOne(filter);
      } else if (create_if_missing) {
        const newIncidentDoc = {
          error_code: sessionDoc?.error_code || "E13",
          error_name: sessionDoc?.error_name || "High vibration",
          machine_id: sessionDoc?.machine_id || "M1",
          root_cause,
          repair_instructions: parsedInstructions,
          contestation: contestationMetadata,
          ts: new Date(),
        };
        const insertRes = await incidentCol.insertOne(newIncidentDoc);
        updatedIncident = { ...newIncidentDoc, _id: insertRes.insertedId };
      }

      const finalResolution = {
        ...(sessionDoc?.resolution || {}),
        winning_candidate: winningId,
        winning_label: winningInfo.label || winningId,
        root_cause,
        repair_instructions: parsedInstructions,
        rationale: rationale || sessionDoc?.resolution?.rationale || "",
        committed_at: nowIso,
        committed_by: reviewer_role,
        incident_id: updatedIncident?._id ? String(updatedIncident._id) : null,
      };

      await sessionCol.updateOne(
        { session_id },
        {
          $set: {
            status: "committed",
            resolution: finalResolution,
            scores_after: scored.candidateScores,
            winning_candidate: winningId,
            updated_at: nowIso,
          },
        }
      );

      const lineage = await fetchLineageDocument(db, session_id);

      return NextResponse.json({
        committed: true,
        incident: updatedIncident,
        resolution: finalResolution,
        lineage,
      });
    }

    if (action === "get_lineage") {
      const { session_id } = body;
      const lineage = await fetchLineageDocument(db, session_id);
      return NextResponse.json({ lineage });
    }

    return NextResponse.json(
      { message: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in /api/contestable:", error);
    return NextResponse.json(
      { message: "Contestable AI request failed", error: error.message },
      { status: 500 }
    );
  }
}
