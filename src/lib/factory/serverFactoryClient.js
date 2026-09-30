import "server-only";

const MAX_LIMIT = 100;
const REQUEST_TIMEOUT_MS = 12000;

export class ServerFactoryApiError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = "ServerFactoryApiError";
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

function errorMessage(payload, fallback) {
  const detail = payload?.detail || payload?.error;
  if (typeof detail === "string") return detail.replace(/^['"]|['"]$/g, "");
  if (Array.isArray(detail)) {
    const message = detail
      .map((entry) => entry?.msg)
      .filter(Boolean)
      .join(", ");
    if (message) return message;
  }
  return fallback;
}

function getBaseUrl() {
  const configured = process.env.FACTORY_SIMULATOR_API_URL;
  if (!configured) {
    throw new ServerFactoryApiError(
      "Leafy Factory is not configured. Set FACTORY_SIMULATOR_API_URL.",
      503
    );
  }
  try {
    return new URL(configured.endsWith("/") ? configured : `${configured}/`);
  } catch {
    throw new ServerFactoryApiError(
      "FACTORY_SIMULATOR_API_URL is invalid.",
      500
    );
  }
}

async function factoryRequest(
  path,
  { params = {}, method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS } = {}
) {
  const url = new URL(path.replace(/^\/+/, ""), getBaseUrl());
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new ServerFactoryApiError(
      error?.name === "TimeoutError"
        ? "Leafy Factory request timed out."
        : "Leafy Factory is unavailable.",
      error?.name === "TimeoutError" ? 504 : 502
    );
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) {
    throw new ServerFactoryApiError(
      errorMessage(payload, `Leafy Factory returned ${response.status}.`),
      response.status
    );
  }
  return payload && typeof payload === "object" ? payload : {};
}

export function getFactoryStatus() {
  return factoryRequest("api/status");
}

export async function listActiveOrderSummaries() {
  const data = await factoryRequest("api/orders");
  return Array.isArray(data.active_orders) ? data.active_orders : [];
}

export async function listActiveOrders() {
  const summaries = await listActiveOrderSummaries();
  return Promise.all(
    summaries.map(async (summary) => {
      if (!summary?.order_id) return summary;
      try {
        const detail = await getOrderDetails(summary.order_id);
        return { ...summary, ...detail };
      } catch {
        return summary;
      }
    })
  );
}

export function getOrderDetails(orderId) {
  return factoryRequest(`api/orders/${encodeURIComponent(orderId)}`);
}

export async function getMachineEvents({
  orderId,
  station,
  limit = 40,
} = {}) {
  const data = await factoryRequest("api/machines/events", {
    params: {
      order_id: orderId,
      station,
      limit: Math.min(Math.max(Number(limit) || 40, 1), MAX_LIMIT),
    },
  });
  return (Array.isArray(data.events) ? data.events : []).map(normalizeEvent);
}

export async function getProductionUnits({ orderId, limit = 30 } = {}) {
  const data = await factoryRequest("api/production-units", {
    params: {
      limit: Math.min(Math.max(Number(limit) || 30, 1), MAX_LIMIT),
    },
  });
  return (Array.isArray(data.production_units)
    ? data.production_units
    : []
  )
    .map(normalizeUnit)
    .filter((unit) => !orderId || unit.order_id === orderId);
}

export async function getFactoryAlerts({ orderId, limit = 40 } = {}) {
  const data = await factoryRequest("api/alerts", {
    params: {
      order_id: orderId,
      limit: Math.min(Math.max(Number(limit) || 40, 1), MAX_LIMIT),
    },
  });
  return (Array.isArray(data.alerts) ? data.alerts : []).map((alert) => ({
    ...alert,
    timestamp: normalizeTimestamp(alert?.timestamp),
  }));
}

export async function getFactoryMetrics({ orderId, limit = 100 } = {}) {
  const data = await factoryRequest("api/metrics/overview", {
    params: {
      order_id: orderId,
      limit: Math.min(Math.max(Number(limit) || 100, 1), MAX_LIMIT),
    },
  });
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
  };
}

export function getWeldingThresholds(orderId) {
  return factoryRequest("api/machines/laser-welding/thresholds", {
    params: { order_id: orderId },
  });
}

export function getScadaState(orderId) {
  return factoryRequest(
    `scada/${encodeURIComponent(orderId)}/api/state`
  );
}

export function createFactoryOrder(input) {
  return factoryRequest("api/orders/create", {
    method: "POST",
    body: input,
    timeoutMs: 75000,
  });
}
