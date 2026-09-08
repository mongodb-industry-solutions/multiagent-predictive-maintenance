const MAX_CONTEXT_BYTES = 180000;

function take(value, limit) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

function serializable(value, fallback = null) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function makeContext(snapshot, source, compact = false) {
  return {
    source,
    captured_at: new Date().toISOString(),
    status: serializable(snapshot?.status, {}),
    active_orders: serializable(take(snapshot?.activeOrders, 12), []),
    orders: serializable(take(snapshot?.orders, compact ? 8 : 20), []),
    selected_order: serializable(snapshot?.selectedOrder, null),
    scada_state: serializable(snapshot?.scadaState, null),
    live_production_unit: serializable(snapshot?.liveProductionUnit, null),
    events: serializable(take(snapshot?.events, compact ? 30 : 80), []),
    production_units: serializable(
      take(snapshot?.productionUnits, compact ? 12 : 30),
      []
    ),
    alerts: serializable(take(snapshot?.alerts, compact ? 20 : 40), []),
    analytics: serializable(snapshot?.analytics, {}),
    thresholds: serializable(snapshot?.thresholds, {}),
  };
}

export function buildFactoryChatContext(snapshot, source) {
  const context = makeContext(snapshot, source);
  if (JSON.stringify(context).length <= MAX_CONTEXT_BYTES) return context;
  return makeContext(snapshot, source, true);
}

export function normalizeFactoryChatContext(value) {
  if (!value || typeof value !== "object") return null;
  const source = value.source === "local" ? "local" : "leafy";
  const context = {
    ...value,
    source,
  };
  try {
    if (JSON.stringify(context).length > MAX_CONTEXT_BYTES) return null;
  } catch {
    return null;
  }
  return context;
}
