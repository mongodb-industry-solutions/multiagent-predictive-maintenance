import getMongoClientPromise from "../../integrations/mongodb/client.js";
import { generateEmbedding } from "../../integrations/embeddings_factory.js";
import {
  AUDIT_COLLECTIONS,
  CHANGE_PROCEDURES_VECTOR_INDEX,
  CHANGE_RECORDS_VALIDATOR,
} from "./constants.js";
import {
  CHANGE_PROCEDURES_SEED,
  HISTORICAL_CHANGE_RECORDS_SEED,
} from "./scenarios.js";
import { computeEvidenceSha256 } from "./policyEngine.js";

const LOCK_LEASE_MS = 60 * 1000;
const LOCK_ANCHOR = {
  doc_id: CHANGE_PROCEDURES_SEED[0].doc_id,
  version: CHANGE_PROCEDURES_SEED[0].version,
};
const PRECEDENT_IDS = HISTORICAL_CHANGE_RECORDS_SEED.map(
  (doc) => doc.intervention_id
);

let verifiedInProcess = false;
let activeInitPromise = null;
let lastInitError = null;

function getDimensions() {
  const parsed = Number(process.env.EMBEDDING_DIMENSIONS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1024;
}

function hasCurrentValidator(colInfo) {
  const required = colInfo?.options?.validator?.$jsonSchema?.required;
  return Array.isArray(required) && required.includes("agents");
}

async function inspectProvisionedState(db) {
  const expectedDims = getDimensions();
  const proceduresCol = db.collection(AUDIT_COLLECTIONS.CHANGE_PROCEDURES);
  const recordsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS);
  const revisionsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS);

  const [colInfos, embeddedProcedures, precedentRecords, precedentRevisions, searchIndexes] =
    await Promise.all([
      db
        .listCollections(
          { name: AUDIT_COLLECTIONS.CHANGE_RECORDS },
          { nameOnly: false }
        )
        .toArray()
        .catch(() => []),
      proceduresCol
        .countDocuments({
          [`embedding.${expectedDims - 1}`]: { $exists: true },
        })
        .catch(() => 0),
      recordsCol
        .countDocuments(
          {
            intervention_id: { $in: PRECEDENT_IDS },
            agents: { $exists: true },
          },
          { limit: PRECEDENT_IDS.length }
        )
        .catch(() => 0),
      revisionsCol
        .countDocuments(
          { intervention_id: { $in: PRECEDENT_IDS } },
          { limit: PRECEDENT_IDS.length }
        )
        .catch(() => 0),
      proceduresCol
        .listSearchIndexes()
        .toArray()
        .catch(() => []),
    ]);

  const colInfo = colInfos[0] || null;
  const validatorReady = hasCurrentValidator(colInfo);
  const foundVectorIdx = searchIndexes.find(
    (idx) => idx.name === CHANGE_PROCEDURES_VECTOR_INDEX
  );

  const fullyProvisioned =
    validatorReady &&
    embeddedProcedures >= CHANGE_PROCEDURES_SEED.length &&
    precedentRecords >= PRECEDENT_IDS.length &&
    precedentRevisions >= PRECEDENT_IDS.length &&
    Boolean(foundVectorIdx);

  return {
    colInfo,
    validatorReady,
    fullyProvisioned,
    vectorIndex: foundVectorIdx
      ? {
          name: CHANGE_PROCEDURES_VECTOR_INDEX,
          status:
            foundVectorIdx.status ||
            (foundVectorIdx.queryable ? "READY" : "BUILDING"),
          queryable: Boolean(foundVectorIdx.queryable),
        }
      : {
          name: CHANGE_PROCEDURES_VECTOR_INDEX,
          status: "MISSING",
          queryable: false,
        },
  };
}

async function ensureChangeRecordsSchemaValidator(
  db,
  existingColInfo,
  { force = false } = {}
) {
  const colName = AUDIT_COLLECTIONS.CHANGE_RECORDS;

  if (!existingColInfo) {
    try {
      await db.createCollection(colName, {
        validator: CHANGE_RECORDS_VALIDATOR,
        validationLevel: "strict",
        validationAction: "error",
      });
      return { enforced: true, mode: "created" };
    } catch (error) {
      if (!/NamespaceExists|already exists/i.test(String(error?.message))) {
        console.warn(
          `[audit-trail] createCollection validator warning: ${error?.message}`
        );
      }
    }
  } else if (!force && hasCurrentValidator(existingColInfo)) {
    return { enforced: true, mode: "already_valid" };
  }

  try {
    await db.command({
      collMod: colName,
      validator: CHANGE_RECORDS_VALIDATOR,
      validationLevel: "strict",
      validationAction: "error",
    });
    return { enforced: true, mode: "collMod" };
  } catch (error) {
    const msg = String(error?.message || "");
    if (/ConflictingOperationInProgress/i.test(msg)) {
      return { enforced: true, mode: "peer_collMod_in_progress" };
    }
    console.warn(
      `[audit-trail] collMod validator warning on '${colName}': ${msg}`
    );
    return { enforced: false, error: msg };
  }
}

