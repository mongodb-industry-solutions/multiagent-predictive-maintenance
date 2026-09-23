const ORDER_ID = "ORD-20260910180600";

function stationEvent(station, metrics, overrides = {}) {
  return {
    event_id: "88efefaf-3a69-45f3-a674-322dfb920ea2",
    station,
    batch_id: 1,
    order_id: ORDER_ID,
    metrics,
    ok: true,
    ts_iso: "2026-09-10T16:06:12Z",
    ...overrides,
  };
}

export const PROCESS_PHASES = [
  {
    id: "preprocessing",
    number: "01",
    title: "Cell Preprocessing and Sorting",
    summary:
      "Qualify every incoming cell and prepare its tabs before it enters module assembly.",
    outcome: "Graded, traceable cells",
    tone: "emerald",
    machines: [
      {
        id: "cell-screening",
        title: "Cell Screening and Grading Station",
        implementation: "Cell Screening",
        purpose:
          "Measures open-circuit voltage and internal resistance, then assigns a quality grade to every cell.",
        input: "Incoming cylindrical cells",
        output: "Graded cells with an electrical quality record",
        metrics: ["ocv_v", "ir_milliohm", "grade"],
        sampleLabel: "Cell screening station event",
        sample: stationEvent("Cell Screening", {
          cell_id: 1,
          ocv_v: 3.72,
          ir_milliohm: 2.1,
          grade_code: 0,
          grade: "A",
        }),
      },
      {
        id: "tab-processing",
        title: "Tab Processing Station",
        implementation: "Tab Processing",
        purpose:
          "Trims, cleans, and checks cell tabs so every downstream joining process receives consistent material.",
        input: "Electrically graded cells",
        output: "Cells with prepared tabs",
        metrics: ["trim_dev_mm", "cleanliness_score", "process_ok"],
        sampleLabel: "Tab processing station event",
        sample: stationEvent("Tab Processing", {
          cell_id: 1,
          trim_dev_mm: -0.08,
          cleanliness_score: 0.97,
          process_ok: true,
        }),
      },
    ],
  },
  {
    id: "assembly",
    number: "02",
    title: "Cell Stacking and Module Assembly",
    summary:
      "Build the cell stack and locate it precisely inside the mechanical module fixture.",
    outcome: "Fixtured four-cell module",
    tone: "teal",
    machines: [
      {
        id: "z-fold",
        title: "Z-Fold Stacking Cell",
        implementation: "Z-Fold Stacking",
        purpose:
          "Builds the electrochemical stack while tracking layer count, height, and alignment.",
        input: "Prepared cells and separator",
        output: "Aligned four-cell stack",
        metrics: ["layer_count", "alignment_err_mm", "stack_height_mm"],
        sampleLabel: "Z-fold stacking station event",
        sample: stationEvent("Z-Fold Stacking", {
          layer_count: 4,
          alignment_err_mm: 0.06,
          alignment_ok: true,
          stack_height_mm: 10.43,
          cell_ids: [1, 2, 3, 4],
        }),
      },
      {
        id: "module-assembly",
        title: "Module Assembly and Fixture Cell",
        implementation: "Module Pre-Assembly",
        purpose:
          "Positions the cell stack in the module structure and applies controlled clamping force.",
        input: "Completed cell stack",
        output: "Mechanically assembled module",
        metrics: ["fit_align_mm", "clamp_force_n", "module_id"],
        sampleLabel: "Module pre-assembly station event",
        sample: stationEvent("Module Pre-Assembly", {
          fit_align_mm: 0.11,
          clamp_force_n: 548,
          module_id: 401,
          cell_ids: [1, 2, 3, 4],
        }),
      },
    ],
  },
  {
    id: "welding",
    number: "03",
    title: "High Precision Welding",
    summary:
      "Create low-resistance electrical joints and continuously observe the process for quality and maintenance signals.",
    outcome: "Electrically connected module",
    tone: "amber",
    machines: [
      {
        id: "laser-welding",
        title: "Tab Laser Welding Cell",
        implementation: "Laser Tab Welding",
        purpose:
          "Joins cell tabs with a monitored laser process and records the delivered power and weld result.",
        input: "Fixtured module",
        output: "Laser-welded cell tabs",
        metrics: ["laser_power_w", "weld_points", "weld_ok"],
        sampleLabel: "Laser welding station event",
        sample: stationEvent("Laser Tab Welding", {
          laser_power_w: 612,
          weld_ok: true,
          weld_points: 6,
          cell_ids: [1, 2, 3, 4],
        }),
      },
      {
        id: "ultrasonic-welding",
        title: "Busbar Ultrasonic Welding Cell",
        implementation: "Ultrasonic Busbar Welding",
        purpose:
          "Connects busbars using ultrasonic energy and verifies weld duration and joint quality.",
        input: "Laser-welded module and busbars",
        output: "Electrically complete module",
        metrics: ["weld_energy_j", "weld_time_ms", "weld_ok"],
        sampleLabel: "Ultrasonic welding station event",
        sample: stationEvent("Ultrasonic Busbar Welding", {
          weld_energy_j: 274.6,
          weld_time_ms: 118,
          weld_ok: true,
          cell_ids: [1, 2, 3, 4],
        }),
      },
      {
        id: "weld-monitoring",
        title: "Weld Monitoring and Thermal Imaging",
        implementation: "Laser welding condition monitoring",
        purpose:
          "Observes temperature and vibration around welding so abnormal conditions can become maintenance alerts.",
        input: "Weld process signals and thermal observations",
        output: "Condition alert with measured and threshold values",
        metrics: ["temperature", "vibration", "severity"],
        sampleLabel: "Weld condition alert",
        sample: {
          alert_id: "alert-42c6b1",
          order_id: ORDER_ID,
          machine: "Laser Tab Welding",
          metric: "temperature",
          value: 95,
          threshold: 80,
          severity: "warning",
          status: "anomaly",
          timestamp: "2026-09-10T16:06:13Z",
        },
      },
    ],
  },
  {
    id: "thermal",
    number: "04",
    title: "Thermal Management and Encapsulation",
    summary:
      "Add the thermal path, close the enclosure, and verify that the sealed pack is leak-tight.",
    outcome: "Sealed and leak-tested pack",
    tone: "blue",
    machines: [
      {
        id: "cooling-plate",
        title: "Cooling Plate Assembly Cell",
        implementation: "TIM Dispensing & Cooling Plate Assembly",
        purpose:
          "Dispenses thermal interface material and aligns the cooling plate for efficient heat transfer.",
        input: "Electrically complete module",
        output: "Module with cooling plate",
        metrics: ["tim_volume_ml", "tim_thickness_mm", "align_offset_mm"],
        sampleLabel: "Thermal assembly station event",
        sample: stationEvent("TIM Dispensing & Cooling Plate Assembly", {
          tim_volume_ml: 1.08,
          tim_thickness_mm: 0.19,
          align_offset_mm: 0.04,
          cell_ids: [1, 2, 3, 4],
        }),
      },
      {
        id: "pouch-sealing",
        title: "Pouch Sealing Cell (Top + Side)",
        implementation: "Pouch / Pack Sealing",
        purpose:
          "Seals the battery pack under controlled temperature and pressure before leak testing.",
        input: "Module with thermal hardware",
        output: "Hermetically sealed pack",
        metrics: ["seal_temp_c", "seal_pressure_kpa", "seal_ok"],
        sampleLabel: "Pouch sealing station event",
        sample: stationEvent("Pouch / Pack Sealing", {
          seal_temp_c: 154,
          seal_pressure_bar: 2.82,
          seal_pressure_kpa: 282,
          seal_ok: true,
          cell_ids: [1, 2, 3, 4],
        }),
      },
      {
        id: "helium-test",
        title: "Helium Leak Test Station",
        implementation: "Helium Leak Test",
        purpose:
          "Checks enclosure integrity with helium and records the measured leak rate against the pass limit.",
        input: "Sealed battery pack",
        output: "Leak-tested battery pack",
        metrics: ["leak_rate_pa_l_s", "test_pressure_kpa", "pass"],
        sampleLabel: "Helium leak test station event",
        sample: stationEvent("Helium Leak Test", {
          leak_rate_pa_m3_s: 4.2e-7,
          leak_rate_pa_l_s: 0.00042,
          test_pressure_kpa: 145,
          pass: true,
          cell_ids: [1, 2, 3, 4],
        }),
      },
    ],
  },
  {
    id: "inspection",
    number: "05",
    title: "Final Inspection and Control",
    summary:
      "Validate final electrical performance and release a complete, traceable production unit.",
    outcome: "Validated production unit",
    tone: "slate",
    machines: [
      {
        id: "eol-test",
        title: "EOL Electrical Test Bench",
        implementation: "Pack EOL Test",
        purpose:
          "Performs final voltage, current, resistance, and insulation checks before releasing the pack.",
        input: "Leak-tested battery pack",
        output: "Pass/fail production unit",
        metrics: [
          "pack_voltage_v",
          "pack_current_a",
          "insulation_resistance_mohm",
          "pass",
        ],
        sampleLabel: "End-of-line station event",
        sample: stationEvent("Pack EOL Test", {
          config: "4S",
          pack_voltage_v: 14.81,
          pack_ir_milliohm: 7.4,
          pack_current_a: 29.8,
          pack_resistance_mohm: 7.4,
          insulation_resistance_mohm: 824,
          pass: true,
          cell_ids: [1, 2, 3, 4],
        }),
      },
    ],
  },
];

