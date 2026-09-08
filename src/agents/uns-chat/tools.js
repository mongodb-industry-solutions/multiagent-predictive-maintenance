import { tool } from "@langchain/core/tools";
import {
  getFactoryAlerts,
  getFactoryMetrics,
  getFactoryStatus,
  getMachineEvents,
  getOrderDetails,
  getProductionUnits,
  getScadaState,
  getWeldingThresholds,
  listActiveOrders,
} from "@/lib/factory/serverFactoryClient";

function sourceFrom(config) {
  return config?.configurable?.factorySource === "local" ? "local" : "leafy";
}

function requireLeafy(config) {
  if (sourceFrom(config) !== "leafy") {
    throw new Error(
      "Leafy Factory tools are unavailable in local mode. Use inspect_local_factory_snapshot."
    );
  }
}

function factoryResult(toolName, data, source = "leafy") {
  return JSON.stringify({
    kind: "factory_data",
    source,
    tool: toolName,
    captured_at: new Date().toISOString(),
    data,
  });
}

const nameProperty = (name) => ({
  name: {
    type: "string",
    description: "Tool identifier",
    enum: [name],
  },
});

export const inspectLocalFactorySnapshot = tool(
  async (_params, config) => {
    if (sourceFrom(config) !== "local") {
      throw new Error(
        "The local snapshot is only available when Local simulation is selected."
      );
    }
    const snapshot = config?.configurable?.factoryContext;
    if (!snapshot) throw new Error("No local factory snapshot was supplied.");
    return factoryResult(
      "inspect_local_factory_snapshot",
      snapshot,
      "local"
    );
  },
  {
    name: "inspect_local_factory_snapshot",
    description:
      "Read the current bounded browser-local factory snapshot. Use this as the evidence source for every question when Local simulation is selected.",
    schema: {
      type: "object",
      properties: nameProperty("inspect_local_factory_snapshot"),
      required: ["name"],
    },
  }
);

export const readFactoryStatus = tool(
  async (_params, config) => {
    requireLeafy(config);
    return factoryResult("read_factory_status", await getFactoryStatus());
  },
  {
    name: "read_factory_status",
    description:
      "Check Leafy Factory service health and runtime/container status.",
    schema: {
      type: "object",
      properties: nameProperty("read_factory_status"),
      required: ["name"],
    },
  }
);

export const listFactoryOrders = tool(
  async (_params, config) => {
    requireLeafy(config);
    return factoryResult("list_factory_orders", {
      active_orders: await listActiveOrders(),
    });
  },
  {
    name: "list_factory_orders",
    description:
      "List active production orders with their current status and available progress context. Call this before order-scoped tools when the user did not provide an order ID.",
    schema: {
      type: "object",
      properties: nameProperty("list_factory_orders"),
      required: ["name"],
    },
  }
);

export const readFactoryOrder = tool(
  async ({ order_id }, config) => {
    requireLeafy(config);
    return factoryResult(
      "read_factory_order",
      await getOrderDetails(order_id)
    );
  },
  {
    name: "read_factory_order",
    description:
      "Read one production order document, including quantity, customer, state, and progress fields.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("read_factory_order"),
        order_id: {
          type: "string",
          description: "Exact production order ID",
        },
      },
      required: ["name", "order_id"],
    },
  }
);

export const readMachineEvents = tool(
  async ({ order_id, station, limit = 40 }, config) => {
    requireLeafy(config);
    return factoryResult("read_machine_events", {
      events: await getMachineEvents({
        orderId: order_id,
        station,
        limit,
      }),
    });
  },
  {
    name: "read_machine_events",
    description:
      "Read recent contextual machine events for an order, optionally narrowed to one station.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("read_machine_events"),
        order_id: {
          type: "string",
          description: "Exact production order ID",
        },
        station: {
          type: "string",
          description: "Optional exact station name",
        },
        limit: {
          type: "number",
          description: "Maximum events to return, from 1 to 100",
          minimum: 1,
          maximum: 100,
          default: 40,
        },
      },
      required: ["name", "order_id"],
    },
  }
);

export const readProductionUnits = tool(
  async ({ order_id, limit = 30 }, config) => {
    requireLeafy(config);
    return factoryResult("read_production_units", {
      production_units: await getProductionUnits({
        orderId: order_id,
        limit,
      }),
    });
  },
  {
    name: "read_production_units",
    description:
      "Read completed production-unit documents for traceability, cell grades, process measurements, and final quality status.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("read_production_units"),
        order_id: {
          type: "string",
          description: "Exact production order ID",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          default: 30,
        },
      },
      required: ["name", "order_id"],
    },
  }
);

