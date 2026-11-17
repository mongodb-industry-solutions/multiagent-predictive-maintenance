import fs from "fs/promises";
import path from "path";
import { EJSON } from "bson";
import getMongoClientPromise from "../../integrations/mongodb/client.js";
import { generateEmbedding } from "../../integrations/embeddings_factory.js";
import { createVectorSearchIndex } from "../../integrations/mongodb/vectorSearch.js";
import embedConfig from "../../../scripts/config.js";

export const PREDICTIVE_SEED_VERSION = 2;

const LOCK_COLLECTION = "seed_locks";
const LOCK_ID = "predictive_maintenance_seed_sync";
const LOCK_LEASE_MS = 120 * 1000;

let verifiedInProcess = false;
let activeSyncPromise = null;

async function readSeedJson(filename) {
  const filePath = path.resolve(process.cwd(), "data", filename);
  const raw = await fs.readFile(filePath, "utf8");
  const docs = EJSON.parse(raw);
  if (!Array.isArray(docs)) {
    throw new Error(`${filename} does not contain a JSON array.`);
  }
  return docs.map((doc) => ({
    ...doc,
    seed_version: PREDICTIVE_SEED_VERSION,
  }));
}

async function isAlreadySynced(db) {
  const [
    staleManuals,
    v2Manuals,
    staleInterviews,
    v2Interviews,
    staleInventory,
    v2Inventory,
    legacyWorkorders,
    v2Workorders,
    unembeddedManuals,
    unembeddedInterviews,
    unembeddedWorkorders,
  ] = await Promise.all([
    db
      .collection("manuals")
      .countDocuments({ seed_version: { $ne: PREDICTIVE_SEED_VERSION } }, { limit: 1 }),
    db
      .collection("manuals")
      .countDocuments({ seed_version: PREDICTIVE_SEED_VERSION }, { limit: 1 }),
    db
      .collection("interviews")
      .countDocuments({ seed_version: { $ne: PREDICTIVE_SEED_VERSION } }, { limit: 1 }),
    db
      .collection("interviews")
      .countDocuments({ seed_version: PREDICTIVE_SEED_VERSION }, { limit: 1 }),
    db
      .collection("inventory")
      .countDocuments({ seed_version: { $ne: PREDICTIVE_SEED_VERSION } }, { limit: 1 }),
    db
      .collection("inventory")
      .countDocuments({ seed_version: PREDICTIVE_SEED_VERSION }, { limit: 1 }),
    db
      .collection("workorders")
      .countDocuments({ "root cause": { $exists: true } }, { limit: 1 }),
    db
      .collection("workorders")
      .countDocuments({ seed_version: PREDICTIVE_SEED_VERSION }, { limit: 1 }),
    db
      .collection("manuals")
      .countDocuments(
        { seed_version: PREDICTIVE_SEED_VERSION, "embedding.0": { $exists: false } },
        { limit: 1 }
      ),
    db
      .collection("interviews")
      .countDocuments(
        { seed_version: PREDICTIVE_SEED_VERSION, "embedding.0": { $exists: false } },
        { limit: 1 }
      ),
    db
      .collection("workorders")
      .countDocuments(
        { seed_version: PREDICTIVE_SEED_VERSION, "embedding.0": { $exists: false } },
        { limit: 1 }
      ),
  ]);

  return (
    staleManuals === 0 &&
    v2Manuals > 0 &&
    staleInterviews === 0 &&
    v2Interviews > 0 &&
    staleInventory === 0 &&
    v2Inventory > 0 &&
    legacyWorkorders === 0 &&
    v2Workorders > 0 &&
    unembeddedManuals === 0 &&
    unembeddedInterviews === 0 &&
    unembeddedWorkorders === 0
  );
}

