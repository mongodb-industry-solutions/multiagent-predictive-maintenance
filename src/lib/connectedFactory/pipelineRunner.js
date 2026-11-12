import { EJSON, ObjectId } from "bson";
import getMongoClientPromise from "../../integrations/mongodb/client.js";
import {
  CF_ALLOWED_COLLECTIONS,
  CF_COLLECTIONS,
} from "./constants.js";
import { ensureConnectedFactoryCurrentDay } from "./seedData.js";
import {
  DEFAULT_SIGNAL,
  signaturePipeline,
  signaturePipelineText,
} from "./signatures.js";

const WRITE_STAGES = new Set(["$out", "$merge"]);
const JS_OPERATORS = new Set(["$function", "$accumulator", "$where"]);
const COLLECTION_REFS = {
  $lookup: "from",
  $graphLookup: "from",
  $unionWith: "coll",
};
const DATE_FIELD_NAMES = new Set([
  "ts",
  "eventTime",
  "startedAt",
  "endedAt",
  "start",
  "end",
]);
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;
const SIGNATURE_MACRO_RE =
  /SIGNATURE_OF\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']+)["'])?\s*\)/g;

export const MAX_ROWS = 300;
export const MAX_TIME_MS = 20000;

async function getDb() {
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required but not set");
  }
  const client = await getMongoClientPromise();
  return client.db(dbName);
}

/**
 * Compute the 24-bin z-scored curve signature for a 4-minute telemetry window
 * directly inside MongoDB.
 */
