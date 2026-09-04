import {
  DEFAULT_THRESHOLDS,
  FACTORY_STATIONS,
  PRODUCTS,
} from "./constants.js";
import { isRunningOrder } from "./sessionOrders.js";

const LOCAL_STORAGE_VERSION = 1;

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isoAt(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function productFor(id) {
  return PRODUCTS.find((product) => product.id === String(id)) || PRODUCTS[0];
}

function metricsFor(station, batchId) {
  const variance = (batchId % 7) / 10;
  const cellIds = [0, 1, 2, 3].map((offset) => batchId * 4 + offset + 1);

  switch (station) {
    case "Cell Screening":
      return {
        cell_ids: cellIds,
        ocv_v: round(3.61 + variance / 10, 3),
        ir_milliohm: round(2.1 + variance, 3),
        grade: batchId % 6 === 0 ? "B" : "A",
      };
    case "Tab Processing":
      return {
        tab_length_mm: round(18.2 + variance, 2),
        tab_thickness_mm: 0.2,
        surface_ok: true,
        cell_ids: cellIds,
      };
    case "Z-Fold Stacking":
      return {
        layer_count: 4,
        stack_height_mm: round(9.3 + variance, 3),
        alignment_ok: batchId % 11 !== 0,
        cell_ids: cellIds,
      };
    case "Module Pre-Assembly":
      return {
        fit_align_mm: round(0.04 + variance / 5, 3),
        clamp_force_n: 520 + (batchId % 8) * 24,
        module_id: 400 + batchId,
      };
    case "Laser Tab Welding":
      return {
        laser_power_w: 510 + (batchId % 7) * 18,
        weld_points: 6,
        weld_ok: batchId % 13 !== 0,
      };
    case "Ultrasonic Busbar Welding":
      return {
        weld_energy_j: round(255 + variance * 20, 2),
        weld_time_ms: 106 + (batchId % 8) * 4,
        weld_ok: batchId % 17 !== 0,
      };
    case "TIM Dispensing & Cooling Plate Assembly":
      return {
        tim_volume_ml: round(1.02 + variance / 4, 3),
        tim_thickness_mm: round(0.19 + variance / 50, 3),
        align_offset_mm: round(0.04 + variance / 12, 3),
      };
    case "Pouch / Pack Sealing":
      return {
        seal_temp_c: 146 + (batchId % 6),
        seal_pressure_kpa: round(310 + variance * 35, 1),
        seal_ok: batchId % 19 !== 0,
      };
    case "Helium Leak Test":
      return {
        leak_rate_pa_l_s: round(0.00064 + variance / 10000, 7),
        test_pressure_kpa: 120 + (batchId % 5) * 7,
        pass: batchId % 19 !== 0,
      };
    default:
      return {
        pack_voltage_v: round(14.62 + variance / 4, 3),
        pack_current_a: round(30.1 + variance * 4, 3),
        pack_resistance_mohm: round(8.2 + variance, 3),
        insulation_resistance_mohm: 820 + (batchId % 8) * 12,
        pass: batchId % 13 !== 0,
        cell_ids: cellIds,
      };
  }
}

function makeEvent(orderId, batchId, stationIndex, timestamp = isoAt()) {
  const station = FACTORY_STATIONS[stationIndex].name;
  const metrics = metricsFor(station, batchId);
  return {
    event_id: `local-${orderId}-${batchId}-${stationIndex}-${Date.now()}`,
    station,
    batch_id: batchId,
    order_id: orderId,
    ts: timestamp,
    ok:
      metrics.pass !== false &&
      metrics.weld_ok !== false &&
      metrics.seal_ok !== false &&
      metrics.alignment_ok !== false,
    metrics,
  };
}

function makeProductionUnit(order, events, completedAt = isoAt()) {
  const batchId = events[0]?.batch_id || 1;
  const byStation = Object.fromEntries(
    events.map((event) => [event.station, event])
  );
  const get = (station) => byStation[station]?.metrics || {};
  const screened = get("Cell Screening");
  const eol = get("Pack EOL Test");
  const product = productFor(order.product_id);

  return {
    order_id: order.order_id,
    batch_id: batchId,
    started_at: events[0]?.ts || completedAt,
    completed_at: completedAt,
    cycle_time_sec: round(
      Math.max(
        1.4,
        (new Date(completedAt).getTime() -
          new Date(events[0]?.ts || completedAt).getTime()) /
          1000
      ),
      2
    ),
    final_status: eol.pass === false ? "fail" : "pass",
    order: {
      id: order.mes_order_id,
      order_id: order.order_id,
      product_id: order.product_id,
      product_desc: product.code,
      quantity: order.quantity,
      state: order.status,
      customer: order.customer,
      customer_po: order.customer_po,
      delivery_date: order.delivery_date,
      sales_order: order.sales_order,
      line: "Leafy Factory | Module Assembly | EV Line",
    },
    cells: (screened.cell_ids || []).map((cellId, index) => ({
      cell_id: cellId,
      ocv_v: round((screened.ocv_v || 3.65) + index * 0.004, 3),
      ir_milliohm: round((screened.ir_milliohm || 2.5) + index * 0.08, 3),
      grade: index === 3 && batchId % 6 === 0 ? "B" : "A",
      screened_at: byStation["Cell Screening"]?.ts || completedAt,
    })),
    process: {
      z_fold: {
        timestamp: byStation["Z-Fold Stacking"]?.ts,
        ...get("Z-Fold Stacking"),
      },
      module_assembly: {
        timestamp: byStation["Module Pre-Assembly"]?.ts,
        ...get("Module Pre-Assembly"),
      },
      laser_welding: {
        timestamp: byStation["Laser Tab Welding"]?.ts,
        ...get("Laser Tab Welding"),
      },
      busbar_welding: {
        timestamp: byStation["Ultrasonic Busbar Welding"]?.ts,
        ...get("Ultrasonic Busbar Welding"),
      },
      tim_dispensing: {
        timestamp:
          byStation["TIM Dispensing & Cooling Plate Assembly"]?.ts,
        ...get("TIM Dispensing & Cooling Plate Assembly"),
      },
      pack_sealing: {
        timestamp: byStation["Pouch / Pack Sealing"]?.ts,
        ...get("Pouch / Pack Sealing"),
      },
      leak_test: {
        timestamp: byStation["Helium Leak Test"]?.ts,
        ...get("Helium Leak Test"),
      },
      eol_test: {
        timestamp: byStation["Pack EOL Test"]?.ts,
        ...eol,
        passed: eol.pass,
      },
    },
    event_ids: events.map((event) => event.event_id),
  };
}

function seedProductionUnits() {
  const order = {
    order_id: "LOCAL-DEMO-001",
    mes_order_id: "MES-LOCAL-001",
    product_id: "1",
    quantity: 16,
    customer: "Leafy Mobility",
    customer_po: "PO-DEMO-2408",
    delivery_date: isoAt(7 * 86400000).slice(0, 10),
    sales_order: "SO-LOCAL-001",
    status: "complete",
  };

  return Array.from({ length: 16 }, (_, index) => {
    const batchId = index + 1;
    const completedOffset = -(15 - index) * 12 * 60 * 1000;
    const completedAt = isoAt(completedOffset);
    const events = FACTORY_STATIONS.map((_, stationIndex) =>
      makeEvent(
        order.order_id,
        batchId,
        stationIndex,
        new Date(
          new Date(completedAt).getTime() -
            (FACTORY_STATIONS.length - stationIndex) * 1250
        ).toISOString()
      )
    );
    return makeProductionUnit(order, events, completedAt);
  }).reverse();
}

function seedEvents(units) {
  return units
    .slice(0, 3)
    .flatMap((unit) =>
      FACTORY_STATIONS.map((station, stationIndex) =>
        makeEvent(
          unit.order_id,
          unit.batch_id,
          stationIndex,
          new Date(
            new Date(unit.completed_at).getTime() -
              (FACTORY_STATIONS.length - stationIndex) * 1250
          ).toISOString()
        )
      )
    )
    .sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

export function createInitialLocalFactoryState() {
  const productionUnits = seedProductionUnits();
  return {
    version: LOCAL_STORAGE_VERSION,
    orders: [],
    events: seedEvents(productionUnits),
    productionUnits,
    alerts: [
      {
        order_id: "LOCAL-DEMO-001",
        machine: "Laser Tab Welding",
        metric: "vibration",
        value: 57,
        threshold: 50,
        status: "anomaly",
        severity: "warning",
        timestamp: isoAt(-42 * 60 * 1000),
      },
    ],
    thresholds: {},
    sensor: { temperature: 68, vibration: 24 },
  };
}

export function restoreLocalFactoryState(value) {
  if (!value || value.version !== LOCAL_STORAGE_VERSION) {
    return createInitialLocalFactoryState();
  }
  return value;
}

export function createLocalOrder(state, input) {
  const now = new Date();
  const suffix = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}${now.getMilliseconds()}`;
  const orderId = `LOCAL-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${suffix}`;
  const product = productFor(input.product_id);
  const order = {
    order_id: orderId,
    mes_order_id: `MES-${suffix}`,
    runtime_id: `runtime-${orderId}`,
    product_id: product.id,
    quantity: Number(input.quantity),
    customer: input.customer,
    customer_po: input.customer_po,
    delivery_date: input.delivery_date,
    sales_order: `SO-${suffix}`,
    created_at: now.toISOString(),
    status: "running",
    scada_path: `/scada/${orderId}`,
    runtime: {
      status: "running",
      stationIndex: 0,
      batchId: 1,
      batchEvents: [],
      current_stage_label: FACTORY_STATIONS[0].output,
      last_results: {},
    },
  };

  return {
    state: {
      ...state,
      orders: [order, ...state.orders],
      thresholds: {
        ...state.thresholds,
        [orderId]: {
          ...DEFAULT_THRESHOLDS,
          temperature_alert_active: false,
          vibration_alert_active: false,
        },
      },
    },
    order,
  };
}

export function stopLocalOrder(state, orderId) {
  return {
    ...state,
    orders: state.orders.map((order) =>
      order.order_id === orderId
        ? {
            ...order,
            status: "stopped",
            stopped_at: isoAt(),
            runtime: { ...order.runtime, status: "stopped" },
          }
        : order
    ),
  };
}

export function advanceLocalFactory(state) {
  let newEvents = [];
  let newUnits = [];
  let changed = false;

  const orders = state.orders.map((order) => {
    if (order.status !== "running") return order;
    changed = true;
    const runtime = order.runtime;
    const event = makeEvent(
      order.order_id,
      runtime.batchId,
      runtime.stationIndex
    );
    const batchEvents = [...runtime.batchEvents, event];
    newEvents.push(event);

    if (runtime.stationIndex < FACTORY_STATIONS.length - 1) {
      const nextIndex = runtime.stationIndex + 1;
      return {
        ...order,
        runtime: {
          ...runtime,
          stationIndex: nextIndex,
          batchEvents,
          current_stage_label: FACTORY_STATIONS[nextIndex].output,
          last_results: {
            ...runtime.last_results,
            [event.station]: event,
          },
        },
      };
    }

    const unit = makeProductionUnit(order, batchEvents);
    newUnits.push(unit);
    const complete = runtime.batchId >= order.quantity;
    return {
      ...order,
      status: complete ? "complete" : order.status,
      stopped_at: complete ? isoAt() : undefined,
      runtime: {
        ...runtime,
        status: complete ? "complete" : "running",
        stationIndex: 0,
        batchId: runtime.batchId + 1,
        batchEvents: [],
        current_stage_label: FACTORY_STATIONS[0].output,
        last_results: {
          ...runtime.last_results,
          [event.station]: event,
        },
      },
    };
  });

  if (!changed) return state;
  return {
    ...state,
    orders,
    events: [...newEvents.reverse(), ...state.events].slice(0, 500),
    productionUnits: [...newUnits.reverse(), ...state.productionUnits].slice(
      0,
      200
    ),
  };
}

export function setLocalThresholds(state, orderId, values) {
  const thresholds = {
    temperature_threshold: Number(values.temperature_threshold),
    vibration_threshold: Number(values.vibration_threshold),
    temperature_alert_active: false,
    vibration_alert_active: false,
    updated_at: isoAt(),
  };
  return {
    state: {
      ...state,
      thresholds: { ...state.thresholds, [orderId]: thresholds },
    },
    thresholds: { order_id: orderId, ...thresholds },
  };
}

export function sendLocalMetrics(state, orderId, values) {
  const thresholds = state.thresholds[orderId] || DEFAULT_THRESHOLDS;
  const temperature = Number(values.temperature);
  const vibration = Number(values.vibration);
  const tempHigh = temperature > thresholds.temperature_threshold;
  const vibrationHigh = vibration > thresholds.vibration_threshold;
  const generated = [];
  const alerts = [];

  if (tempHigh && !thresholds.temperature_alert_active) {
    generated.push("temperature");
    alerts.push({
      order_id: orderId,
      machine: "Laser Tab Welding",
      metric: "temperature",
      value: temperature,
      threshold: thresholds.temperature_threshold,
      status: "anomaly",
      severity:
        temperature >= thresholds.temperature_threshold * 1.5
          ? "critical"
          : "warning",
      timestamp: isoAt(),
    });
  }
  if (vibrationHigh && !thresholds.vibration_alert_active) {
    generated.push("vibration");
    alerts.push({
      order_id: orderId,
      machine: "Laser Tab Welding",
      metric: "vibration",
      value: vibration,
      threshold: thresholds.vibration_threshold,
      status: "anomaly",
      severity:
        vibration >= thresholds.vibration_threshold * 1.5
          ? "critical"
          : "warning",
      timestamp: isoAt(),
    });
  }

  const nextThresholds = {
    ...thresholds,
    temperature_alert_active: tempHigh,
    vibration_alert_active: vibrationHigh,
  };
  return {
    state: {
      ...state,
      sensor: { temperature, vibration },
      alerts: [...alerts, ...state.alerts].slice(0, 200),
      thresholds: { ...state.thresholds, [orderId]: nextThresholds },
    },
    result: {
      order_id: orderId,
      temperature,
      vibration,
      alerts_generated: generated,
      temperature_alert_active: tempHigh,
      vibration_alert_active: vibrationHigh,
    },
  };
}

export function buildLocalAnalytics(state, orderId) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const units = state.productionUnits.filter(
    (unit) =>
      new Date(unit.completed_at) >= dayStart &&
      (!orderId || unit.order_id === orderId)
  );
  const alerts = state.alerts.filter(
    (alert) =>
      new Date(alert.timestamp) >= dayStart &&
      (!orderId || alert.order_id === orderId)
  );
  const pass = units.filter((unit) => unit.final_status === "pass").length;
  const fail = units.length - pass;
  const cycleAverage = units.length
    ? units.reduce((sum, unit) => sum + unit.cycle_time_sec, 0) / units.length
    : 0;
  const throughputMap = new Map();
  units.forEach((unit) => {
    const bucket = new Date(unit.completed_at);
    bucket.setMinutes(0, 0, 0);
    const key = bucket.toISOString();
    throughputMap.set(key, (throughputMap.get(key) || 0) + 1);
  });
  const grades = { A: 0, B: 0, C: 0, Reject: 0 };
  units.forEach((unit) =>
    unit.cells.forEach((cell) => {
      grades[cell.grade] = (grades[cell.grade] || 0) + 1;
    })
  );
  const defectFields = [
    ["Z-Fold Stacking", "z_fold", "alignment_ok"],
    ["Laser Tab Welding", "laser_welding", "weld_ok"],
    ["Ultrasonic Busbar Welding", "busbar_welding", "weld_ok"],
    ["Pouch / Pack Sealing", "pack_sealing", "seal_ok"],
    ["Helium Leak Test", "leak_test", "pass"],
  ];

  return {
    kpis: {
      total_units: units.length,
      first_pass_yield: units.length ? round((pass / units.length) * 100, 1) : 0,
      avg_cycle_time_sec: round(cycleAverage, 2),
      active_orders: state.orders.filter((order) => order.status === "running")
        .length,
      open_alerts: alerts.length,
    },
    yield: { pass, fail },
    throughput: [...throughputMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucket, count]) => ({ bucket, count })),
    cycle_time_trend: units
      .slice(0, 20)
      .reverse()
      .map((unit) => ({
        label: `${unit.order_id.slice(-6)} #${unit.batch_id}`,
        completed_at: unit.completed_at,
        cycle_time_sec: unit.cycle_time_sec,
      })),
    grade_distribution: grades,
    defects_by_station: defectFields.map(([station, process, field]) => ({
      station,
      defects: units.filter((unit) => unit.process?.[process]?.[field] === false)
        .length,
      total: units.filter(
        (unit) => unit.process?.[process]?.[field] !== undefined
      ).length,
    })),
    pipelines: {
      collection: "production_units",
      throughput: [
        { $match: { completed_at: { $gte: dayStart.toISOString() } } },
        {
          $group: {
            _id: { $dateTrunc: { date: "$completed_at", unit: "hour" } },
            count: { $sum: 1 },
          },
        },
      ],
      yield: [
        { $match: { completed_at: { $gte: dayStart.toISOString() } } },
        {
          $group: {
            _id: "$final_status",
            count: { $sum: 1 },
          },
        },
      ],
      cycle_time: [
        { $sort: { completed_at: -1 } },
        { $limit: 20 },
      ],
      grade: [
        { $unwind: "$cells" },
        { $group: { _id: "$cells.grade", count: { $sum: 1 } } },
      ],
      defects: [
        { $match: { completed_at: { $gte: dayStart.toISOString() } } },
        { $project: { process: 1 } },
      ],
    },
  };
}

