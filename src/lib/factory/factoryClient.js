const PROXY_ROOT = "/api/factory-simulator";
// The simulator rejects limit > 100 with a 422, and it does not filter by
// order_id server-side, so units are filtered client-side after the fetch.
const MAX_PRODUCTION_UNITS_LIMIT = 100;

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
    `api/production-units${queryString({
      limit: Math.min(limit, MAX_PRODUCTION_UNITS_LIMIT),
    })}`
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

/**
 * Fetches factory status, the live order list, and — only when an order is
 * selected — that order's events, units, alerts, analytics, SCADA state, and
 * thresholds. Which orders are shown is decided by the caller (session list).
 */
export async function fetchRemoteSnapshot(orderId, onPartial) {
  if (!orderId) {
    const [status, activeOrders, analytics] = await Promise.all([
      fetchFactoryStatus(),
      fetchActiveOrders(),
      fetchFactoryAnalytics({}),
    ]);
    return {
      status,
      activeOrders,
      scadaState: null,
      events: [],
      productionUnits: [],
      alerts: [],
      analytics,
      thresholds: null,
    };
  }

  // The list/status request is independent of the selected order's detail
  // requests. Start all of them together so an order switch waits only for
  // the slowest endpoint, rather than for two consecutive request groups.
  const detailPromises = [
    fetchMachineEvents({ orderId }).then((value) => {
      onPartial?.({ events: value });
      return value;
    }),
    fetchProductionUnits({ orderId, limit: MAX_PRODUCTION_UNITS_LIMIT }).then(
      (value) => {
        onPartial?.({ productionUnits: value });
        return value;
      }
    ),
    fetchFactoryAlerts({ orderId }).then((value) => {
      onPartial?.({ alerts: value });
      return value;
    }),
    fetchFactoryAnalytics({ orderId }).then((value) => {
      onPartial?.({ analytics: value });
      return value;
    }),
    // Remains available after the run stops (404 → null otherwise).
    fetchScadaState(orderId).then((value) => {
      onPartial?.({ scadaState: value });
      return value;
    }),
    fetchThresholds(orderId).then((value) => {
      onPartial?.({ thresholds: value });
      return value;
    }),
  ];
  const [status, activeOrders] = await Promise.all([
    fetchFactoryStatus(),
    fetchActiveOrders(),
  ]);
  onPartial?.({ status, activeOrders });

  const [
    events,
    productionUnits,
    alerts,
    analytics,
    scadaState,
    thresholds,
  ] = await Promise.all(detailPromises);

  return {
    status,
    activeOrders,
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
