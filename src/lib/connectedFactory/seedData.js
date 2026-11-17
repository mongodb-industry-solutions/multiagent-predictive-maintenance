import getMongoClientPromise from "../../integrations/mongodb/client.js";
import {
  CF_ALLOWED_COLLECTIONS,
  CF_AREA,
  CF_COLLECTIONS,
  CF_FACTORY_ID,
  CF_MACHINE_ID,
  CF_PROD_LINE_ID,
  CF_TELEMETRY_TTL_SECONDS,
  CF_VECTOR_INDEX_NAME,
  getCurrentDemoDay,
} from "./constants.js";
import {
  DEFAULT_SIGNAL,
  SIGNATURE_BINS,
  signaturePipeline,
} from "./signatures.js";

export {
  CF_ALLOWED_COLLECTIONS,
  CF_AREA,
  CF_COLLECTIONS,
  CF_FACTORY_ID,
  CF_MACHINE_ID,
  CF_PROD_LINE_ID,
  CF_TELEMETRY_TTL_SECONDS,
  CF_VECTOR_INDEX_NAME,
  getCurrentDemoDay,
};

const EXCURSION_START_SEC = 8 * 3600 + 13 * 60 + 30; // 08:13:30Z
const EXCURSION_END_SEC = 8 * 3600 + 15 * 60; // 08:15:00Z
const BURST_START_SEC = 8 * 3600 + 4 * 60; // 08:04:00Z (1s cadence around excursion)
const BURST_END_SEC = 8 * 3600 + 20 * 60; // 08:20:00Z
export const EXPECTED_TELEMETRY_COUNT = 15264;
const LOCK_LEASE_MS = 2 * 60 * 1000;
const HISTORICAL_ANCHOR_MS = Date.parse("2026-09-10T00:00:00Z");

let verifiedDayInProcess = null;
let activeInitPromise = null;
let lastInitError = null;