export function buildLocalSnapshot(state, selectedOrderId) {
  // Orders started in this browser, newest first; completed ones stay listed.
  const orders = state.orders.map((order) => ({
    ...order,
    completed_units: Math.max(0, Number(order.runtime?.batchId || 1) - 1),
  }));
  const activeOrders = orders.filter(isRunningOrder);
  const selectedOrder =
    orders.find((order) => order.order_id === selectedOrderId) || null;
  const orderId = selectedOrder?.order_id || null;
  const liveEvents = selectedOrder?.runtime?.batchEvents || [];
  const liveProductionUnit = isRunningOrder(selectedOrder)
    ? {
        order_id: selectedOrder.order_id,
        batch_id: selectedOrder.runtime?.batchId || 1,
        status: "in_progress",
        final_status: "in_progress",
        started_at: liveEvents[0]?.ts || selectedOrder.created_at,
        updated_at: liveEvents.at(-1)?.ts || selectedOrder.created_at,
        current_stage_label: selectedOrder.runtime?.current_stage_label,
        order: selectedOrder,
        process: Object.fromEntries(
          liveEvents.map((event) => [
            event.station.toLowerCase().replaceAll(" ", "_"),
            { timestamp: event.ts, ...event.metrics },
          ])
        ),
        events: liveEvents,
      }
    : null;

  return {
    status: {
      service_mode: "browser_simulation",
      active_containers: activeOrders.length,
    },
    activeOrders,
    orders,
    selectedOrder,
    scadaState: selectedOrder?.runtime || null,
    liveProductionUnit,
    events: orderId
      ? state.events.filter((event) => event.order_id === orderId)
      : [],
    productionUnits: orderId
      ? state.productionUnits.filter((unit) => unit.order_id === orderId)
      : [],
    alerts: orderId
      ? state.alerts.filter((alert) => alert.order_id === orderId)
      : [],
    analytics: buildLocalAnalytics(state, orderId),
    thresholds:
      (orderId && state.thresholds[orderId]) || DEFAULT_THRESHOLDS,
    sensor: state.sensor,
  };
}
