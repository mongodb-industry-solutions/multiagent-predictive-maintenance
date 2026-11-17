import { tool } from "@langchain/core/tools";
import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { generateEmbedding } from "@/integrations/embeddings_factory.js";
import { vectorSearch } from "@/integrations/mongodb/vectorSearch.js";
import {
  AUDIT_COLLECTIONS,
  AUDIT_SHOPFLOOR,
  CHANGE_PROCEDURES_VECTOR_INDEX,
} from "@/lib/auditTrail/constants.js";
import { ensureAuditTrailProvisioned } from "@/lib/auditTrail/seedData.js";

function cosineSimilarity(vecA, vecB) {
  if (
    !Array.isArray(vecA) ||
    !Array.isArray(vecB) ||
    vecA.length === 0 ||
    vecA.length !== vecB.length
  ) {
    return null;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i += 1) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return null;
  return Number(((1 + dot / denom) / 2).toFixed(4));
}

function normalizeProcedureDoc(doc, fallbackScore = 0.88) {
  const effectiveIso =
    doc.effective_from instanceof Date
      ? doc.effective_from.toISOString()
      : String(doc.effective_from || "");
  return {
    doc_id: doc.doc_id,
    version: doc.version,
    title: doc.title,
    doc_type: doc.doc_type,
    status: doc.status,
    product: doc.product,
    approved_by: doc.approved_by,
    regulatory_refs: doc.regulatory_refs || [],
    clauses: doc.clauses || [],
    superseded_reason: doc.superseded_reason || null,
    effective_from: effectiveIso,
    score:
      typeof doc.score === "number"
        ? Number(doc.score.toFixed(4))
        : fallbackScore,
  };
}

export async function executeGovernedRetrieval({
  query,
  site = AUDIT_SHOPFLOOR.site,
  station = AUDIT_SHOPFLOOR.machineId,
  product = "EV-PM-4C-S",
  limit = 3,
}) {
  await ensureAuditTrailProvisioned();
  const client = await getMongoClientPromise();
  const db = client.db(process.env.DATABASE_NAME);
  const col = db.collection(AUDIT_COLLECTIONS.CHANGE_PROCEDURES);

  const governedFilter = {
    $and: [
      { status: "approved" },
      { site },
      { station },
      { product: { $in: [product, "ALL"] } },
    ],
  };

  let approvedMatches = [];
  let retrievalMethod = "atlas_vector_search_prefiltered";

  try {
    const vectorHits = await vectorSearch(
      query,
      {
        collection: AUDIT_COLLECTIONS.CHANGE_PROCEDURES,
        indexName: CHANGE_PROCEDURES_VECTOR_INDEX,
        textKey: [
          "doc_id",
          "version",
          "title",
          "doc_type",
          "status",
          "product",
          "approved_by",
          "regulatory_refs",
          "clauses",
          "text",
        ],
        embeddingKey: "embedding",
        includeScore: true,
      },
      limit,
      {
        filter: governedFilter,
        project: { effective_from: 1 },
      }
    );

    if (Array.isArray(vectorHits) && vectorHits.length > 0) {
      approvedMatches = vectorHits.map((doc) => normalizeProcedureDoc(doc));
    }
  } catch {
    approvedMatches = [];
  }

  if (approvedMatches.length === 0) {
    retrievalMethod = "governed_filter_cosine_fallback";
    let queryVec = null;
    try {
      queryVec = await generateEmbedding(query);
    } catch {
      queryVec = null;
    }

    const candidates = await col.find(governedFilter).toArray();
    const qLower = String(query || "").toLowerCase();
    const scored = candidates.map((doc) => {
      const cos = queryVec ? cosineSimilarity(queryVec, doc.embedding) : null;
      let heuristic = 0.84;
      if (doc.product === product) heuristic += 0.07;
      if (
        qLower.includes("unauthorized") &&
        doc.doc_type === "OT Security Policy"
      ) {
        heuristic += 0.1;
      }
      if (qLower.includes("deviation") && doc.doc_id === "SOP-QMS-008") {
        heuristic += 0.08;
      }
      return normalizeProcedureDoc(doc, cos ?? Math.min(0.98, heuristic));
    });
    scored.sort((a, b) => b.score - a.score);
    approvedMatches = scored.slice(0, limit);
  }

  const uncontrolledDocs = await col
    .find({
      site,
      station,
      product: { $in: [product, "ALL"] },
      status: { $in: ["superseded", "draft"] },
    })
    .sort({ effective_from: -1 })
    .limit(4)
    .toArray();

  return {
    retrieval_method: retrievalMethod,
    vector_index: CHANGE_PROCEDURES_VECTOR_INDEX,
    applied_prefilter: {
      status: "approved",
      site,
      station,
      product: [product, "ALL"],
    },
    approved_procedures: approvedMatches,
    excluded_uncontrolled_docs: uncontrolledDocs.map((doc) => ({
      doc_id: doc.doc_id,
      version: doc.version,
      title: doc.title,
      status: doc.status,
      product: doc.product,
      reason_excluded:
        doc.superseded_reason ||
        `Filtered out prior to similarity scoring because status='${doc.status}' != 'approved'.`,
    })),
  };
}