async function ensureIndexes(db) {
  const recordsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS);
  const revisionsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS);
  const proceduresCol = db.collection(AUDIT_COLLECTIONS.CHANGE_PROCEDURES);

  await Promise.all([
    recordsCol.createIndex({ intervention_id: 1 }, { unique: true }),
    recordsCol.createIndex({
      "intervention.machine_id": 1,
      "intervention.product": 1,
      created_at: -1,
    }),
    recordsCol.createIndex({ scenario_key: 1, status: 1, created_at: -1 }),
    revisionsCol.createIndex({ intervention_id: 1, v: 1 }, { unique: true }),
    revisionsCol.createIndex({ changed_at: -1 }),
    proceduresCol.createIndex({ doc_id: 1, version: 1 }, { unique: true }),
    proceduresCol.createIndex({
      status: 1,
      site: 1,
      station: 1,
      product: 1,
    }),
  ]);
}

async function seedChangeProcedures(db, { force = false } = {}) {
  const col = db.collection(AUDIT_COLLECTIONS.CHANGE_PROCEDURES);
  const expectedDims = getDimensions();

  for (const proc of CHANGE_PROCEDURES_SEED) {
    const existing = await col.findOne(
      { doc_id: proc.doc_id, version: proc.version },
      { projection: { _id: 1, embedding: 1 } }
    );

    const hasValidEmbedding =
      Array.isArray(existing?.embedding) &&
      existing.embedding.length === expectedDims;

    if (existing && hasValidEmbedding && !force) {
      continue;
    }

    let embedding = hasValidEmbedding ? existing.embedding : null;
    if (!embedding || force) {
      try {
        const textToEmbed = `${proc.doc_id} v${proc.version} [${proc.status}] ${proc.title}\nProduct: ${proc.product}\n${proc.text}\n${(proc.clauses || []).join("\n")}`;
        embedding = await generateEmbedding(textToEmbed);
      } catch (error) {
        console.warn(
          `[audit-trail] Could not embed ${proc.doc_id} v${proc.version}: ${error?.message}`
        );
      }
    }

    if (force || !existing) {
      await col.updateOne(
        { doc_id: proc.doc_id, version: proc.version },
        {
          $set: {
            ...proc,
            ...(Array.isArray(embedding) ? { embedding } : {}),
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );
    } else if (Array.isArray(embedding)) {
      await col.updateOne(
        { doc_id: proc.doc_id, version: proc.version },
        { $set: { embedding, updated_at: new Date() } }
      );
    }
  }
}

export async function ensureProceduresVectorIndex(db) {
  const collection = db.collection(AUDIT_COLLECTIONS.CHANGE_PROCEDURES);
  const definition = {
    fields: [
      {
        type: "vector",
        path: "embedding",
        numDimensions: getDimensions(),
        similarity: "cosine",
      },
      { type: "filter", path: "status" },
      { type: "filter", path: "site" },
      { type: "filter", path: "station" },
      { type: "filter", path: "product" },
    ],
  };

  try {
    const existing = await collection.listSearchIndexes().toArray();
    const found = existing.find(
      (idx) => idx.name === CHANGE_PROCEDURES_VECTOR_INDEX
    );
    if (found) {
      return {
        name: CHANGE_PROCEDURES_VECTOR_INDEX,
        status: found.status || (found.queryable ? "READY" : "BUILDING"),
        queryable: Boolean(found.queryable),
        created: false,
      };
    }
  } catch {
    // Proceed to attempt creation
  }

  try {
    await collection.createSearchIndex({
      name: CHANGE_PROCEDURES_VECTOR_INDEX,
      type: "vectorSearch",
      definition,
    });
    return {
      name: CHANGE_PROCEDURES_VECTOR_INDEX,
      status: "BUILDING",
      queryable: false,
      created: true,
    };
  } catch (error) {
    const msg = String(error?.message || "");
    if (/already exists|IndexAlreadyExists/i.test(msg)) {
      return {
        name: CHANGE_PROCEDURES_VECTOR_INDEX,
        status: "BUILDING",
        queryable: false,
        created: false,
      };
    }
    console.warn(
      `[audit-trail] Could not create vector index '${CHANGE_PROCEDURES_VECTOR_INDEX}': ${msg}`
    );
    return {
      name: CHANGE_PROCEDURES_VECTOR_INDEX,
      status: "FALLBACK_MQL",
      queryable: false,
      error: msg,
    };
  }
}

async function seedHistoricalPrecedents(db, { force = false } = {}) {
  const recordsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS);
  const revisionsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS);

  for (const record of HISTORICAL_CHANGE_RECORDS_SEED) {
    const digest = computeEvidenceSha256({
      intervention_id: record.intervention_id,
      v: record.v,
      intervention: record.intervention,
      outcome: record.outcome,
    });
    const docWithHash = { ...record, evidence_sha256: digest };

    const revisionDoc = {
      intervention_id: record.intervention_id,
      v: record.v,
      stage: "Closed Precedent Record",
      triggered_by:
        record.agents?.quality_engineer?.display_name ||
        record.agents?.documentation_agent?.display_name ||
        "Documentation Agent",
      agent_id:
        record.agents?.quality_engineer?.agent_id ||
        record.agents?.documentation_agent?.agent_id ||
        "documentation_agent",
        change_note: record.outcome?.summary || "Historical closed precedent",
        field_changes: [
          {
            field: "status",
            before: "captured",
            after: record.status,
          },
        ],
        prev_snapshot_sha256: null,
        snapshot_sha256: digest,
        snapshot: docWithHash,
        changed_at: record.updated_at || record.created_at,
    };

    if (force) {
      await recordsCol.replaceOne(
        { intervention_id: record.intervention_id },
        docWithHash,
        { upsert: true }
      );
      await revisionsCol.replaceOne(
        { intervention_id: record.intervention_id, v: record.v },
        revisionDoc,
        { upsert: true }
      );
    } else {
      await recordsCol.updateOne(
        { intervention_id: record.intervention_id },
        { $setOnInsert: docWithHash },
        { upsert: true }
      );
      await revisionsCol.updateOne(
        { intervention_id: record.intervention_id, v: record.v },
        { $setOnInsert: revisionDoc },
        { upsert: true }
      );
    }
  }
}