export async function computeLiveSignature(
  machineId,
  startIso,
  endIso,
  signal = DEFAULT_SIGNAL
) {
  await ensureConnectedFactoryCurrentDay();
  const db = await getDb();
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid date range for SIGNATURE_OF: ${startIso} to ${endIso}`);
  }

  const rows = await db
    .collection(CF_COLLECTIONS.TELEMETRY)
    .aggregate(signaturePipeline(machineId, start, end, signal), {
      maxTimeMS: MAX_TIME_MS,
    })
    .toArray();

  if (!rows.length || !Array.isArray(rows[0].signature)) {
    throw new Error(
      `No ${signal} readings found on ${machineId} between ${startIso} and ${endIso}.`
    );
  }

  return {
    signature: rows[0].signature,
    peakTempC: rows[0].peakTempC,
    pipeline: signaturePipelineText(machineId, start, end, signal),
  };
}

async function expandSignatureMacros(pipelineText) {
  const matches = [...pipelineText.matchAll(SIGNATURE_MACRO_RE)];
  if (matches.length === 0) return pipelineText;

  let expanded = pipelineText;
  for (const match of matches) {
    const [fullMatch, workCell, startIso, endIso, signal] = match;
    const computed = await computeLiveSignature(
      workCell,
      startIso,
      endIso,
      signal || DEFAULT_SIGNAL
    );
    expanded = expanded.replace(fullMatch, JSON.stringify(computed.signature));
  }
  return expanded;
}

/**
 * Convert mongosh-flavored pipeline text into strict EJSON text safely without
 * corrupting colons, slashes, or dates inside quoted string literals.
 */
export function mongoshToEjsonText(source) {
  let stripped = "";
  let i = 0;
  const len = source.length;

  // Pass 1: strip // and /* */ comments while normalizing single-quoted strings to JSON double-quoted strings.
  while (i < len) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === "/" && next === "/") {
      i += 2;
      while (i < len && source[i] !== "\n") i += 1;
      continue;
    }

    if (ch === "/" && next === "*") {
      i += 2;
      while (i < len && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }

    if (ch === '"') {
      stripped += ch;
      i += 1;
      while (i < len) {
        const c = source[i];
        stripped += c;
        i += 1;
        if (c === "\\" && i < len) {
          stripped += source[i];
          i += 1;
        } else if (c === '"') {
          break;
        }
      }
      continue;
    }

    if (ch === "'") {
      stripped += '"';
      i += 1;
      while (i < len) {
        const c = source[i];
        i += 1;
        if (c === "\\" && i < len) {
          const esc = source[i];
          i += 1;
          stripped += esc === "'" ? "'" : `\\${esc}`;
        } else if (c === '"') {
          stripped += '\\"';
        } else if (c === "'") {
          break;
        } else {
          stripped += c;
        }
      }
      stripped += '"';
      continue;
    }

    stripped += ch;
    i += 1;
  }

  // Pass 2: transform ISODate(...) / new Date(...), quote unquoted keys, and drop trailing commas outside strings.
  let out = "";
  i = 0;
  while (i < stripped.length) {
    const ch = stripped[i];

    if (ch === '"') {
      let strToken = '"';
      i += 1;
      while (i < stripped.length) {
        const c = stripped[i];
        strToken += c;
        i += 1;
        if (c === "\\" && i < stripped.length) {
          strToken += stripped[i];
          i += 1;
        } else if (c === '"') {
          break;
        }
      }
      out += strToken;
      continue;
    }

    const rest = stripped.slice(i);
    const dateMatch = /^(?:ISODate|new\s+Date)\(\s*"([^"]+)"\s*\)/.exec(rest);
    if (dateMatch) {
      out += `{"$date":"${dateMatch[1]}"}`;
      i += dateMatch[0].length;
      continue;
    }

    const keyMatch = /^([{,]\s*)([A-Za-z_$][A-Za-z0-9_.$]*)\s*:/.exec(rest);
    if (keyMatch) {
      out += `${keyMatch[1]}"${keyMatch[2]}":`;
      i += keyMatch[0].length;
      continue;
    }

    if (ch === ",") {
      const trailingMatch = /^,(\s*[}\]])/.exec(rest);
      if (trailingMatch) {
        i += 1;
        continue;
      }
    }

    out += ch;
    i += 1;
  }

  return out;
}

function isObjectIdLike(value) {
  return Boolean(
    value &&
      (value instanceof ObjectId ||
        value._bsontype === "ObjectId" ||
        typeof value.toHexString === "function")
  );
}

function coerceKnownDates(node, currentField = null) {
  if (node instanceof Date || isObjectIdLike(node)) return node;
  if (Array.isArray(node)) {
    return node.map((item) => coerceKnownDates(item, currentField));
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [key, value] of Object.entries(node)) {
      const nextField = key.startsWith("$") ? currentField : key;
      out[key] = coerceKnownDates(value, nextField);
    }
    return out;
  }
  if (
    typeof node === "string" &&
    currentField &&
    DATE_FIELD_NAMES.has(currentField) &&
    ISO_DATE_RE.test(node)
  ) {
    return new Date(node);
  }
  return node;
}

function validateReadOnlyNode(node) {
  if (Array.isArray(node)) {
    for (const item of node) validateReadOnlyNode(item);
    return;
  }
  if (!node || typeof node !== "object" || node instanceof Date || isObjectIdLike(node)) {
    return;
  }
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
      if (!CF_ALLOWED_COLLECTIONS.has(target)) {
        throw new Error(
          `${key} may only reference Connected Factory collections (${[
            ...CF_ALLOWED_COLLECTIONS,
          ].join(", ")}), got ${JSON.stringify(target)}.`
        );
      }
    }
    validateReadOnlyNode(value);
  }
}

export async function parseAndValidatePipeline(pipelineInput) {
  let stages;
  if (typeof pipelineInput === "string") {
    const withSig = await expandSignatureMacros(pipelineInput);
    const ejsonText = mongoshToEjsonText(withSig);
    stages = EJSON.parse(ejsonText);
  } else {
    stages = coerceKnownDates(EJSON.deserialize(pipelineInput));
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

export function validateReadOnlyFilter(filterInput = {}) {
  const deserialized = coerceKnownDates(EJSON.deserialize(filterInput || {}));
  validateReadOnlyNode(deserialized);
  return deserialized;
}

export function plainValue(value) {
  if (value instanceof Date) {
    return value.toISOString().replace(".000Z", "Z");
  }
  if (isObjectIdLike(value)) {
    return typeof value.toHexString === "function"
      ? value.toHexString()
      : value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(plainValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, plainValue(v)])
    );
  }
  return value;
}

function extractMaxExecutionMs(plan) {
  const found = [];
  const walk = (node) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        if (
          (k === "executionTimeMillis" || k === "executionTimeMillisEstimate") &&
          typeof v === "number"
        ) {
          found.push(Math.round(v));
        }
        walk(v);
      }
    }
  };
  walk(plan);
  return found.length ? Math.max(...found) : null;
}

function sumMillisElapsed(node) {
  if (Array.isArray(node)) {
    return node.reduce((acc, item) => acc + sumMillisElapsed(item), 0);
  }
  if (node && typeof node === "object") {
    let total = 0;
    for (const [k, v] of Object.entries(node)) {
      if (k === "millisElapsed" && typeof v === "number") {
        total += v;
      }
      total += sumMillisElapsed(v);
    }
    return total;
  }
  return 0;
}

async function inspectExplainStats(db, collectionName, stages) {
  const hasVectorSearch = stages.some((st) => Boolean(st.$vectorSearch));
  try {
    const plan = await db.command({
      explain: { aggregate: collectionName, pipeline: stages, cursor: {} },
      verbosity: "executionStats",
    });
    const ms = extractMaxExecutionMs(plan);
    if (!hasVectorSearch) {
      return { ms, search: null };
    }
    const vectorExplain = plan?.stages?.[0]?.$vectorSearch?.explain || {};
    const args = vectorExplain?.query?.args || {};
    const total = sumMillisElapsed(vectorExplain);
    const filter = sumMillisElapsed(args.filter);
    const knn = sumMillisElapsed(args.query);
    const score = Math.max(total - filter - knn, 0);
    return {
      ms,
      search: {
        total: Number(total.toFixed(2)),
        filter: Number(filter.toFixed(2)),
        knn: Number(knn.toFixed(2)),
        score: Number(score.toFixed(2)),
      },
    };
  } catch {
    return { ms: null, search: null };
  }
}

export async function runReadOnlyPipeline({
  collection,
  pipeline,
  explain = false,
  maxRows = MAX_ROWS,
}) {
  if (!CF_ALLOWED_COLLECTIONS.has(collection)) {
    throw new Error(
      `Collection '${collection}' is not part of Connected Factory Context Explorer. Allowed: ${[
        ...CF_ALLOWED_COLLECTIONS,
      ].join(", ")}.`
    );
  }

  await ensureConnectedFactoryCurrentDay();
  const stages = await parseAndValidatePipeline(pipeline);
  const db = await getDb();
  const startedAt = performance.now();

  if (explain) {
    const plan = await db.command({
      explain: { aggregate: collection, pipeline: stages, cursor: {} },
      verbosity: "executionStats",
    });
    const roundTripMs = Math.round(performance.now() - startedAt);
    return {
      explain: EJSON.stringify(plan, null, 2),
      ms: roundTripMs,
    };
  }

  const docs = await db
    .collection(collection)
    .aggregate(stages, { maxTimeMS: MAX_TIME_MS })
    .limit(maxRows)
    .toArray();
  const roundTripMs = Math.round(performance.now() - startedAt);
  const rows = docs.map(plainValue);
  const stats = await inspectExplainStats(db, collection, stages);

  return {
    rows,
    count: rows.length,
    ms: stats.ms,
    search: stats.search,
    roundTripMs,
  };
}

export async function runReadOnlyFind({
  collection,
  filter = {},
  projection,
  sort,
  limit = 50,
}) {
  if (!CF_ALLOWED_COLLECTIONS.has(collection)) {
    throw new Error(
      `Collection '${collection}' is not part of Connected Factory Context Explorer.`
    );
  }
  await ensureConnectedFactoryCurrentDay();
  const safeFilter = validateReadOnlyFilter(filter);
  const boundedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const db = await getDb();

  const findOptions = {
    limit: boundedLimit,
    maxTimeMS: MAX_TIME_MS,
  };
  if (projection && typeof projection === "object") {
    findOptions.projection = projection;
  }
  if (sort && typeof sort === "object") {
    findOptions.sort = sort;
  }

  const docs = await db
    .collection(collection)
    .find(safeFilter, findOptions)
    .toArray();
  return docs.map(plainValue);
}
