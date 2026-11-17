export const CF_COLLECTIONS = {
  TELEMETRY: "telemetry",
  ALERTS: "alerts",
  ORDERS: "workorders",
  MATERIALS: "materials",
  EXCURSIONS: "excursions",
};

export const CF_ALLOWED_COLLECTIONS = new Set(Object.values(CF_COLLECTIONS));
export const CF_VECTOR_INDEX_NAME = "excursion_signature_index";

export const CF_FACTORY_ID = "leafy_factory";
export const CF_PROD_LINE_ID = "ev_module_assembly";
export const CF_AREA = "welding";
export const CF_MACHINE_ID = "LTW-04";
export const CF_TELEMETRY_TTL_SECONDS = 86400;

/**
 * Return the current UTC calendar day ("YYYY-MM-DD") so LTW-04 telemetry
 * timestamps always sit within `telemetry`'s 24-hour TTL window while
 * yesterday's buckets expire automatically.
 */
export function getCurrentDemoDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}
