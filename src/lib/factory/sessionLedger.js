/**
 * Client-side ledger of machine events observed for the session's orders.
 *
 * The Leafy Factory SCADA state only exposes the latest event per station and
 * the simulator's persisted events/units may lag or be unavailable, so the app
 * records every event it sees while an order runs and derives completed
 * production units from them. Stations cycle every ~200 ms while a frame is
 * sampled every few hundred ms, so telemetry per batch is partial; the frame's
 * batch counter is used to know how many batches actually completed.
 * Store data, when present, takes precedence.
 */

const MAX_EVENTS_PER_ORDER = 1500;
const FINAL_STATION = "Pack EOL Test";
const PROCESS_KEYS = {
  "Z-Fold Stacking": "z_fold",
  "Module Pre-Assembly": "module_assembly",
  "Laser Tab Welding": "laser_welding",
  "Ultrasonic Busbar Welding": "busbar_welding",
  "TIM Dispensing & Cooling Plate Assembly": "tim_dispensing",
  "Pouch / Pack Sealing": "pack_sealing",
  "Helium Leak Test": "leak_test",
  [FINAL_STATION]: "eol_test",
};

function normalizeTimestamp(value) {
  if (typeof value !== "string" || !value) return value;
  return /([zZ]|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`;
}

function time(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function eventKey(event) {
  return (
    event.event_id ||
    `${event.order_id}-${event.batch_id}-${event.station}-${event.ts}`
  );
}

/** Events currently visible in a SCADA state frame. */
export function scadaEvents(scadaState) {
  return Object.values(scadaState?.last_results || {})
    .filter((event) => event && event.station)
    .map((event) => ({
      ...event,
      ts: normalizeTimestamp(event.ts || event.ts_iso),
      metrics:
        event.metrics && typeof event.metrics === "object" ? event.metrics : {},
    }));
}

/**
 * Batches completed according to a SCADA frame. The frame's `batch_id` is the
 * batch currently in flight (or the next one once the run ends), so everything
 * before it is done; a final-station event for a batch also proves completion.
 */
export function scadaCompletedBatches(scadaState, quantity) {
  if (!scadaState) return 0;
  const current = Number(scadaState.batch_id) || 0;
  const viaEol = scadaEvents(scadaState).reduce(
    (max, event) =>
      event.station === FINAL_STATION
        ? Math.max(max, Number(event.batch_id) || 0)
        : max,
    0
  );
  const completed = Math.max(current - 1, viaEol, 0);
  return quantity ? Math.min(completed, quantity) : completed;
}

/** Union of two event lists, de-duplicated, newest first, bounded. */
export function mergeEvents(existing = [], incoming = []) {
  const byKey = new Map();
  [...incoming, ...existing].forEach((event) => {
    const key = eventKey(event);
    if (!byKey.has(key)) byKey.set(key, event);
  });
  return [...byKey.values()]
    .sort((a, b) => time(b.ts) - time(a.ts))
    .slice(0, MAX_EVENTS_PER_ORDER);
}

/**
 * Production units for every completed batch of `order`. A batch counts as
 * complete when the order's progress counter (`completed_units`, maintained
 * from SCADA frames) has passed it or its final-station event was observed.
 * Units built from partial telemetry carry `telemetry: "partial"` and an
 * unknown pass/fail outcome (`final_status: "complete"`).
 */
export function buildUnitsFromEvents(order, events = []) {
  if (!order?.order_id) return [];
  const batches = new Map();
  const cellEvents = [];
  events.forEach((event) => {
    const batchId = Number(event.batch_id);
    if (event.station === "Cell Screening" && event.metrics?.cell_id != null) {
      cellEvents.push(event);
    }
    if (batchId > 0) {
      if (!batches.has(batchId)) batches.set(batchId, []);
      batches.get(batchId).push(event);
    }
  });

  const completedCount = Math.min(
    Number(order.completed_units) || 0,
    Number(order.quantity) || Infinity
  );
  for (let batchId = 1; batchId <= completedCount; batchId += 1) {
    if (!batches.has(batchId)) batches.set(batchId, []);
  }

  const units = [];
  batches.forEach((batchEvents, batchId) => {
    const sorted = [...batchEvents].sort((a, b) => time(a.ts) - time(b.ts));
    const eol = sorted.find((event) => event.station === FINAL_STATION);
    if (!eol && batchId > completedCount) return;
    const byStation = Object.fromEntries(
      sorted.map((event) => [event.station, event])
    );
    const cellIds = Array.isArray(eol?.metrics?.cell_ids)
      ? eol.metrics.cell_ids
      : [];
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    units.push({
      order_id: order.order_id,
      batch_id: batchId,
      started_at: first?.ts ?? null,
      completed_at: eol?.ts ?? last?.ts ?? null,
      cycle_time_sec: eol
        ? Math.round(((time(eol.ts) - time(first.ts)) / 1000) * 100) / 100
        : null,
      final_status: eol
        ? eol.metrics?.pass === false
          ? "fail"
          : "pass"
        : "complete",
      telemetry: eol ? "complete" : "partial",
      stations_observed: sorted.length,
      order: {
        id: order.mes_order_id,
        order_id: order.order_id,
        product_id: order.product_id,
        product_desc: order.product_desc,
        quantity: order.quantity,
        customer: order.customer,
        customer_po: order.customer_po,
        delivery_date: order.delivery_date,
        sales_order: order.sales_order,
      },
      cells: cellIds.map((cellId) => {
        const screened = cellEvents.find(
          (event) => event.metrics.cell_id === cellId
        );
        return screened
          ? {
              cell_id: cellId,
              ocv_v: screened.metrics.ocv_v,
              ir_milliohm: screened.metrics.ir_milliohm,
              grade: screened.metrics.grade,
              screened_at: screened.ts,
            }
          : { cell_id: cellId };
      }),
      process: Object.fromEntries(
        Object.entries(PROCESS_KEYS)
          .filter(([station]) => byStation[station])
          .map(([station, key]) => [
            key,
            { timestamp: byStation[station].ts, ...byStation[station].metrics },
          ])
      ),
      event_ids: sorted.map((event) => event.event_id).filter(Boolean),
    });
  });

  return units.sort((a, b) => b.batch_id - a.batch_id);
}

/** Store units win over session-derived ones for the same batch. */
export function mergeUnits(storeUnits = [], sessionUnits = []) {
  const byBatch = new Map();
  [...storeUnits, ...sessionUnits].forEach((unit) => {
    const key = `${unit.order_id}-${unit.batch_id}`;
    if (!byBatch.has(key)) byBatch.set(key, unit);
  });
  // Newest batch first; partial units may lack timestamps, so batch order wins.
  return [...byBatch.values()].sort((a, b) =>
    a.order_id === b.order_id
      ? Number(b.batch_id) - Number(a.batch_id)
      : time(b.completed_at) - time(a.completed_at)
  );
}