export async function executeEpisodicRecall({
  station = AUDIT_SHOPFLOOR.machineId,
  product,
  parameter,
  scenarioKey,
  excludeInterventionId = null,
  limit = 2,
}) {
  await ensureAuditTrailProvisioned();
  const client = await getMongoClientPromise();
  const db = client.db(process.env.DATABASE_NAME);
  const col = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS);

  const matchOr = [];
  if (scenarioKey) matchOr.push({ scenario_key: scenarioKey });
  if (parameter) matchOr.push({ "intervention.parameter": parameter });
  if (product) matchOr.push({ "intervention.product": product });

  const filter = {
    "intervention.machine_id": station,
    status: {
      $in: ["closed_verified", "closed_exception", "quarantined_blocked"],
    },
    ...(excludeInterventionId
      ? { intervention_id: { $ne: excludeInterventionId } }
      : {}),
    ...(matchOr.length > 0 ? { $or: matchOr } : {}),
  };

  const docs = await col
    .find(filter, {
      projection: {
        _id: 0,
        intervention_id: 1,
        scenario_key: 1,
        status: 1,
        intervention: 1,
        policy_evaluation: 1,
        outcome: 1,
        created_at: 1,
      },
    })
    .sort({ is_seed_precedent: 1, created_at: -1 })
    .limit(limit)
    .toArray();

  return docs.map((doc) => ({
    intervention_id: doc.intervention_id,
    status: doc.status,
    product: doc.intervention?.product,
    material_master: doc.intervention?.material_master,
    parameter: doc.intervention?.parameter,
    change: `${doc.intervention?.before_value} → ${doc.intervention?.proposed_value} ${doc.intervention?.unit || ""}`.trim(),
    applied_value: doc.intervention?.applied_value,
    classification: doc.policy_evaluation?.classification,
    outcome_summary: doc.outcome?.summary || "Historical closed intervention",
    closed_at: doc.outcome?.closed_at || doc.created_at,
  }));
}

export const retrieveGovernedProceduresTool = tool(
  async ({
    query,
    product = "EV-PM-4C-S",
    station = AUDIT_SHOPFLOOR.machineId,
  }) => {
    const res = await executeGovernedRetrieval({ query, product, station });
    return JSON.stringify(res);
  },
  {
    name: "retrieve_governed_procedures",
    description:
      "Run governed Atlas Vector Search over change_procedures with metadata pre-filtering (status='approved', site, station, product) and inspect excluded superseded or draft SOPs.",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Semantic query describing the shopfloor parameter intervention and compliance context.",
        },
        product: {
          type: "string",
          description: "EV module product code (EV-PM-4C-S or EV-PM-4C-P)",
          default: "EV-PM-4C-S",
        },
        station: {
          type: "string",
          description: "Shopfloor machine/station ID (default LTW-04)",
          default: "LTW-04",
        },
      },
      required: ["query"],
    },
  }
);

export const recallPriorInterventionsTool = tool(
  async ({
    product = "EV-PM-4C-S",
    parameter = "laser_power_w",
    station = AUDIT_SHOPFLOOR.machineId,
  }) => {
    const res = await executeEpisodicRecall({ product, parameter, station });
    return JSON.stringify({ recalled_interventions: res });
  },
  {
    name: "recall_prior_interventions",
    description:
      "Recall reviewed historical shopfloor interventions and their verified outcomes from MongoDB change_records episodic memory.",
    schema: {
      type: "object",
      properties: {
        product: {
          type: "string",
          description: "Product code (EV-PM-4C-S or EV-PM-4C-P)",
          default: "EV-PM-4C-S",
        },
        parameter: {
          type: "string",
          description:
            "Controlled PLC parameter (laser_power_w or shield_gas_flow_lpm)",
          default: "laser_power_w",
        },
        station: {
          type: "string",
          description: "Machine ID (default LTW-04)",
          default: "LTW-04",
        },
      },
      required: ["parameter"],
    },
  }
);

export function getTools() {
  return [retrieveGovernedProceduresTool, recallPriorInterventionsTool];
}