export async function seedAuditTrailData({ force = false, onProgress } = {}) {
  const log = typeof onProgress === "function" ? onProgress : () => {};
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required");
  }

  if (!force && verifiedInProcess) {
    return { skipped: true, reason: "already_verified_in_process" };
  }

  const client = await getMongoClientPromise();
  const db = client.db(dbName);

  // Fast pre-check (~15ms, zero writes) on warm pod restarts / rollouts
  const initialState = await inspectProvisionedState(db);
  if (!force && initialState.fullyProvisioned) {
    verifiedInProcess = true;
    lastInitError = null;
    log("Audit Trail collections, validator, and indexes are already provisioned.");
    return {
      skipped: true,
      reason: "already_provisioned",
      vectorIndex: initialState.vectorIndex,
    };
  }

  // Ensure the unique key on change_procedures exists before acquiring the pod lease lock
  const proceduresCol = db.collection(AUDIT_COLLECTIONS.CHANGE_PROCEDURES);
  await proceduresCol.createIndex({ doc_id: 1, version: 1 }, { unique: true });
  await proceduresCol.updateOne(
    LOCK_ANCHOR,
    { $setOnInsert: { ...CHANGE_PROCEDURES_SEED[0], updated_at: new Date() } },
    { upsert: true }
  );

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LOCK_LEASE_MS);
  const lockAcquired = await proceduresCol.findOneAndUpdate(
    {
      ...LOCK_ANCHOR,
      ...(force
        ? {}
        : {
            $or: [
              { _seedLockUntil: { $exists: false } },
              { _seedLockUntil: { $lt: now } },
            ],
          }),
    },
    { $set: { _seedLockUntil: leaseUntil } },
    { returnDocument: "after" }
  );

  if (!lockAcquired) {
    log("Another pod is currently provisioning Audit Trail data; skipping duplicate run.");
    return { skipped: true, reason: "locked_by_peer" };
  }

  try {
    const freshColInfos = await db
      .listCollections(
        { name: AUDIT_COLLECTIONS.CHANGE_RECORDS },
        { nameOnly: false }
      )
      .toArray()
      .catch(() => []);

    log("Ensuring $jsonSchema validator on change_records...");
    const validatorStatus = await ensureChangeRecordsSchemaValidator(
      db,
      freshColInfos[0] || null,
      { force }
    );

    log("Ensuring indexes on audit trail collections...");
    await ensureIndexes(db);

    log("Ensuring controlled change_procedures and embeddings...");
    await seedChangeProcedures(db, { force });

    log("Ensuring governed vector search index change_procedures_governed_idx...");
    const vectorIndex = await ensureProceduresVectorIndex(db);

    log("Ensuring historical episodic change_records precedents...");
    await seedHistoricalPrecedents(db, { force });

    verifiedInProcess = true;
    lastInitError = null;

    const [recordsCount, revisionsCount, proceduresCount] = await Promise.all([
      db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS).countDocuments(),
      db.collection(AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS).countDocuments(),
      proceduresCol.countDocuments(),
    ]);

    return {
      skipped: false,
      validator: validatorStatus,
      vectorIndex,
      counts: {
        change_records: recordsCount,
        change_record_revisions: revisionsCount,
        change_procedures: proceduresCount,
      },
    };
  } catch (error) {
    lastInitError = error?.message || "Audit Trail initialization failed";
    throw error;
  } finally {
    await proceduresCol
      .updateOne(LOCK_ANCHOR, { $unset: { _seedLockUntil: "" } })
      .catch(() => {});
  }
}