async function acquireLock(db) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LOCK_LEASE_MS);
  try {
    const res = await db.collection(LOCK_COLLECTION).findOneAndUpdate(
      {
        _id: LOCK_ID,
        $or: [
          { status: { $ne: "running" } },
          { lease_until: { $lte: now } },
        ],
      },
      {
        $set: {
          status: "running",
          lease_until: leaseUntil,
          updated_at: now,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    return Boolean(res);
  } catch (err) {
    // E11000 duplicate key means another pod just inserted the lock
    if (err?.code === 11000) return false;
    throw err;
  }
}

async function releaseLock(db, status = "idle") {
  await db
    .collection(LOCK_COLLECTION)
    .updateOne(
      { _id: LOCK_ID },
      { $set: { status, updated_at: new Date() } }
    )
    .catch(() => {});
}

async function embedMissingDocuments(db) {
  for (const colConfig of embedConfig) {
    const {
      collection: collectionName,
      textFields,
      embeddingField,
      indexName,
      similarity,
      numDimensions,
    } = colConfig;

    const col = db.collection(collectionName);
    const docs = await col
      .find({
        seed_version: PREDICTIVE_SEED_VERSION,
        [`${embeddingField}.0`]: { $exists: false },
      })
      .toArray();

    for (const doc of docs) {
      const text = textFields
        .map((field) => doc[field] || "")
        .join("\n\n")
        .trim();
      if (!text) continue;
      try {
        const embedding = await generateEmbedding(text);
        await col.updateOne(
          { _id: doc._id },
          { $set: { [embeddingField]: embedding } }
        );
      } catch (err) {
        console.warn(
          `[predictive-seed] Embedding skipped for ${collectionName} (${doc._id}):`,
          err?.message || err
        );
      }
    }

    if (docs.length > 0) {
      try {
        await createVectorSearchIndex(
          collectionName,
          embeddingField,
          indexName,
          similarity,
          numDimensions
        );
      } catch (err) {
        console.warn(
          `[predictive-seed] Vector index check skipped for ${collectionName}:`,
          err?.message || err
        );
      }
    }
  }
}

export async function syncPredictiveMaintenanceSeedData() {
  const client = await getMongoClientPromise();
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) return;

  const db = client.db(dbName);

  if (await isAlreadySynced(db)) {
    verifiedInProcess = true;
    return;
  }

  const locked = await acquireLock(db);
  if (!locked) return;

  try {
    const [manuals, interviews, inventory, workorders] = await Promise.all([
      readSeedJson("manuals.json"),
      readSeedJson("interviews.json"),
      readSeedJson("inventory.json"),
      readSeedJson("workorders.json"),
    ]);

    // Replace static knowledge collections if stale
    for (const [colName, docs] of [
      ["manuals", manuals],
      ["interviews", interviews],
      ["inventory", inventory],
    ]) {
      const staleCount = await db
        .collection(colName)
        .countDocuments({ seed_version: { $ne: PREDICTIVE_SEED_VERSION } }, { limit: 1 });
      const v2Count = await db
        .collection(colName)
        .countDocuments({ seed_version: PREDICTIVE_SEED_VERSION }, { limit: 1 });
      if (staleCount > 0 || v2Count === 0) {
        await db.collection(colName).deleteMany({});
        if (docs.length > 0) {
          await db.collection(colName).insertMany(docs);
        }
      }
    }

    // For workorders, only replace seeded historical maintenance records;
    // preserve live/agent-generated ("new"/"scheduled") and LTW-04 production orders.
    const legacyWorkorders = await db
      .collection("workorders")
      .countDocuments({ "root cause": { $exists: true } }, { limit: 1 });
    const v2Workorders = await db
      .collection("workorders")
      .countDocuments({ seed_version: PREDICTIVE_SEED_VERSION }, { limit: 1 });

    if (legacyWorkorders > 0 || v2Workorders === 0) {
      await db.collection("workorders").deleteMany({
        status: "completed",
        orderType: { $ne: "production" },
      });
      if (workorders.length > 0) {
        await db.collection("workorders").insertMany(workorders);
      }
    }

    await embedMissingDocuments(db);
    verifiedInProcess = true;
  } finally {
    await releaseLock(db, "idle");
  }
}

export function triggerPredictiveMaintenanceSeedSync() {
  if (verifiedInProcess) return Promise.resolve();
  if (!activeSyncPromise) {
    activeSyncPromise = syncPredictiveMaintenanceSeedData()
      .catch((err) => {
        console.warn(
          "[predictive-seed] Background sync failed:",
          err?.message || err
        );
      })
      .finally(() => {
        activeSyncPromise = null;
      });
  }
  return activeSyncPromise;
}
