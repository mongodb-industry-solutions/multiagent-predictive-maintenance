import fs from "fs/promises";
import path from "path";
import { EJSON } from "bson";
import getMongoClientPromise from "../../integrations/mongodb/client.js";

export const KNOWLEDGE_GRAPH_COLLECTION = "knowledge_graph";
export const KNOWLEDGE_GRAPH_SEED_VERSION = 7;

const LOCK_COLLECTION = "seed_locks";
const LOCK_ID = "knowledge_graph_seed_sync";
const LOCK_LEASE_MS = 60 * 1000;
const SENTINEL_ID = "alarm:E12";

const INDEXES = [
  { key: { "edges.target": 1, layer: 1 }, name: "edges_target_layer" },
  { key: { parent_id: 1, node_type: 1 }, name: "parent_type" },
  { key: { layer: 1, node_type: 1 }, name: "layer_type" },
  { key: { code: 1 }, name: "code" },
  {
    key: { "external_ref.collection": 1, "external_ref.value": 1 },
    name: "external_ref",
  },
];

let verifiedInProcess = false;
let activeSyncPromise = null;

async function getDb() {
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required but not set");
  }
  const client = await getMongoClientPromise();
  return client.db(dbName);
}

export async function readKnowledgeGraphSeed() {
  const filePath = path.resolve(process.cwd(), "data", "knowledge_graph.json");
  const raw = await fs.readFile(filePath, "utf8");
  const docs = EJSON.parse(raw);
  if (!Array.isArray(docs) || docs.length === 0) {
    throw new Error("knowledge_graph.json does not contain a JSON array.");
  }
  const ids = new Set();
  for (const doc of docs) {
    if (!doc._id || !doc.node_type || !doc.layer) {
      throw new Error("Every knowledge graph node needs _id, node_type, and layer.");
    }
    if (ids.has(doc._id)) {
      throw new Error(`Duplicate knowledge graph _id: ${doc._id}`);
    }
    ids.add(doc._id);
  }
  return docs.map((doc) => ({
    ...doc,
    parent_id: doc.parent_id ?? null,
    edges: Array.isArray(doc.edges) ? doc.edges : [],
    seed_version: KNOWLEDGE_GRAPH_SEED_VERSION,
  }));
}

async function ensureIndexes(col) {
  await Promise.all(
    INDEXES.map((spec) => col.createIndex(spec.key, { name: spec.name }))
  );
}

async function listIndexNames(col) {
  try {
    const indexes = await col.indexes();
    return new Set(indexes.map((index) => index.name));
  } catch (err) {
    if (err?.code === 26 || err?.codeName === "NamespaceNotFound") return new Set();
    throw err;
  }
}

async function isAlreadySynced(col, expectedCount) {
  const [versioned, sentinel, otherVersion, names] = await Promise.all([
    col.countDocuments({ seed_version: KNOWLEDGE_GRAPH_SEED_VERSION }),
    col.countDocuments(
      { _id: SENTINEL_ID, seed_version: KNOWLEDGE_GRAPH_SEED_VERSION },
      { limit: 1 }
    ),
    col.countDocuments(
      { seed_version: { $ne: KNOWLEDGE_GRAPH_SEED_VERSION } },
      { limit: 1 }
    ),
    listIndexNames(col),
  ]);
  const indexesReady = INDEXES.every((spec) => names.has(spec.name));
  return (
    versioned === expectedCount &&
    sentinel === 1 &&
    otherVersion === 0 &&
    indexesReady
  );
}

async function acquireLock(db) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LOCK_LEASE_MS);
  try {
    const res = await db.collection(LOCK_COLLECTION).findOneAndUpdate(
      {
        _id: LOCK_ID,
        $or: [{ status: { $ne: "running" } }, { lease_until: { $lte: now } }],
      },
      {
        $set: { status: "running", lease_until: leaseUntil, updated_at: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    return Boolean(res);
  } catch (err) {
    if (err?.code === 11000) return false;
    throw err;
  }
}

async function releaseLock(db) {
  await db
    .collection(LOCK_COLLECTION)
    .updateOne(
      { _id: LOCK_ID },
      { $set: { status: "idle", updated_at: new Date() } }
    )
    .catch(() => {});
}

export async function seedKnowledgeGraphData() {
  const db = await getDb();
  const col = db.collection(KNOWLEDGE_GRAPH_COLLECTION);
  const docs = await readKnowledgeGraphSeed();

  if (await isAlreadySynced(col, docs.length)) {
    verifiedInProcess = true;
    return { seeded: true, nodes: docs.length, wrote: false };
  }

  const locked = await acquireLock(db);
  if (!locked) {
    return { seeded: false, nodes: docs.length, wrote: false, lockedOut: true };
  }

  try {
    if (await isAlreadySynced(col, docs.length)) {
      verifiedInProcess = true;
      return { seeded: true, nodes: docs.length, wrote: false };
    }

    const seedIds = docs.map((doc) => doc._id);
    await col.bulkWrite(
      docs.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      })),
      { ordered: false }
    );
    await col.deleteMany({
      seed_version: { $exists: true },
      _id: { $nin: seedIds },
    });
    await ensureIndexes(col);
    verifiedInProcess = true;
    return { seeded: true, nodes: docs.length, wrote: true };
  } finally {
    await releaseLock(db);
  }
}

export function triggerKnowledgeGraphBackgroundInit() {
  if (verifiedInProcess) return Promise.resolve();
  if (!activeSyncPromise) {
    activeSyncPromise = seedKnowledgeGraphData()
      .catch((err) => {
        console.warn(
          "[knowledge-graph] Background sync failed:",
          err?.message || err
        );
      })
      .finally(() => {
        activeSyncPromise = null;
      });
  }
  return activeSyncPromise;
}

export async function getKnowledgeGraphStatus() {
  await seedKnowledgeGraphData();
  const db = await getDb();
  const col = db.collection(KNOWLEDGE_GRAPH_COLLECTION);
  const [nodes, indexes, sampleDoc, layerRows, typeRows] = await Promise.all([
    col
      .find(
        {},
        {
          projection: {
            code: 1,
            label: 1,
            node_type: 1,
            layer: 1,
            parent_id: 1,
            uns_topic: 1,
            summary: 1,
            attributes: 1,
            external_ref: 1,
            edges: 1,
          },
        }
      )
      .toArray(),
    col.indexes(),
    col.findOne({ _id: SENTINEL_ID }),
    col
      .aggregate([{ $group: { _id: "$layer", count: { $sum: 1 } } }])
      .toArray(),
    col
      .aggregate([{ $group: { _id: "$node_type", count: { $sum: 1 } } }])
      .toArray(),
  ]);

  const edges = nodes.flatMap((node) =>
    (node.edges || []).map((edge) => ({
      source: node._id,
      target: edge.target,
      rel: edge.rel,
      label: edge.label,
    }))
  );
  const byLayer = Object.fromEntries(layerRows.map((row) => [row._id, row.count]));
  const byType = Object.fromEntries(typeRows.map((row) => [row._id, row.count]));

  return {
    seeded: nodes.length > 0,
    collection: KNOWLEDGE_GRAPH_COLLECTION,
    nodes,
    edges,
    stats: {
      nodes: nodes.length,
      edges: edges.length,
      byLayer,
      byType,
    },
    indexes: indexes.map((index) => ({
      name: index.name,
      key: index.key,
      unique: Boolean(index.unique),
    })),
    sampleDoc,
  };
}