function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = (mean = 0, std = 1) => {
    const u1 = Math.max(next(), 1e-12);
    const u2 = next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  };
  const int = (min, maxInclusive) =>
    min + Math.floor(next() * (maxInclusive - min + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  return { next, gauss, int, pick };
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function zscore(bins) {
  const mu = bins.reduce((sum, val) => sum + val, 0) / bins.length;
  const variance =
    bins.reduce((sum, val) => sum + (val - mu) ** 2, 0) / bins.length;
  const sd = Math.sqrt(variance) || 1.0;
  return bins.map((val) => round((val - mu) / sd, 4));
}

export const MATERIALS_SEED = [
  {
    materialMaster: "MAT-CU-020",
    name: "Nickel-plated C11000 copper tab foil",
    supplier: "Aurubis",
    thicknessMm: "0.20",
    maxShieldO2Ppm: 80,
    maxWeldTempC: 230,
  },
  {
    materialMaster: "MAT-AL-030",
    name: "AA1050 high-purity aluminum cathode tab",
    supplier: "Hydro",
    thicknessMm: "0.30",
    maxShieldO2Ppm: 60,
    maxWeldTempC: 215,
  },
  {
    materialMaster: "MAT-CU-025",
    name: "Bimetal Al-Cu clad busbar transition strip",
    supplier: "Wieland",
    thicknessMm: "0.25",
    maxShieldO2Ppm: 90,
    maxWeldTempC: 245,
  },
];

const ORDERS_SPEC = [
  // Fixed workOrder IDs updated in-place to the active UTC day so workorders never accumulate.
  ["WO-1001232", 0, 6, "MAT-CU-020", "EV-PM-4C-S", 60, "M. Braun", null],
  ["WO-1001233", 6, 8, "MAT-AL-030", "EV-PM-4C-P", 40, "T. Keller", null],
  [
    "WO-1001234",
    8,
    14,
    "MAT-CU-020",
    "EV-PM-4C-S",
    100,
    "A. Vogel",
    "MES-123456",
  ],
  [
    "WO-1001235",
    14,
    18,
    "MAT-CU-025",
    "EV-PK-8M-LR",
    80,
    "M. Braun",
    null,
  ],
  ["WO-1001236", 18, 22, "MAT-CU-020", "EV-PM-4C-S", 55, "T. Keller", null],
  // 22:00 to 24:00 is intentionally empty so the 22:47 alert demonstrates an orderless downtime fault.
];

const ORDER_IDS = ORDERS_SPEC.map(([id]) => id);

const ALERTS_SPEC = [
  // Fixed alert_id keys updated in-place to the active UTC day so alerts never accumulate.
  [
    "ALT-LTW04-01",
    2,
    17,
    4,
    3,
    "W-FEED-03",
    "Tab feeder micro-slip detected",
    "Tab strip feed alignment slip compensated",
    "tab-feeder-1",
  ],
  [
    "ALT-LTW04-02",
    6,
    41,
    55,
    2,
    "W-GAS-02",
    "Shield gas flow below setpoint",
    "Argon shield gas flow dipped below nominal threshold",
    "argon-loop-2",
  ],
  [
    "ALT-LTW04-03",
    8,
    14,
    12,
    1,
    "W-TEMP-01",
    "Weld-zone temperature exceeded",
    "IR pyrometer detected weld-zone thermal excursion",
    "weld-head-optics",
  ],
  [
    "ALT-LTW04-04",
    8,
    14,
    41,
    1,
    "W-PLUME-01",
    "Spatter plume density exceeded",
    "Optical plume sensor exceeded protective window threshold",
    "weld-head-optics",
  ],
  [
    "ALT-LTW04-05",
    8,
    52,
    9,
    2,
    "W-LASER-02",
    "Laser power stability warning",
    "Fiber laser output fluctuation above 2.5% band",
    "fiber-laser-4",
  ],
  [
    "ALT-LTW04-06",
    11,
    6,
    33,
    3,
    "W-CLAMP-03",
    "Fixture clamp seating retry",
    "Module fixture pneumatic clamp seated on second stroke",
    "clamp-unit-b",
  ],
  [
    "ALT-LTW04-07",
    15,
    28,
    47,
    2,
    "W-GAS-02",
    "Shield gas flow below setpoint",
    "Argon shield gas flow dipped below nominal threshold",
    "argon-loop-2",
  ],
  [
    "ALT-LTW04-08",
    19,
    3,
    21,
    3,
    "W-FUME-03",
    "Fume extractor pressure drop",
    "HEPA fume extraction differential pressure warning",
    "fume-unit-4",
  ],
  [
    "ALT-LTW04-09",
    22,
    47,
    2,
    2,
    "W-GAS-02",
    "Shield gas flow below setpoint",
    "Argon shield gas flow dipped during post-shift purge",
    "argon-loop-2",
  ],
];

const ALERT_IDS = ALERTS_SPEC.map(([id]) => id);

function dayBoundsMs(dayStr) {
  const startMs = Date.parse(`${dayStr}T00:00:00Z`);
  return {
    startMs,
    startDate: new Date(startMs),
    endDate: new Date(startMs + 86400 * 1000),
  };
}

function buildProductionOrders(dayStr) {
  const { startMs } = dayBoundsMs(dayStr);
  return ORDERS_SPEC.map(
    ([
      workOrder,
      startHour,
      endHour,
      materialMaster,
      product,
      plannedQty,
      operatorId,
      legacyRef,
    ]) => {
      const doc = {
        workOrder,
        orderType: "production",
        demoDay: dayStr,
        machine_id: CF_MACHINE_ID,
        site: CF_FACTORY_ID,
        area: CF_AREA,
        startedAt: new Date(startMs + startHour * 3600 * 1000),
        endedAt: new Date(startMs + endHour * 3600 * 1000),
        materialMaster,
        product,
        plannedQty,
        operatorId,
      };
      if (legacyRef) doc.legacyRef = legacyRef;
      return doc;
    }
  );
}

function orderAtSecond(sec) {
  const hour = sec / 3600;
  for (const [wo, h0, h1, mat] of ORDERS_SPEC) {
    if (hour >= h0 && hour < h1) {
      return { workOrder: wo, materialMaster: mat };
    }
  }
  return { workOrder: null, materialMaster: null };
}

function buildAlerts(dayStr) {
  const { startMs } = dayBoundsMs(dayStr);
  return ALERTS_SPEC.map(
    ([alertId, h, m, s, priority, errCode, errName, message, component]) => ({
      alert_id: alertId,
      demoDay: dayStr,
      err_code: errCode,
      err_name: errName,
      machine_id: CF_MACHINE_ID,
      area: CF_AREA,
      priority,
      status: "unacknowledged",
      source: "edge-weld-monitor",
      details: {
        component,
        message,
      },
      ts: new Date(startMs + (h * 3600 + m * 60 + s) * 1000),
    })
  );
}

function hump(n = 24, start = 6, width = 9, height = 1.0) {
  const out = Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    const p = (i - start) / width;
    if (p >= 0 && p <= 1) {
      out[i] = height * Math.sin(p * Math.PI);
    }
  }
  return out;
}

function rampPlateau(n = 24, start = 4, rise = 8) {
  return Array.from({ length: n }, (_, i) =>
    i < start ? 0 : Math.min(1.0, (i - start) / rise)
  );
}

function oscillation(n = 24, period = 6) {
  return Array.from(
    { length: n },
    (_, i) => 0.5 + 0.5 * Math.sin((2 * Math.PI * i) / period)
  );
}

function dip(n = 24, at = 10, width = 6) {
  const sigma = width / 3;
  return Array.from({ length: n }, (_, i) =>
    -Math.exp(-((i - at) ** 2) / (2 * sigma ** 2))
  );
}

function spike(n = 24, at = 12) {
  return Array.from({ length: n }, (_, i) => (i === at ? 1.0 : 0.0));
}

function buildExcursions(rng) {
  const materialNames = Object.fromEntries(
    MATERIALS_SEED.map((m) => [m.materialMaster, m.name])
  );
  const fleetCells = [
    ["LTW-04", "leafy-ev-01", "Trumpf TruDisk 6001"],
    ["LTW-06", "leafy-ev-01", "Trumpf TruDisk 6001"],
    ["LTW-02", "leafy-ev-02", "Trumpf TruDisk 6001"],
    ["LTW-03", "leafy-ev-02", "IPG YLR-4000"],
    ["LTW-09", "leafy-na-01", "Trumpf TruDisk 6001"],
  ];
  const operators = [
    "A. Vogel",
    "M. Braun",
    "T. Keller",
    "J. Ortiz",
    "S. Nowak",
    "L. Fischer",
  ];

  const curatedHumps = [
    {
      cell: ["LTW-04", "leafy-ev-01", "Trumpf TruDisk 6001"],
      daysAgo: 29,
      hour: 19,
      minute: 30,
      mat: "MAT-AL-030",
      status: "closed",
      shape: () => hump(24, 6, 9, 1.0),
      noise: 0.035,
    },
    {
      cell: ["LTW-03", "leafy-ev-02", "IPG YLR-4000"],
      daysAgo: 134,
      hour: 22,
      minute: 30,
      mat: "MAT-CU-025",
      status: "closed",
      shape: () => hump(24, 6, 9.5, 1.0),
      noise: 0.045,
    },
    {
      cell: ["LTW-02", "leafy-ev-02", "Trumpf TruDisk 6001"],
      daysAgo: 349,
      hour: 21,
      minute: 47,
      mat: "MAT-AL-030",
      status: "open",
      shape: () => hump(24, 6, 8.5, 1.0),
      noise: 0.055,
    },
    {
      cell: ["LTW-03", "leafy-ev-02", "IPG YLR-4000"],
      daysAgo: 164,
      hour: 18,
      minute: 0,
      mat: "MAT-CU-020",
      status: "closed",
      shape: () => hump(24, 5, 9, 1.0),
      noise: 0.05,
    },
  ];

  const docs = [];
  let seq = 1;

  for (const item of curatedHumps) {
    const [machineId, site, laserModel] = item.cell;
    const startMs =
      HISTORICAL_ANCHOR_MS -
      item.daysAgo * 86400 * 1000 +
      (item.hour * 3600 + item.minute * 60 + 30) * 1000;
    const start = new Date(startMs);
    const curve = item.shape().map((v) => v + rng.gauss(0, item.noise));
    const peak = 174 + 52 + rng.next() * 14;
    docs.push({
      excursionId: `EX-${start.getUTCFullYear()}-${String(seq).padStart(4, "0")}`,
      machine_id: machineId,
      site,
      laserModel,
      signal: DEFAULT_SIGNAL,
      start,
      end: new Date(startMs + 240 * 1000),
      workOrder: `WO-100${rng.int(1100, 1999)}`,
      materialMaster: item.mat,
      material: materialNames[item.mat],
      operatorId: rng.pick(operators),
      peakTempC: round(peak, 1),
      rootCause:
        item.status === "closed"
          ? "protective window spatter contamination"
          : null,
      fix:
        item.status === "closed"
          ? "replaced laser protective window, cleaned coaxial nozzle"
          : null,
      status: item.status,
      signature: zscore(curve),
    });
    seq += 1;
  }

  const otherCauses = [
    {
      cause: "fiber laser power calibration drift",
      fix: "recalibrated fiber laser output against thermopile power meter",
      count: 5,
      mats: ["MAT-CU-020", "MAT-AL-030", "MAT-CU-025", "MAT-CU-020", "MAT-AL-030"],
      makeShape: () => rampPlateau(24, rng.int(3, 6), rng.int(6, 10)),
    },
    {
      cause: "argon shield-gas regulator oscillation",
      fix: "replaced argon loop-2 proportional pressure regulator",
      count: 6,
      mats: [
        "MAT-CU-020",
        "MAT-CU-025",
        "MAT-AL-030",
        "MAT-CU-020",
        "MAT-CU-025",
        "MAT-AL-030",
      ],
      makeShape: () => oscillation(24, rng.pick([5, 6, 8])),
    },
    {
      cause: "enclosure interlock opened mid-cycle",
      fix: "verified safety door latch sensor, briefed line operator",
      count: 5,
      mats: ["MAT-CU-020", "MAT-AL-030", "MAT-CU-025", "MAT-AL-030", "MAT-CU-020"],
      makeShape: () => dip(24, rng.int(9, 13), rng.int(5, 8)),
    },
    {
      cause: "IR pyrometer sensor spike",
      fix: "replaced coaxial IR pyrometer optical fiber lead",
      count: 4,
      mats: ["MAT-CU-020", "MAT-CU-025", "MAT-CU-020", "MAT-AL-030"],
      makeShape: () => spike(24, rng.int(7, 17)),
    },
  ];

  for (const group of otherCauses) {
    for (let idx = 0; idx < group.count; idx += 1) {
      const [machineId, site, laserModel] = rng.pick(fleetCells);
      const daysAgo = rng.int(5, 480);
      const hour = rng.int(1, 22);
      const minute = rng.pick([0, 12, 30, 47]);
      const startMs =
        HISTORICAL_ANCHOR_MS -
        daysAgo * 86400 * 1000 +
        (hour * 3600 + minute * 60 + 30) * 1000;
      const start = new Date(startMs);
      const mat = group.mats[idx];
      const curve = group.makeShape().map((v) => v + rng.gauss(0, 0.045));
      const status = rng.next() < 0.85 ? "closed" : "open";
      const peak = 172 + 44 + rng.next() * 24;

      docs.push({
        excursionId: `EX-${start.getUTCFullYear()}-${String(seq).padStart(4, "0")}`,
        machine_id: machineId,
        site,
        laserModel,
        signal: DEFAULT_SIGNAL,
        start,
        end: new Date(startMs + 240 * 1000),
        workOrder: `WO-100${rng.int(1100, 1999)}`,
        materialMaster: mat,
        material: materialNames[mat],
        operatorId: rng.pick(operators),
        peakTempC: round(peak, 1),
        rootCause: status === "closed" ? group.cause : null,
        fix: status === "closed" ? group.fix : null,
        status,
        signature: zscore(curve),
      });
      seq += 1;
    }
  }

  return docs;
}

/**
 * Insert a compact, high-fidelity 24-hour LTW-04 dataset (15,264 docs in ~1.2s):
 * - `weld-zone-temp` every 10s across 24h PLUS 1-second resolution from 08:04 to 08:20
 *   (covering the 08:14:12Z reading and all 240 1s samples for SIGNATURE_OF).
 * - `laser-power` and `shield-gas-flow` every 30s across 24h.
 * Because timestamps belong to `dayStr` (today UTC), every document stays well inside
 * `telemetry`'s `expireAfterSeconds: 86400` TTL window and self-expires after 24 hours.
 */
async function insertTelemetryMeasurements(collection, dayStr, rng) {
  const { startMs } = dayBoundsMs(dayStr);
  const docs = [];

  // 1. weld-zone-temp (9,504 docs: 10s all day + 1s burst in [08:04:00, 08:20:00))
  for (let second = 0; second < 86400; second += 1) {
    const inBurst = second >= BURST_START_SEC && second < BURST_END_SEC;
    if (!inBurst && second % 10 !== 0) continue;

    const { workOrder, materialMaster } = orderAtSecond(second);
    let value = 174.0 + 3.0 * Math.sin(second / 900.0) + rng.gauss(0, 0.35);

    if (second >= EXCURSION_START_SEC && second < EXCURSION_END_SEC) {
      const progress =
        (second - EXCURSION_START_SEC) /
        (EXCURSION_END_SEC - EXCURSION_START_SEC);
      value += 58.2 * Math.sin(progress * Math.PI);
    }
    if (second === 8 * 3600 + 14 * 60 + 12) {
      value = 235.2;
    }

    docs.push({
      ts: new Date(startMs + second * 1000),
      metadata: {
        factory_id: CF_FACTORY_ID,
        prod_line_id: CF_PROD_LINE_ID,
        machine_id: CF_MACHINE_ID,
        area: CF_AREA,
        signal: "weld-zone-temp",
        unit: "degC",
        workOrder,
        materialMaster,
      },
      value: round(value, 2),
    });
  }

  // 2. laser-power & shield-gas-flow (2,880 docs each at 30s cadence)
  const secondarySignals = [
    ["laser-power", "W", 612.0, 6.5, 1.4, 1],
    ["shield-gas-flow", "L/min", 14.5, 0.45, 0.1, 2],
  ];
  for (const [signal, unit, base, swing, noise, precision] of secondarySignals) {
    for (let second = 0; second < 86400; second += 30) {
      const { workOrder, materialMaster } = orderAtSecond(second);
      const value =
        base + swing * Math.sin(second / 900.0) + rng.gauss(0, noise);
      docs.push({
        ts: new Date(startMs + second * 1000),
        metadata: {
          factory_id: CF_FACTORY_ID,
          prod_line_id: CF_PROD_LINE_ID,
          machine_id: CF_MACHINE_ID,
          area: CF_AREA,
          signal,
          unit,
          workOrder,
          materialMaster,
        },
        value: round(value, precision),
      });
    }
  }

  const chunkSize = 8000;
  for (let i = 0; i < docs.length; i += chunkSize) {
    await collection.insertMany(docs.slice(i, i + chunkSize), {
      ordered: false,
    });
  }
  return docs.length;
}

export async function ensureExcursionVectorIndex(db) {
  const collection = db.collection(CF_COLLECTIONS.EXCURSIONS);
  const definition = {
    fields: [
      {
        type: "vector",
        path: "signature",
        numDimensions: SIGNATURE_BINS,
        similarity: "cosine",
      },
      { type: "filter", path: "signal" },
      { type: "filter", path: "status" },
      { type: "filter", path: "materialMaster" },
    ],
  };

  try {
    const existing = await collection.listSearchIndexes().toArray();
    const found = existing.find((idx) => idx.name === CF_VECTOR_INDEX_NAME);
    if (found) {
      return {
        name: CF_VECTOR_INDEX_NAME,
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
      name: CF_VECTOR_INDEX_NAME,
      type: "vectorSearch",
      definition,
    });
    return {
      name: CF_VECTOR_INDEX_NAME,
      status: "BUILDING",
      queryable: false,
      created: true,
    };
  } catch (error) {
    const msg = String(error?.message || "");
    if (/already exists|IndexAlreadyExists/i.test(msg)) {
      return {
        name: CF_VECTOR_INDEX_NAME,
        status: "BUILDING",
        queryable: false,
        created: false,
      };
    }
    console.warn(
      `[connected-factory] Could not create vector index '${CF_VECTOR_INDEX_NAME}': ${msg}`
    );
    return {
      name: CF_VECTOR_INDEX_NAME,
      status: "UNAVAILABLE",
      queryable: false,
      error: msg,
    };
  }
}

async function ensureTelemetryReady(db, colMeta, dayStr, { force = false, log }) {
  const colName = CF_COLLECTIONS.TELEMETRY;
  const info = colMeta.get(colName);
  const { startDate, endDate } = dayBoundsMs(dayStr);

  if (!info) {
    log(`Creating time-series collection '${colName}' with 24h TTL...`);
    await db
      .createCollection(colName, {
        expireAfterSeconds: CF_TELEMETRY_TTL_SECONDS,
        timeseries: {
          timeField: "ts",
          metaField: "metadata",
          granularity: "minutes",
          bucketMaxSpanSeconds: 86400,
        },
      })
      .catch((err) => {
        if (!/NamespaceExists|already exists/i.test(String(err?.message))) {
          throw err;
        }
      });
  } else if (info.options?.expireAfterSeconds === undefined) {
    // Ensure the 24h TTL policy is active so telemetry never accumulates indefinitely.
    log(`Restoring 24h expireAfterSeconds (${CF_TELEMETRY_TTL_SECONDS}s) TTL on '${colName}'...`);
    await db
      .command({
        collMod: colName,
        expireAfterSeconds: CF_TELEMETRY_TTL_SECONDS,
      })
      .catch((err) => {
        console.warn(
          `[connected-factory] Could not set expireAfterSeconds on '${colName}': ${err?.message}`
        );
      });
  }

  const collection = db.collection(colName);
  await Promise.all([
    collection.createIndex({
      "metadata.machine_id": 1,
      "metadata.signal": 1,
      ts: 1,
    }),
    collection.createIndex({ "metadata.materialMaster": 1, ts: 1 }),
  ]);

  // Remove any leftover LTW-04 telemetry from prior days that hasn't hit TTL sweep yet
  await collection.deleteMany({
    "metadata.machine_id": CF_MACHINE_ID,
    $or: [{ ts: { $lt: startDate } }, { ts: { $gte: endDate } }],
  });

  if (force) {
    await collection.deleteMany({ "metadata.machine_id": CF_MACHINE_ID });
  }

  const todayCount = await collection.countDocuments({
    "metadata.machine_id": CF_MACHINE_ID,
    ts: { $gte: startDate, $lt: endDate },
  });

  if (todayCount === EXPECTED_TELEMETRY_COUNT) {
    return todayCount;
  }

  if (todayCount > 0) {
    await collection.deleteMany({
      "metadata.machine_id": CF_MACHINE_ID,
      ts: { $gte: startDate, $lt: endDate },
    });
  }

  log(
    `Populating ${EXPECTED_TELEMETRY_COUNT.toLocaleString()} LTW-04 telemetry readings for ${dayStr} (24h TTL active)...`
  );
  const telemetryRng = createRng(20260910);
  return insertTelemetryMeasurements(collection, dayStr, telemetryRng);
}

async function ensureMaterialsReady(db, { force = false, log }) {
  const collection = db.collection(CF_COLLECTIONS.MATERIALS);
  await collection.createIndex({ materialMaster: 1 }, { unique: true });

  if (force) {
    await collection.deleteMany({
      materialMaster: { $in: MATERIALS_SEED.map((m) => m.materialMaster) },
    });
  }

  const ops = MATERIALS_SEED.map((doc) => ({
    updateOne: {
      filter: { materialMaster: doc.materialMaster },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));
  const res = await collection.bulkWrite(ops, { ordered: false });
  if (res.upsertedCount > 0) {
    log(`Inserted ${res.upsertedCount} material specs into '${CF_COLLECTIONS.MATERIALS}'.`);
  }
  return MATERIALS_SEED.length;
}

async function ensureOrdersReady(db, dayStr, { log }) {
  const collection = db.collection(CF_COLLECTIONS.ORDERS);
  await Promise.all([
    collection.createIndex({ machine_id: 1, startedAt: 1 }),
    collection.createIndex(
      { workOrder: 1 },
      {
        unique: true,
        partialFilterExpression: { workOrder: { $type: "string" } },
      }
    ),
  ]);

  // Clean up any old date-stamped LTW-04 order IDs if present
  await collection.deleteMany({
    machine_id: CF_MACHINE_ID,
    orderType: "production",
    workOrder: { $nin: ORDER_IDS },
  });

  const docs = buildProductionOrders(dayStr);
  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { workOrder: doc.workOrder },
      update: { $set: doc },
      upsert: true,
    },
  }));
  const res = await collection.bulkWrite(ops, { ordered: false });
  if (res.upsertedCount > 0 || res.modifiedCount > 0) {
    log(`Synced ${docs.length} LTW-04 production order spans in '${CF_COLLECTIONS.ORDERS}' for ${dayStr}.`);
  }
  return docs.length;
}

