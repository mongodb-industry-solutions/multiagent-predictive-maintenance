const PROXY_ROOT = "/api/factory-simulator";

export class FactoryApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "FactoryApiError";
    this.status = status;
  }
}

function normalizeTimestamp(value) {
  if (typeof value !== "string" || !value) return value;
  if (/([zZ]|[+-]\d\d:\d\d)$/.test(value)) return value;
  return `${value}Z`;
}

function normalizeEvent(event) {
  return {
    ...event,
    ts: normalizeTimestamp(event?.ts || event?.ts_iso),
    metrics:
      event?.metrics && typeof event.metrics === "object" ? event.metrics : {},
  };
}

function normalizeUnit(unit) {
  return {
    ...unit,
    started_at: normalizeTimestamp(unit?.started_at),
    completed_at: normalizeTimestamp(unit?.completed_at),
    cells: Array.isArray(unit?.cells) ? unit.cells : [],
    process:
      unit?.process && typeof unit.process === "object" ? unit.process : {},
    order: unit?.order && typeof unit.order === "object" ? unit.order : {},
  };
}

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });
  const result = query.toString();
  return result ? `?${result}` : "";
}

async function factoryFetch(path, options = {}) {
  const response = await fetch(`${PROXY_ROOT}/${path.replace(/^\/+/, "")}`, {
    cache: "no-store",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.error || payload?.detail;
    const message =
      typeof detail === "string"
        ? detail.replace(/^['"]|['"]$/g, "")
        : `Factory simulator request failed (${response.status})`;
    throw new FactoryApiError(message, response.status);
  }

  return payload && typeof payload === "object" ? payload : {};
}

export async function fetchFactoryStatus() {
  return factoryFetch("api/status");
}

export async function fetchActiveOrders() {
  const data = await factoryFetch("api/orders");
  const summaries = Array.isArray(data.active_orders) ? data.active_orders : [];
  const details = await Promise.all(
    summaries.map(async (summary) => {
      if (!summary?.order_id) return summary;
      try {
        const detail = await factoryFetch(
          `api/orders/${encodeURIComponent(summary.order_id)}`
        );
        return { ...summary, ...detail };
      } catch {
        return summary;
      }
    })
  );
  return details.sort((a, b) => {
    const aTime = Date.parse(a?.created_at || "");
    const bTime = Date.parse(b?.created_at || "");
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
    return String(b?.order_id || "").localeCompare(String(a?.order_id || ""));
  });
}

export async function fetchMachineEvents({
  orderId,
  station,
  limit = 80,
} = {}) {
  const data = await factoryFetch(
    `api/machines/events${queryString({
      order_id: orderId,
      station,
      limit,
    })}`
  );
  return (Array.isArray(data.events) ? data.events : []).map(normalizeEvent);
}

export async function fetchProductionUnits({ orderId, limit = 30 } = {}) {
  const data = await factoryFetch(
    `api/production-units${queryString({ limit })}`
  );
  return (Array.isArray(data.production_units)
    ? data.production_units
    : []
  )
    .map(normalizeUnit)
    .filter((unit) => !orderId || unit.order_id === orderId);
}

export async function fetchFactoryAlerts({ orderId, limit = 80 } = {}) {
  const data = await factoryFetch(
    `api/alerts${queryString({ order_id: orderId, limit })}`
  );
  return (Array.isArray(data.alerts) ? data.alerts : []).map((alert) => ({
    ...alert,
    timestamp: normalizeTimestamp(alert.timestamp),
  }));
}

export async function fetchFactoryAnalytics({ orderId, limit = 100 } = {}) {
  const data = await factoryFetch(
    `api/metrics/overview${queryString({ order_id: orderId, limit })}`
  );
  return {
    kpis: data.kpis || {},
    yield: data.yield || { pass: 0, fail: 0 },
    throughput: Array.isArray(data.throughput) ? data.throughput : [],
    cycle_time_trend: Array.isArray(data.cycle_time_trend)
      ? data.cycle_time_trend
      : [],
    grade_distribution: data.grade_distribution || {},
    defects_by_station: Array.isArray(data.defects_by_station)
      ? data.defects_by_station
      : [],
    pipelines: data.pipelines || {},
  };
}

export async function fetchScadaState(orderId) {
  if (!orderId) return null;
  try {
    return await factoryFetch(
      `scada/${encodeURIComponent(orderId)}/api/state`
    );
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function fetchThresholds(orderId) {
  if (!orderId) return null;
  try {
    return await factoryFetch(
      `api/machines/laser-welding/thresholds${queryString({
        order_id: orderId,
      })}`
    );
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function fetchRemoteSnapshot(orderId) {
  const [status, activeOrders] = await Promise.all([
    fetchFactoryStatus(),
    fetchActiveOrders(),
  ]);
  const effectiveOrderId =
    orderId && activeOrders.some((order) => order.order_id === orderId)
      ? orderId
      : activeOrders[0]?.order_id || null;

  const [events, productionUnits, alerts, analytics, scadaState, thresholds] =
    await Promise.all([
      fetchMachineEvents({ orderId: effectiveOrderId }),
      fetchProductionUnits({ orderId: effectiveOrderId }),
      fetchFactoryAlerts({ orderId: effectiveOrderId }),
      fetchFactoryAnalytics({ orderId: effectiveOrderId }),
      fetchScadaState(effectiveOrderId),
      fetchThresholds(effectiveOrderId),
    ]);

  return {
    status,
    activeOrders,
    selectedOrder:
      activeOrders.find((order) => order.order_id === effectiveOrderId) || null,
    scadaState,
    events,
    productionUnits,
    alerts,
    analytics,
    thresholds,
  };
}

export function createRemoteOrder(input) {
  return factoryFetch("api/orders/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function stopRemoteOrder(orderId) {
  return factoryFetch("api/orders/stop", {
    method: "POST",
    body: JSON.stringify({ order_id: orderId }),
  });
}

export function setRemoteThresholds(orderId, values) {
  return factoryFetch("api/machines/laser-welding/thresholds", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      temperature_threshold: Number(values.temperature_threshold),
      vibration_threshold: Number(values.vibration_threshold),
    }),
  });
}

export function sendRemoteMetrics(orderId, values) {
  return factoryFetch("api/machines/laser-welding/metrics", {
    method: "POST",
    body: JSON.stringify({
      order_id: orderId,
      temperature: Number(values.temperature),
      vibration: Number(values.vibration),
    }),
  });
}