export const ARCHITECTURE_MODULES = [
  {
    id: "erp",
    shortLabel: "ERP",
    title: "ERP",
    type: "Business planning",
    implementation: "ERPNext · Docker Compose",
    icon: "Diagram",
    purpose:
      "Owns customer and sales-order context, bills of material, inventory, and the commercial view of production.",
    build:
      "A containerized ERPNext stack restored from seeded demo data and integrated through its REST API.",
    components: ["ERPNext frontend", "ERPNext backend", "MariaDB", "Redis cache", "Redis queue"],
    position: { left: "2%", top: "4%", width: "28%" },
    links: [
      {
        label: "Open Leafy ERP",
        href: "https://factory-simulator-erp.industrysolutions.staging.corp.mongodb.com/",
      },
      {
        label: "ERPNext source",
        href: "https://github.com/frappe/erpnext",
      },
    ],
    sampleLabel: "Sales order request",
    sample: {
      doctype: "Sales Order",
      customer: "H Motors",
      delivery_date: "2026-09-20",
      po_no: "H-PO-12345",
      company: "EV Battery Maker",
      currency: "CAD",
      items: [
        {
          item_code: "EV-PM-4C-S",
          qty: 10,
          rate: 550,
          warehouse: "Stores - EV",
        },
      ],
    },
  },
  {
    id: "mes",
    shortLabel: "MES",
    title: "MES",
    type: "Manufacturing operations",
    implementation: "Libre MES · Docker Compose",
    icon: "Charts",
    purpose:
      "Tracks products, order performance, availability, quality, and production-rate measurements for the line.",
    build:
      "A Libre MES stack with seeded operational and time-series data, dashboards, and a REST-facing data service.",
    components: ["PostgreSQL", "InfluxDB", "Grafana", "PostgREST"],
    position: { left: "2%", top: "27%", width: "28%" },
    links: [
      {
        label: "Open Leafy MES",
        href: "https://factory-simulator-mes.industrysolutions.staging.corp.mongodb.com/?orgId=1",
      },
    ],
    sampleLabel: "MES order update",
    sample: {
      event_type: "order_update",
      source: "mes",
      timestamp: "2026-09-10T16:06:20Z",
      order: {
        id: "123456",
        product_id: "1",
        product_desc: "EV-PM-4C-S",
        line: "Leafy Factory | Module Assembly | EV Line",
        state: "running",
        quantity: 10,
        issued_qty: 1,
        planned_rate: 60,
      },
    },
  },
  {
    id: "scada",
    shortLabel: "SCADA",
    title: "SCADA",
    type: "Supervisory control",
    implementation: "Python · FastAPI service",
    icon: "Charts",
    purpose:
      "Gives an operator a per-order view of line state and controls the start, pause, and stop lifecycle.",
    build:
      "A Python/FastAPI service renders the SCADA UI and exposes order-scoped state and control endpoints.",
    components: ["FastAPI", "Browser UI", "Order-scoped REST API"],
    position: { left: "2%", top: "56%", width: "28%" },
    links: [
      {
        label: "Open Leafy SCADA",
        href: "https://factory-simulator.industrysolutions.staging.corp.mongodb.com/scada",
      },
    ],
    sampleLabel: "SCADA line state",
    sample: {
      order_id: ORDER_ID,
      status: "running",
      current_station: "Laser Tab Welding",
      current_batch: 1,
      completed_units: 0,
      target_quantity: 10,
      last_updated: "2026-09-10T16:06:12Z",
    },
  },
  {
    id: "machines",
    shortLabel: "Machines",
    title: "Machine simulators",
    type: "Physical process simulation",
    implementation: "Python · in-process runtime",
    icon: "Wrench",
    purpose:
      "Simulates each machine, its cycle, measurements, quality result, and the genealogy of cells moving through the line.",
    build:
      "Python station functions generate deterministic process metrics while an in-process runtime advances each order.",
    components: ["Order runtime", "Station models", "Metric generators", "Line-state model"],
    position: { left: "2%", top: "80%", width: "28%" },
    links: [
      {
        label: "View simulator source",
        href: "https://github.com/mongodb-industry-solutions/ist-factory-simulator/tree/main/virtual-factory/src/simulation",
      },
    ],
    sampleLabel: "Machine station event",
    sample: stationEvent("Laser Tab Welding", {
      laser_power_w: 612,
      weld_ok: true,
      weld_points: 6,
      cell_ids: [1, 2, 3, 4],
    }),
  },
  {
    id: "mqtt",
    shortLabel: "MQTT",
    title: "MQTT broker",
    type: "Event backbone",
    implementation: "Eclipse Mosquitto · Docker service",
    icon: "Diagram",
    purpose:
      "Decouples station publishers from operational consumers and carries line state, station, and MES events.",
    build:
      "Eclipse Mosquitto runs as a dedicated broker service. The separate Python simulator connects to it through Paho MQTT clients.",
    components: ["Eclipse Mosquitto", "Broker configuration", "MQTT port 1883"],
    position: { left: "36%", top: "56%", width: "28%" },
    links: [
      {
        label: "Mosquitto project",
        href: "https://mosquitto.org/",
      },
      {
        label: "View broker configuration",
        href: "https://github.com/mongodb-industry-solutions/ist-factory-simulator/blob/main/virtual-factory/mosquitto/mosquitto.conf",
      },
    ],
    sampleLabel: "Published MQTT message",
    sample: {
      topic: "factory/ev-line/stations/Laser-Tab-Welding",
      qos: 0,
      retain: false,
      payload: stationEvent("Laser Tab Welding", {
        laser_power_w: 612,
        weld_ok: true,
        weld_points: 6,
        cell_ids: [1, 2, 3, 4],
      }),
    },
  },
  {
    id: "mongodb",
    shortLabel: "MongoDB",
    title: "MongoDB",
    type: "Unified namespace persistence",
    implementation: "MongoDB · document database",
    icon: "Database",
    purpose:
      "Persists raw events with business context and materializes one traceable production-unit document per completed pack.",
    build:
      "MongoDB stores order context, current MES state, machine events, alerts, and denormalized production genealogy.",
    components: [
      "simulator_orders",
      "orders_current",
      "products",
      "machine_events",
      "production_units",
      "machine_alerts",
      "machine_thresholds",
    ],
    position: { left: "72%", top: "56%", width: "26%" },
    links: [
      {
        label: "MongoDB document model",
        href: "https://www.mongodb.com/docs/manual/data-modeling/",
      },
    ],
    sampleLabel: "Unified production unit",
    sample: {
      order_id: ORDER_ID,
      batch_id: 1,
      order: {
        id: "123456",
        product_id: "1",
        product_desc: "EV-PM-4C-S",
        sales_order: "SAL-ORD-2026-00001",
        customer: "H Motors",
      },
      cells: [
        {
          cell_id: 1,
          ocv_v: 3.72,
          ir_milliohm: 2.1,
          grade: "A",
        },
      ],
      process: {
        laser_welding: {
          laser_power_w: 612,
          weld_points: 6,
          weld_ok: true,
        },
        eol_test: {
          pack_voltage_v: 14.81,
          passed: true,
        },
      },
      final_status: "pass",
    },
  },
];

