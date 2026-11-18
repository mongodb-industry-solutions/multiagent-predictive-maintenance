import { EJSON, Long } from "bson";
import getMongoClientPromise from "../../integrations/mongodb/client.js";
import {
  mongoshToEjsonText,
  plainValue,
} from "../connectedFactory/pipelineRunner.js";
import { KNOWLEDGE_GRAPH_COLLECTION } from "./seedData.js";

const WRITE_STAGES = new Set(["$out", "$merge"]);
const JS_OPERATORS = new Set(["$function", "$accumulator", "$where"]);
const COLLECTION_REFS = {
  $lookup: "from",
  $graphLookup: "from",
  $unionWith: "coll",
};
const DEPTH_FIELDS = ["hop", "depth", "isa95_depth", "provenance_depth"];

export const KG_ALLOWED_COLLECTIONS = new Set([
  KNOWLEDGE_GRAPH_COLLECTION,
  "inventory",
  "materials",
  "manuals",
  "change_procedures",
  "alerts",
  "maintenance_staff",
]);

const MAX_ROWS = 200;
const MAX_TIME_MS = 15000;

function isLong(value) {
  return value instanceof Long || value?._bsontype === "Long";
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (isLong(value) && typeof value.toNumber === "function") return value.toNumber();
  return null;
}

function sanitizeBson(value) {
  if (isLong(value)) return asNumber(value);
  if (Array.isArray(value)) return value.map(sanitizeBson);
  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date) &&
    value._bsontype !== "ObjectId" &&
    typeof value.toHexString !== "function"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeBson(item)])
    );
  }
  return value;
}

function validateReadOnlyNode(node) {
  if (Array.isArray(node)) {
    for (const item of node) validateReadOnlyNode(item);
    return;
  }
  if (!node || typeof node !== "object" || node instanceof Date) return;
  for (const [key, value] of Object.entries(node)) {
    if (WRITE_STAGES.has(key)) {
      throw new Error(`${key} writes data. This query runner is strictly read-only.`);
    }
    if (JS_OPERATORS.has(key)) {
      throw new Error(`${key} executes server-side JavaScript and is not permitted.`);
    }
    if (Object.prototype.hasOwnProperty.call(COLLECTION_REFS, key)) {
      const refField = COLLECTION_REFS[key];
      const target =
        key === "$unionWith" && typeof value === "string"
          ? value
          : value && typeof value === "object"
            ? value[refField]
            : null;
      if (!KG_ALLOWED_COLLECTIONS.has(target)) {
        throw new Error(
          `${key} may only reference knowledge graph collections (${[
            ...KG_ALLOWED_COLLECTIONS,
          ].join(", ")}), got ${JSON.stringify(target)}.`
        );
      }
    }
    validateReadOnlyNode(value);
  }
}

export function parseKnowledgeGraphPipeline(pipelineInput) {
  let stages;
  if (typeof pipelineInput === "string") {
    stages = EJSON.parse(mongoshToEjsonText(pipelineInput));
  } else {
    stages = EJSON.deserialize(pipelineInput);
  }
  if (!Array.isArray(stages)) {
    throw new Error("An aggregation pipeline must be an array of stage objects.");
  }
  for (const stage of stages) {
    if (!stage || typeof stage !== "object" || Array.isArray(stage)) {
      throw new Error("Each pipeline stage must be a JSON object.");
    }
    const keys = Object.keys(stage);
    if (keys.length !== 1) {
      throw new Error(
        `Each pipeline stage must have exactly one operator key (found: ${keys.join(", ")}).`
      );
    }
    if (WRITE_STAGES.has(keys[0])) {
      throw new Error(`${keys[0]} writes data. This query runner is strictly read-only.`);
    }
  }
  validateReadOnlyNode(stages);
  return stages;
}

function considerNode(node, hopByNodeId) {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  if (typeof node._id !== "string" || !node._id.includes(":")) return;
  const depth = DEPTH_FIELDS.map((field) => asNumber(node[field])).find(
    (value) => value != null
  );
  if (depth == null) return;
  const previous = hopByNodeId[node._id];
  if (previous == null || depth < previous) hopByNodeId[node._id] = depth;
}

function walk(value, hopByNodeId) {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, hopByNodeId);
    return;
  }
  if (value && typeof value === "object") {
    considerNode(value, hopByNodeId);
    for (const item of Object.values(value)) walk(item, hopByNodeId);
  }
}

export function extractGraphHighlight(rows) {
  const hopByNodeId = {};
  const rootIds = [];
  for (const row of rows) {
    if (typeof row?._id === "string" && row._id.includes(":")) {
      rootIds.push(row._id);
    }
    walk(row, hopByNodeId);
  }
  return { rootIds: [...new Set(rootIds)], hopByNodeId };
}

export async function runKnowledgeGraphPipeline({ collection, pipeline }) {
  if (collection !== KNOWLEDGE_GRAPH_COLLECTION) {
    throw new Error(
      `Knowledge graph queries start on '${KNOWLEDGE_GRAPH_COLLECTION}'.`
    );
  }
  const stages = parseKnowledgeGraphPipeline(pipeline);
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required but not set");
  }
  const client = await getMongoClientPromise();
  const db = client.db(dbName);
  const startedAt = performance.now();
  const docs = await db
    .collection(collection)
    .aggregate(stages, { maxTimeMS: MAX_TIME_MS })
    .limit(MAX_ROWS)
    .toArray();
  const roundTripMs = Math.round(performance.now() - startedAt);
  const sanitized = docs.map(sanitizeBson);
  const highlight = extractGraphHighlight(sanitized);
  return {
    rows: sanitized.map(plainValue),
    count: sanitized.length,
    roundTripMs,
    highlight,
  };
}