async function ensureAlertsReady(db, dayStr, { log }) {
  const collection = db.collection(CF_COLLECTIONS.ALERTS);
  await Promise.all([
    collection.createIndex({ machine_id: 1, ts: 1 }),
    collection.createIndex({ status: 1, priority: 1, ts: 1 }),
    collection.createIndex(
      { alert_id: 1 },
      {
        unique: true,
        partialFilterExpression: { alert_id: { $type: "string" } },
      }
    ),
  ]);

  await collection.deleteMany({
    machine_id: CF_MACHINE_ID,
    source: "edge-weld-monitor",
    alert_id: { $nin: ALERT_IDS },
  });

  const docs = buildAlerts(dayStr);
  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { alert_id: doc.alert_id },
      update: { $set: doc },
      upsert: true,
    },
  }));
  const res = await collection.bulkWrite(ops, { ordered: false });
  if (res.upsertedCount > 0 || res.modifiedCount > 0) {
    log(`Synced ${docs.length} LTW-04 alerts in '${CF_COLLECTIONS.ALERTS}' for ${dayStr}.`);
  }
  return docs.length;
}

async function ensureExcursionsReady(db, { force = false, log }) {
  const collection = db.collection(CF_COLLECTIONS.EXCURSIONS);
  await Promise.all([
    collection.createIndex({ excursionId: 1 }, { unique: true }),
    collection.createIndex({ machine_id: 1, start: 1 }),
  ]);

  const excursionRng = createRng(20260914);
  const docs = buildExcursions(excursionRng);

  if (force) {
    await collection.deleteMany({ signal: DEFAULT_SIGNAL });
  }

  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { excursionId: doc.excursionId },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));
  const res = await collection.bulkWrite(ops, { ordered: false });
  if (res.upsertedCount > 0) {
    log(`Inserted ${res.upsertedCount} fleet excursions into '${CF_COLLECTIONS.EXCURSIONS}'.`);
  }
  return docs.length;
}