export const ARCHITECTURE_FLOWS = [
  {
    id: "erp-mongodb",
    from: "erp",
    to: "mongodb",
    label: "Order context",
    path: "M 300 83 H 850 V 381",
  },
  {
    id: "mqtt-mes",
    from: "mqtt",
    to: "mes",
    label: "Production state",
    path: "M 500 381 V 330 H 160 V 296",
  },
  {
    id: "scada-mqtt",
    from: "scada",
    to: "mqtt",
    label: "Machine events",
    path: "M 300 437 H 360",
  },
  {
    id: "mqtt-mongodb",
    from: "mqtt",
    to: "mongodb",
    label: "Contextual events",
    path: "M 640 437 H 720",
  },
  {
    id: "machines-scada",
    from: "machines",
    to: "scada",
    label: "Control and telemetry",
    path: "M 160 544 V 493",
    bidirectional: true,
  },
];

export const ARCHITECTURE_DETAIL_GROUPS = [
  {
    id: "erp",
    position: { x: 20, y: 20, width: 370, height: 300 },
    nodes: [
      {
        id: "erp-frontend",
        label: "ERPNext frontend",
        kind: "Interface",
        icon: "Charts",
        position: { x: 40, y: 70, width: 150 },
      },
      {
        id: "erp-backend",
        label: "ERPNext backend",
        kind: "Service",
        icon: "Diagram",
        position: { x: 220, y: 70, width: 150 },
      },
      {
        id: "erp-mariadb",
        label: "MariaDB",
        kind: "Database",
        icon: "Database",
        position: { x: 40, y: 165, width: 150 },
      },
      {
        id: "erp-redis-cache",
        label: "Redis cache",
        kind: "Cache",
        icon: "Database",
        position: { x: 220, y: 165, width: 150 },
      },
      {
        id: "erp-redis-queue",
        label: "Redis queue",
        kind: "Queue",
        icon: "Diagram",
        position: { x: 130, y: 245, width: 150 },
      },
    ],
  },
  {
    id: "mes",
    position: { x: 415, y: 20, width: 370, height: 300 },
    nodes: [
      {
        id: "mes-postgres",
        label: "PostgreSQL",
        kind: "Operational data",
        icon: "Database",
        position: { x: 435, y: 70, width: 150 },
      },
      {
        id: "mes-influx",
        label: "InfluxDB",
        kind: "Time series",
        icon: "Database",
        position: { x: 615, y: 70, width: 150 },
      },
      {
        id: "mes-postgrest",
        label: "PostgREST",
        kind: "Data API",
        icon: "Diagram",
        position: { x: 435, y: 210, width: 150 },
      },
      {
        id: "mes-grafana",
        label: "Grafana",
        kind: "Dashboards",
        icon: "Charts",
        position: { x: 615, y: 210, width: 150 },
      },
    ],
  },
  {
    id: "mongodb",
    position: { x: 810, y: 20, width: 370, height: 300 },
    nodes: [
      {
        id: "mongo-simulator-orders",
        label: "simulator_orders",
        kind: "Collection",
        icon: "Database",
        position: { x: 830, y: 70, width: 150 },
      },
      {
        id: "mongo-orders-current",
        label: "orders_current",
        kind: "Collection",
        icon: "Database",
        position: { x: 1010, y: 70, width: 150 },
      },
      {
        id: "mongo-products",
        label: "products",
        kind: "Collection",
        icon: "Database",
        position: { x: 830, y: 160, width: 150 },
      },
      {
        id: "mongo-events",
        label: "machine_events",
        kind: "Collection",
        icon: "Database",
        position: { x: 1010, y: 160, width: 150 },
      },
      {
        id: "mongo-units",
        label: "production_units",
        kind: "Collection",
        icon: "Database",
        position: { x: 830, y: 250, width: 150 },
      },
      {
        id: "mongo-maintenance",
        label: "Maintenance data",
        kind: "Alerts + thresholds",
        icon: "Warning",
        position: { x: 1010, y: 250, width: 150 },
      },
    ],
  },
  {
    id: "machines",
    position: { x: 20, y: 400, width: 370, height: 300 },
    nodes: [
      {
        id: "machines-orders",
        label: "Order service",
        kind: "ERP + MES orchestration",
        icon: "Diagram",
        position: { x: 40, y: 455, width: 150 },
      },
      {
        id: "machines-runtime",
        label: "Order runtime",
        kind: "In-process thread",
        icon: "Diagram",
        position: { x: 220, y: 455, width: 150 },
      },
      {
        id: "machines-line-state",
        label: "Line-state model",
        kind: "Runtime state",
        icon: "Diagram",
        position: { x: 40, y: 590, width: 150 },
      },
      {
        id: "machines-stations",
        label: "Station simulation",
        kind: "Metrics + process events",
        icon: "Wrench",
        position: { x: 220, y: 590, width: 150 },
      },
    ],
  },
  {
    id: "scada",
    position: { x: 415, y: 400, width: 370, height: 300 },
    nodes: [
      {
        id: "scada-browser",
        label: "Browser UI",
        kind: "HTTP polling",
        icon: "Charts",
        position: { x: 435, y: 475, width: 150 },
      },
      {
        id: "scada-fastapi",
        label: "SCADA API",
        kind: "SCADA API",
        icon: "Diagram",
        position: { x: 615, y: 475, width: 150 },
      },
      {
        id: "scada-mqtt-clients",
        label: "Paho MQTT client",
        kind: "Publisher + subscribers",
        icon: "Diagram",
        position: { x: 435, y: 590, width: 150 },
      },
      {
        id: "scada-workers",
        label: "Event workers",
        kind: "Consumers + MES poller",
        icon: "Diagram",
        position: { x: 615, y: 590, width: 150 },
      },
    ],
  },
  {
    id: "mqtt",
    position: { x: 810, y: 400, width: 370, height: 300 },
    nodes: [
      {
        id: "mqtt-mosquitto",
        label: "Eclipse Mosquitto",
        kind: "MQTT broker sidecar",
        icon: "Diagram",
        position: { x: 920, y: 520, width: 150 },
      },
    ],
  },
];

