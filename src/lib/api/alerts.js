// Alerts API
import {
  DEFAULT_SENSOR_READINGS,
  DEFAULT_THRESHOLDS,
} from "@/lib/factory/constants";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

function finiteNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function normalizeAlertTimestamp(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === "object" && value.$date) {
    const parsed = new Date(value.$date);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return new Date().toISOString();
    const withZone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(
      trimmed
    )
      ? `${trimmed}Z`
      : trimmed;
    const parsed = new Date(withZone);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

export function computeAlertSeverity(value, threshold, fallback = "warning") {
  const numericValue = Number(value);
  const numericThreshold = Number(threshold);
  if (
    Number.isFinite(numericValue) &&
    Number.isFinite(numericThreshold) &&
    numericThreshold > 0
  ) {
    return numericValue >= numericThreshold * 1.5 ? "critical" : "warning";
  }
  return fallback === "critical" ? "critical" : "warning";
}

export function buildUnsAlertKey({ orderId, origin, metric, timestamp }) {
  return [
    orderId || origin || "demo",
    metric || "alert",
    timestamp || "",
  ].join(":");
}

/**
 * Normalize an alert coming from UNS in Action or Predictive Maintenance
 * (either Leafy Factory or Local simulation) into the shared `alerts` schema.
 */
export function buildUnifiedAlert(input = {}, context = {}) {
  const merged = { ...context, ...input };
  const isVibration = merged.metric
    ? merged.metric === "vibration"
    : merged.err_code === "E13";
  const metric = isVibration ? "vibration" : "temperature";
  const err_code = isVibration ? "E13" : "E12";
  const err_name = isVibration ? "High vibration" : "High temperature";

  const fallbackThresholds = merged.thresholds || DEFAULT_THRESHOLDS;
  const threshold = finiteNumber(
    merged.threshold ?? merged.details?.threshold,
    isVibration
      ? finiteNumber(
          fallbackThresholds.vibration_threshold,
          DEFAULT_THRESHOLDS.vibration_threshold
        )
      : finiteNumber(
          fallbackThresholds.temperature_threshold,
          DEFAULT_THRESHOLDS.temperature_threshold
        )
  );

  const temperature = finiteNumber(
    merged.details?.temperature,
    isVibration
      ? finiteNumber(merged.temperature, DEFAULT_SENSOR_READINGS.temperature)
      : finiteNumber(
          merged.value ?? merged.temperature,
          DEFAULT_SENSOR_READINGS.temperature
        )
  );

  const vibration = finiteNumber(
    merged.details?.vibration,
    isVibration
      ? finiteNumber(
          merged.value ?? merged.vibration,
          DEFAULT_SENSOR_READINGS.vibration
        )
      : finiteNumber(merged.vibration, DEFAULT_SENSOR_READINGS.vibration)
  );

  const value = finiteNumber(
    merged.value,
    isVibration ? vibration : temperature
  );

  const severity =
    merged.severity === "critical" || merged.severity === "warning"
      ? merged.severity
      : computeAlertSeverity(value, threshold);

  const isoTs = normalizeAlertTimestamp(merged.timestamp || merged.ts);
  const order_id = merged.order_id || merged.orderId || undefined;
  const origin = merged.origin || "predictive-maintenance";
  const data_source = merged.data_source || merged.dataSource || undefined;
  const uns_alert_key =
    merged.uns_alert_key ||
    buildUnsAlertKey({
      orderId: order_id,
      origin,
      metric,
      timestamp: isoTs,
    });

  return {
    err_code,
    err_name,
    machine_id: merged.machine_id || "M1",
    machine: merged.machine || "Tab Laser Welding Cell",
    metric,
    value,
    threshold,
    severity,
    ...(order_id ? { order_id } : {}),
    origin,
    ...(data_source ? { data_source } : {}),
    uns_alert_key,
    details: {
      temperature,
      vibration,
      threshold,
    },
    ts: { $date: isoTs },
    status: merged.status || "new",
  };
}

export async function fetchAlerts({ limit = 25 } = {}) {
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await fetch("/api/action/find", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "find",
      collection: "alerts",
      filter: {
        ts: { $gte: { $date: windowStart.toISOString() } },
        source: { $ne: "edge-weld-monitor" },
      },
      sort: { ts: -1 },
      limit,
    }),
  });
  if (res.ok) {
    return await res.json();
  }
  return [];
}

export async function fetchAlertById(id) {
  if (!id) return null;
  const normalizedId = String(id);
  const filter = OBJECT_ID_PATTERN.test(normalizedId)
    ? {
        $or: [
          { _id: { $oid: normalizedId } },
          { _id: normalizedId },
          { uns_alert_key: normalizedId },
        ],
      }
    : {
        $or: [{ _id: normalizedId }, { uns_alert_key: normalizedId }],
      };

  const res = await fetch("/api/action/findOne", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "findOne",
      collection: "alerts",
      filter,
    }),
  });
  if (!res.ok) return null;
  const doc = await res.json();
  return doc && doc._id ? doc : null;
}

export async function ensureAlertPersisted(alert, context = {}) {
  if (alert?._id && OBJECT_ID_PATTERN.test(String(alert._id))) {
    const existingById = await fetchAlertById(alert._id);
    if (existingById) {
      return {
        _id: String(existingById._id),
        alert: existingById,
      };
    }
  }

  const doc = buildUnifiedAlert(alert, context);

  if (doc.uns_alert_key) {
    const existingRes = await fetch("/api/action/findOne", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "findOne",
        collection: "alerts",
        filter: { uns_alert_key: doc.uns_alert_key },
      }),
    });
    if (existingRes.ok) {
      const existing = await existingRes.json();
      if (existing && existing._id) {
        return {
          _id: String(existing._id),
          alert: existing,
        };
      }
    }
  }

  const insertRes = await fetch("/api/action/insertOne", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "insertOne",
      collection: "alerts",
      document: doc,
    }),
  });

  let insertedId = null;
  if (insertRes.ok) {
    const payload = await insertRes.json().catch(() => null);
    insertedId = payload?.insertedId ? String(payload.insertedId) : null;
  }

  const normalizedAlert = {
    ...doc,
    _id: insertedId || alert?._id || doc.uns_alert_key,
    ts: doc.ts?.$date || normalizeAlertTimestamp(doc.ts),
  };

  return {
    _id: normalizedAlert._id,
    alert: normalizedAlert,
  };
}

export async function persistAlert(alert, context = {}) {
  const result = await ensureAlertPersisted(alert, context);
  return result.alert;
}
