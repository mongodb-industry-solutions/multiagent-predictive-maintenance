import { DEFAULT_THRESHOLDS } from "@/lib/factory/constants";
import { buildUnifiedAlert } from "@/lib/api/alerts";

export const LEAFY_PREDICTIVE_THRESHOLDS = {
  ...DEFAULT_THRESHOLDS,
};

export function createLeafyPredictiveOrder() {
  const deliveryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return {
    product_id: "1",
    quantity: 15,
    customer: "Predictive Maintenance Demo",
    customer_po: `PM-${Date.now()}`,
    delivery_date: deliveryDate.toISOString().slice(0, 10),
  };
}

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function buildLeafyMachineData({
  orderId,
  metrics,
  latestEvent,
  temperature,
  vibration,
}) {
  const eventTimestamp = latestEvent?.ts;
  const timestamp = eventTimestamp || new Date().toISOString();

  return {
    timestamp: { $date: timestamp },
    source: "Leafy Factory",
    order_id: orderId,
    metadata: {
      factory_id: "leafy_factory",
      prod_line_id: "ev_module_assembly",
      machine_id: "M1",
      station: "Laser Tab Welding",
    },
    temperature: {
      value: finiteNumber(metrics?.temperature, temperature),
      unit: "Celcius",
    },
    vibration: {
      value: finiteNumber(metrics?.vibration, vibration),
      unit: "mm/s",
    },
    factory_metrics: metrics || {},
    latest_machine_event: latestEvent || null,
  };
}

export function factoryAlertKey(alert) {
  return [
    alert?.order_id,
    alert?.metric,
    alert?.timestamp,
  ].join(":");
}

export function toWorkflowAlert(
  factoryAlert,
  machineData,
  thresholds = LEAFY_PREDICTIVE_THRESHOLDS,
  extra = {}
) {
  const unified = buildUnifiedAlert(factoryAlert, {
    temperature: machineData?.temperature?.value,
    vibration: machineData?.vibration?.value,
    thresholds,
    orderId: factoryAlert?.order_id || machineData?.order_id,
    origin: extra.origin || "predictive-maintenance",
    dataSource: extra.dataSource || "leafy",
  });

  return {
    ...unified,
    _id: factoryAlert?._id || `leafy-${factoryAlertKey(factoryAlert)}`,
    ts: unified.ts?.$date || factoryAlert?.timestamp || new Date().toISOString(),
  };
}