export const ARCHITECTURE_DETAIL_FLOWS = [
  {
    id: "erp-frontend-backend",
    from: "erp-frontend",
    to: "erp-backend",
    label: "HTTPS",
    path: "M 190 96 H 220",
    labelPosition: { x: 205, y: 56 },
  },
  {
    id: "erp-backend-mariadb",
    from: "erp-backend",
    to: "erp-mariadb",
    label: "SQL",
    path: "M 295 122 V 140 H 115 V 165",
    labelPosition: { x: 200, y: 136 },
  },
  {
    id: "erp-backend-cache",
    from: "erp-backend",
    to: "erp-redis-cache",
    label: "cache",
    path: "M 295 122 V 165",
    labelPosition: { x: 318, y: 144 },
  },
  {
    id: "erp-backend-queue",
    from: "erp-backend",
    to: "erp-redis-queue",
    label: "jobs",
    path: "M 295 122 V 140 H 205 V 245",
    labelPosition: { x: 224, y: 214 },
  },
  {
    id: "mes-postgres-postgrest",
    from: "mes-postgres",
    to: "mes-postgrest",
    label: "REST",
    path: "M 510 122 V 210",
    labelPosition: { x: 532, y: 166 },
  },
  {
    id: "mes-postgres-grafana",
    from: "mes-postgres",
    to: "mes-grafana",
    label: "dashboards",
    path: "M 510 122 V 150 H 690 V 210",
    labelPosition: { x: 600, y: 140 },
  },
  {
    id: "mes-influx-grafana",
    from: "mes-influx",
    to: "mes-grafana",
    label: "time series",
    path: "M 690 122 V 210",
    labelPosition: { x: 715, y: 166 },
  },
  {
    id: "machines-orders-runtime",
    from: "machines-orders",
    to: "machines-runtime",
    label: "Order lifecycle",
    path: "M 190 481 H 220",
  },
  {
    id: "machines-runtime-state",
    from: "machines-runtime",
    to: "machines-line-state",
    label: "Runtime state",
    path: "M 295 507 V 550 H 115 V 590",
  },
  {
    id: "machines-runtime-stations",
    from: "machines-runtime",
    to: "machines-stations",
    label: "Station execution",
    path: "M 295 507 V 590",
  },
  {
    id: "machines-stations-scada-mqtt",
    from: "machines-stations",
    to: "scada-mqtt-clients",
    label: "Publish station events",
    path: "M 370 616 H 435",
  },
  {
    id: "scada-mqtt-workers",
    from: "scada-mqtt-clients",
    to: "scada-workers",
    label: "Subscriber callbacks",
    relatedGroups: ["mqtt"],
    path: "M 585 616 H 615",
  },
  {
    id: "scada-api-workers",
    from: "scada-fastapi",
    to: "scada-workers",
    label: "Worker lifecycle",
    path: "M 690 527 V 590",
  },
  {
    id: "scada-browser-api",
    from: "scada-browser",
    to: "scada-fastapi",
    label: "HTTP polling and controls",
    bidirectional: true,
    path: "M 585 501 H 615",
  },
  {
    id: "scada-api-order-service",
    from: "scada-fastapi",
    to: "machines-orders",
    label: "Order lifecycle",
    path: "M 690 527 V 430 H 115 V 455",
  },
  {
    id: "scada-api-line-state",
    from: "scada-fastapi",
    to: "machines-line-state",
    label: "Runtime snapshots",
    path: "M 690 527 V 570 H 115 V 590",
  },
  {
    id: "simulator-mqtt-broker",
    from: "scada-mqtt-clients",
    to: "mqtt-mosquitto",
    label: "MQTT publish and subscribe",
    bidirectional: true,
    path: "M 510 642 V 680 H 995 V 572",
  },
  {
    id: "erp-mongodb-detail",
    from: "erp-backend",
    to: "mongo-orders-current",
    toLabel: "MongoDB",
    label: "Order context",
    path: "M 370 96 V 10 H 995 V 20",
  },
  {
    id: "mqtt-mongodb-detail",
    from: "mqtt-mosquitto",
    to: "mongo-events",
    toLabel: "MongoDB",
    label: "Contextual events",
    path: "M 995 520 V 320",
  },
  {
    id: "mqtt-mes-detail",
    from: "mqtt-mosquitto",
    to: "mes-influx",
    toLabel: "MES",
    label: "Production state",
    path: "M 920 546 H 800 V 350 H 600 V 320",
  },
];

export const FACTORY_SOURCE_URL =
  "https://github.com/mongodb-industry-solutions/ist-factory-simulator";