async function inspectDatabaseState(db, dayStr = getCurrentDemoDay()) {
  const existingCols = await db.listCollections().toArray();
  const colMeta = new Map(existingCols.map((c) => [c.name, c]));

  const telemetryInfo = colMeta.get(CF_COLLECTIONS.TELEMETRY);
  const telemetryMissingTtl =
    Boolean(telemetryInfo) &&
    telemetryInfo.options?.expireAfterSeconds === undefined;

  const anchorAlertTs = new Date(`${dayStr}T08:14:12Z`);

  const [
    materialsCount,
    ordersCount,
    alertsCount,
    excursionsCount,
    telemetryAnchorDoc,
    searchIndexes,
  ] = await Promise.all([
    colMeta.has(CF_COLLECTIONS.MATERIALS)
      ? db
          .collection(CF_COLLECTIONS.MATERIALS)
          .countDocuments(
            { materialMaster: { $in: MATERIALS_SEED.map((m) => m.materialMaster) } },
            { limit: 3 }
          )
      : Promise.resolve(0),
    colMeta.has(CF_COLLECTIONS.ORDERS)
      ? db
          .collection(CF_COLLECTIONS.ORDERS)
          .countDocuments(
            { machine_id: CF_MACHINE_ID, orderType: "production", demoDay: dayStr },
            { limit: 5 }
          )
      : Promise.resolve(0),
    colMeta.has(CF_COLLECTIONS.ALERTS)
      ? db
          .collection(CF_COLLECTIONS.ALERTS)
          .countDocuments(
            { machine_id: CF_MACHINE_ID, source: "edge-weld-monitor", demoDay: dayStr },
            { limit: 9 }
          )
      : Promise.resolve(0),
    colMeta.has(CF_COLLECTIONS.EXCURSIONS)
      ? db
          .collection(CF_COLLECTIONS.EXCURSIONS)
          .countDocuments({ signal: DEFAULT_SIGNAL }, { limit: 24 })
      : Promise.resolve(0),
    colMeta.has(CF_COLLECTIONS.TELEMETRY)
      ? db.collection(CF_COLLECTIONS.TELEMETRY).findOne(
          {
            "metadata.machine_id": CF_MACHINE_ID,
            "metadata.signal": DEFAULT_SIGNAL,
            ts: anchorAlertTs,
          },
          { projection: { _id: 1 } }
        )
      : Promise.resolve(null),
    colMeta.has(CF_COLLECTIONS.EXCURSIONS)
      ? db
          .collection(CF_COLLECTIONS.EXCURSIONS)
          .listSearchIndexes()
          .toArray()
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  let vectorIndex = {
    name: CF_VECTOR_INDEX_NAME,
    status: "MISSING",
    queryable: false,
  };
  const idx = searchIndexes.find((item) => item.name === CF_VECTOR_INDEX_NAME);
  if (idx) {
    vectorIndex = {
      name: CF_VECTOR_INDEX_NAME,
      status: idx.status || (idx.queryable ? "READY" : "BUILDING"),
      queryable: Boolean(idx.queryable),
    };
  }

  const dataSeeded =
    materialsCount >= 3 &&
    ordersCount >= 5 &&
    alertsCount >= 9 &&
    excursionsCount >= 24 &&
    Boolean(telemetryAnchorDoc);

  const fullyProvisioned =
    dataSeeded &&
    !telemetryMissingTtl &&
    vectorIndex.status !== "MISSING";

  return {
    dayStr,
    colMeta,
    telemetryMissingTtl,
    dataSeeded,
    fullyProvisioned,
    vectorIndex,
    scopeCounts: {
      [CF_COLLECTIONS.TELEMETRY]: telemetryAnchorDoc ? EXPECTED_TELEMETRY_COUNT : 0,
      [CF_COLLECTIONS.ALERTS]: alertsCount,
      [CF_COLLECTIONS.ORDERS]: ordersCount,
      [CF_COLLECTIONS.MATERIALS]: materialsCount,
      [CF_COLLECTIONS.EXCURSIONS]: excursionsCount,
    },
  };
}

export async function getConnectedFactoryStatus() {
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required but not set");
  }
  const client = await getMongoClientPromise();
  const db = client.db(dbName);
  const dayStr = getCurrentDemoDay();
  const { startDate, endDate } = dayBoundsMs(dayStr);

  const state = await inspectDatabaseState(db, dayStr);
  const { colMeta } = state;

  const sampleQueries = {
    [CF_COLLECTIONS.TELEMETRY]: () =>
      db.collection(CF_COLLECTIONS.TELEMETRY).findOne(
        {
          "metadata.machine_id": CF_MACHINE_ID,
          ts: { $gte: startDate, $lt: endDate },
        },
        { projection: { _id: 0 }, sort: { ts: 1 } }
      ),
    [CF_COLLECTIONS.ALERTS]: () =>
      db.collection(CF_COLLECTIONS.ALERTS).findOne(
        { machine_id: CF_MACHINE_ID, source: "edge-weld-monitor" },
        { projection: { _id: 0, demoDay: 0 }, sort: { ts: 1 } }
      ),
    [CF_COLLECTIONS.ORDERS]: () =>
      db.collection(CF_COLLECTIONS.ORDERS).findOne(
        { machine_id: CF_MACHINE_ID, orderType: "production" },
        { projection: { _id: 0, demoDay: 0 }, sort: { startedAt: 1 } }
      ),
    [CF_COLLECTIONS.MATERIALS]: () =>
      db.collection(CF_COLLECTIONS.MATERIALS).findOne(
        {},
        { projection: { _id: 0, _seedLockUntil: 0 }, sort: { materialMaster: 1 } }
      ),
  };

  const orderedNames = [
    CF_COLLECTIONS.TELEMETRY,
    CF_COLLECTIONS.ALERTS,
    CF_COLLECTIONS.ORDERS,
    CF_COLLECTIONS.MATERIALS,
    CF_COLLECTIONS.EXCURSIONS,
  ];

  const collections = await Promise.all(
    orderedNames.map(async (name) => {
      const info = colMeta.get(name);
      if (!info) {
        return {
          name,
          count: 0,
          scopeCount: 0,
          timeseries: false,
          sample: null,
        };
      }
      const col = db.collection(name);
      const [count, sample] = await Promise.all([
        col.estimatedDocumentCount(),
        sampleQueries[name] ? sampleQueries[name]() : Promise.resolve(null),
      ]);
      return {
        name,
        count,
        scopeCount: state.scopeCounts[name] ?? count,
        timeseries:
          info.type === "timeseries" || Boolean(info.options?.timeseries),
        sample,
      };
    })
  );

  const provider = process.env.CHAT_PROVIDER || "bedrock";
  const agentReady =
    provider === "grove"
      ? Boolean(process.env.GROVE_API_KEY)
      : Boolean(process.env.AWS_REGION || process.env.COMPLETION_MODEL);

  return {
    demoDay: dayStr,
    seeded: state.dataSeeded,
    fullyProvisioned: state.fullyProvisioned,
    initializing: Boolean(activeInitPromise),
    initError: lastInitError,
    collections,
    vectorIndex: state.vectorIndex,
    agent: {
      ok: agentReady,
      provider,
      text: agentReady ? "agent ready" : `agent: check ${provider} config`,
    },
  };
}

/**
 * Idempotently ensure Connected Factory master data, indexes, vector index,
 * and today's TTL-windowed LTW-04 operational slice are ready.
 */
export async function seedConnectedFactoryData({
  force = false,
  onProgress,
} = {}) {
  const log = (msg) => {
    if (onProgress) onProgress(msg);
  };
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required but not set");
  }
  const dayStr = getCurrentDemoDay();

  if (!force && verifiedDayInProcess === dayStr) {
    return { skipped: true, demoDay: dayStr, reason: "already_verified_in_process" };
  }

  const client = await getMongoClientPromise();
  const db = client.db(dbName);

  const initialState = await inspectDatabaseState(db, dayStr);
  if (!force && initialState.fullyProvisioned) {
    verifiedDayInProcess = dayStr;
    lastInitError = null;
    log(`Connected Factory data and indexes are already provisioned for ${dayStr}.`);
    return {
      skipped: true,
      demoDay: dayStr,
      vectorIndex: initialState.vectorIndex,
    };
  }

  await ensureMaterialsReady(db, { force: false, log });

  const now = new Date();
  const leaseUntil = new Date(now.getTime() + LOCK_LEASE_MS);
  const lockAcquired = await db.collection(CF_COLLECTIONS.MATERIALS).findOneAndUpdate(
    {
      materialMaster: "MAT-CU-020",
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
    log("Another instance is currently syncing Connected Factory data; skipping duplicate run.");
    return { skipped: true, demoDay: dayStr, reason: "locked_by_peer" };
  }

  try {
    const freshCols = await db.listCollections().toArray();
    const colMeta = new Map(freshCols.map((c) => [c.name, c]));

    const materialsCount = await ensureMaterialsReady(db, { force, log });
    const ordersCount = await ensureOrdersReady(db, dayStr, { log });
    const alertsCount = await ensureAlertsReady(db, dayStr, { log });
    const telemetryCount = await ensureTelemetryReady(db, colMeta, dayStr, {
      force,
      log,
    });
    const excursionsCount = await ensureExcursionsReady(db, { force, log });

    log(`Ensuring Atlas Vector Search index '${CF_VECTOR_INDEX_NAME}' on '${CF_COLLECTIONS.EXCURSIONS}'...`);
    const vectorIndex = await ensureExcursionVectorIndex(db);

    const liveSig = await db
      .collection(CF_COLLECTIONS.TELEMETRY)
      .aggregate(
        signaturePipeline(
          CF_MACHINE_ID,
          new Date(`${dayStr}T08:12:30Z`),
          new Date(`${dayStr}T08:16:30Z`)
        )
      )
      .toArray();

    verifiedDayInProcess = dayStr;
    lastInitError = null;

    return {
      skipped: false,
      demoDay: dayStr,
      counts: {
        [CF_COLLECTIONS.TELEMETRY]: telemetryCount,
        [CF_COLLECTIONS.ALERTS]: alertsCount,
        [CF_COLLECTIONS.ORDERS]: ordersCount,
        [CF_COLLECTIONS.MATERIALS]: materialsCount,
        [CF_COLLECTIONS.EXCURSIONS]: excursionsCount,
      },
      liveSignatureBins: liveSig[0]?.signature?.length || 0,
      livePeakTempC: liveSig[0]?.peakTempC || null,
      vectorIndex,
    };
  } catch (error) {
    lastInitError = error?.message || "Initialization failed";
    throw error;
  } finally {
    await db
      .collection(CF_COLLECTIONS.MATERIALS)
      .updateOne(
        { materialMaster: "MAT-CU-020" },
        { $unset: { _seedLockUntil: "" } }
      )
      .catch(() => {});
  }
}

/**
 * Fast, single-flight guard called at startup and before query/signature/agent
 * execution: 0ms once today's UTC day is verified in memory, ~1.2s on rollover.
 */
export function ensureConnectedFactoryCurrentDay({ force = false } = {}) {
  const dayStr = getCurrentDemoDay();
  if (!force && verifiedDayInProcess === dayStr) {
    return Promise.resolve({ skipped: true, demoDay: dayStr });
  }
  if (activeInitPromise) {
    return activeInitPromise;
  }

  activeInitPromise = seedConnectedFactoryData({
    force,
    onProgress: (msg) => console.log(`[connected-factory] ${msg}`),
  }).finally(() => {
    activeInitPromise = null;
  });

  return activeInitPromise;
}

export function triggerConnectedFactoryBackgroundInit({ force = false } = {}) {
  return ensureConnectedFactoryCurrentDay({ force }).catch((err) => {
    console.error(
      "[connected-factory] Background init error:",
      err?.message || err
    );
    return { error: err?.message || "Background init failed" };
  });
}