export const readFactoryAlerts = tool(
  async ({ order_id, limit = 40 }, config) => {
    requireLeafy(config);
    return factoryResult("read_factory_alerts", {
      alerts: await getFactoryAlerts({ orderId: order_id, limit }),
    });
  },
  {
    name: "read_factory_alerts",
    description:
      "Read recent operational alerts and anomalies for a production order.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("read_factory_alerts"),
        order_id: {
          type: "string",
          description: "Exact production order ID",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          default: 40,
        },
      },
      required: ["name", "order_id"],
    },
  }
);

export const readFactoryMetrics = tool(
  async ({ order_id, limit = 100 }, config) => {
    requireLeafy(config);
    return factoryResult(
      "read_factory_metrics",
      await getFactoryMetrics({ orderId: order_id, limit })
    );
  },
  {
    name: "read_factory_metrics",
    description:
      "Read an order's KPI overview, yield, throughput, cycle-time trend, grade distribution, and defects by station. Use render_factory_chart after this tool for visual questions.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("read_factory_metrics"),
        order_id: {
          type: "string",
          description: "Exact production order ID",
        },
        limit: {
          type: "number",
          minimum: 1,
          maximum: 100,
          default: 100,
        },
      },
      required: ["name", "order_id"],
    },
  }
);

export const readWeldingThresholds = tool(
  async ({ order_id }, config) => {
    requireLeafy(config);
    return factoryResult(
      "read_welding_thresholds",
      await getWeldingThresholds(order_id)
    );
  },
  {
    name: "read_welding_thresholds",
    description:
      "Read configured laser-welding temperature and vibration thresholds for an order.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("read_welding_thresholds"),
        order_id: {
          type: "string",
          description: "Exact production order ID",
        },
      },
      required: ["name", "order_id"],
    },
  }
);

export const readScadaState = tool(
  async ({ order_id }, config) => {
    requireLeafy(config);
    return factoryResult(
      "read_scada_state",
      await getScadaState(order_id)
    );
  },
  {
    name: "read_scada_state",
    description:
      "Read the live SCADA state for an active order, including current stage, batch, and latest station results.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("read_scada_state"),
        order_id: {
          type: "string",
          description: "Exact production order ID",
        },
      },
      required: ["name", "order_id"],
    },
  }
);

export const renderFactoryChart = tool(
  async ({ chart_type, title, description, unit, series }) => {
    const normalizedSeries = series.slice(0, 4).map((entry) => ({
      name: entry.name,
      data: entry.data.slice(0, 40).map((point) => ({
        label: String(point.label),
        value: Number(point.value),
      })),
    }));
    return JSON.stringify({
      kind: "chart",
      source: "derived_from_factory_data",
      chart: {
        type: chart_type,
        title,
        description: description || "",
        unit: unit || "",
        series: normalizedSeries,
      },
    });
  },
  {
    name: "render_factory_chart",
    description:
      "Create a chart artifact from numeric data already returned by a factory tool. Use line for time/trend data, bar for comparisons, and donut for part-to-whole distributions.",
    schema: {
      type: "object",
      properties: {
        ...nameProperty("render_factory_chart"),
        chart_type: {
          type: "string",
          enum: ["line", "bar", "donut"],
        },
        title: { type: "string" },
        description: { type: "string" },
        unit: {
          type: "string",
          description: "Short value unit such as %, units, seconds, or alerts",
        },
        series: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              data: {
                type: "array",
                minItems: 1,
                maxItems: 40,
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "number" },
                  },
                  required: ["label", "value"],
                },
              },
            },
            required: ["name", "data"],
          },
        },
      },
      required: ["name", "chart_type", "title", "series"],
    },
  }
);

export function getTools() {
  return [
    inspectLocalFactorySnapshot,
    readFactoryStatus,
    listFactoryOrders,
    readFactoryOrder,
    readMachineEvents,
    readProductionUnits,
    readFactoryAlerts,
    readFactoryMetrics,
    readWeldingThresholds,
    readScadaState,
    renderFactoryChart,
  ];
}

export function getToolsForSource(source) {
  return source === "local"
    ? [inspectLocalFactorySnapshot, renderFactoryChart]
    : [
        readFactoryStatus,
        listFactoryOrders,
        readFactoryOrder,
        readMachineEvents,
        readProductionUnits,
        readFactoryAlerts,
        readFactoryMetrics,
        readWeldingThresholds,
        readScadaState,
        renderFactoryChart,
      ];
}