export function ensureAuditTrailProvisioned({ force = false } = {}) {
  if (!force && verifiedInProcess) {
    return Promise.resolve({ skipped: true, reason: "already_verified_in_process" });
  }
  if (activeInitPromise) {
    return activeInitPromise;
  }
  activeInitPromise = seedAuditTrailData({
    force,
    onProgress: (msg) => console.log(`[audit-trail] ${msg}`),
  })
    .catch((error) => {
      lastInitError = error?.message || "Audit Trail initialization failed";
      console.warn("[audit-trail] Background init warning:", lastInitError);
      return { error: lastInitError };
    })
    .finally(() => {
      activeInitPromise = null;
    });
  return activeInitPromise;
}

export function triggerAuditTrailBackgroundInit() {
  void ensureAuditTrailProvisioned();
}

export async function getAuditTrailStatus(db) {
  const proceduresCol = db.collection(AUDIT_COLLECTIONS.CHANGE_PROCEDURES);
  const recordsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORDS);
  const revisionsCol = db.collection(AUDIT_COLLECTIONS.CHANGE_RECORD_REVISIONS);

  const [
    approvedProcedures,
    uncontrolledProcedures,
    totalRecords,
    totalRevisions,
    colInfos,
    searchIndexes,
  ] = await Promise.all([
    proceduresCol.countDocuments({ status: "approved" }).catch(() => 0),
    proceduresCol
      .countDocuments({ status: { $ne: "approved" } })
      .catch(() => 0),
    recordsCol.countDocuments({ agents: { $exists: true } }).catch(() => 0),
    revisionsCol.countDocuments().catch(() => 0),
    db
      .listCollections(
        { name: AUDIT_COLLECTIONS.CHANGE_RECORDS },
        { nameOnly: false }
      )
      .toArray()
      .catch(() => []),
    proceduresCol
      .listSearchIndexes()
      .toArray()
      .catch(() => []),
  ]);

  const foundVectorIdx = searchIndexes.find(
    (idx) => idx.name === CHANGE_PROCEDURES_VECTOR_INDEX
  );
  const hasValidator = hasCurrentValidator(colInfos[0]);

  return {
    seeded: approvedProcedures >= 4 && totalRecords >= 3,
    initError: lastInitError,
    schemaValidationActive: hasValidator,
    vectorIndex: {
      name: CHANGE_PROCEDURES_VECTOR_INDEX,
      status: foundVectorIdx
        ? foundVectorIdx.status ||
          (foundVectorIdx.queryable ? "READY" : "BUILDING")
        : "FALLBACK_MQL",
      queryable: Boolean(foundVectorIdx?.queryable),
    },
    counts: {
      approved_procedures: approvedProcedures,
      uncontrolled_procedures: uncontrolledProcedures,
      change_records: totalRecords,
      change_record_revisions: totalRevisions,
    },
  };
}
