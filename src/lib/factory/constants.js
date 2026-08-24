export const FACTORY_SOURCES = {
  LOCAL: "local",
  LEAFY: "leafy",
};

export const PRODUCTS = [
  {
    id: "1",
    code: "EV-PM-4C-S",
    name: "4-cell series battery module",
  },
  {
    id: "2",
    code: "EV-PM-4C-P",
    name: "4-cell parallel battery module",
  },
];

export const FACTORY_STATIONS = [
  {
    name: "Cell Screening",
    shortName: "Screening",
    input: "Incoming cylindrical cells",
    output: "Graded cells",
    description:
      "Measures open-circuit voltage and internal resistance, then grades every cell before assembly.",
    metrics: ["ocv_v", "ir_milliohm", "grade"],
  },
  {
    name: "Tab Processing",
    shortName: "Tabs",
    input: "Graded cells",
    output: "Cells with processed tabs",
    description:
      "Prepares and inspects cell tabs so downstream joining processes receive consistent material.",
    metrics: ["tab_length_mm", "tab_thickness_mm", "surface_ok"],
  },
  {
    name: "Z-Fold Stacking",
    shortName: "Z-fold",
    input: "Prepared cells and separator",
    output: "Completed cell stack",
    description:
      "Builds the electrochemical stack while tracking alignment, height, and layer count.",
    metrics: ["layer_count", "stack_height_mm", "alignment_ok"],
  },
  {
    name: "Module Pre-Assembly",
    shortName: "Assembly",
    input: "Completed stack",
    output: "Mechanically assembled module",
    description:
      "Positions the stack in the module structure and applies controlled clamping force.",
    metrics: ["fit_align_mm", "clamp_force_n", "module_id"],
  },
  {
    name: "Laser Tab Welding",
    shortName: "Laser weld",
    input: "Assembled module",
    output: "Welded module",
    description:
      "Joins cell tabs with a monitored laser process. Temperature and vibration thresholds drive maintenance alerts.",
    metrics: ["laser_power_w", "weld_points", "weld_ok"],
  },
  {
    name: "Ultrasonic Busbar Welding",
    shortName: "Busbar",
    input: "Welded module",
    output: "Electrically complete module",
    description:
      "Connects busbars using ultrasonic energy and verifies weld duration and quality.",
    metrics: ["weld_energy_j", "weld_time_ms", "weld_ok"],
  },
  {
    name: "TIM Dispensing & Cooling Plate Assembly",
    shortName: "Thermal",
    input: "Electrically complete module",
    output: "Module with cooling plate",
    description:
      "Dispenses thermal interface material and aligns the cooling plate for efficient heat transfer.",
    metrics: ["tim_volume_ml", "tim_thickness_mm", "align_offset_mm"],
  },
  {
    name: "Pouch / Pack Sealing",
    shortName: "Sealing",
    input: "Cooled module",
    output: "Sealed battery pack",
    description:
      "Seals the pack under controlled temperature and pressure before leak testing.",
    metrics: ["seal_temp_c", "seal_pressure_kpa", "seal_ok"],
  },
  {
    name: "Helium Leak Test",
    shortName: "Leak test",
    input: "Sealed battery pack",
    output: "Leak-tested pack",
    description:
      "Checks enclosure integrity with helium and records the measured leak rate.",
    metrics: ["leak_rate_pa_l_s", "test_pressure_kpa", "pass"],
  },
  {
    name: "Pack EOL Test",
    shortName: "EOL",
    input: "Leak-tested pack",
    output: "Validated production unit",
    description:
      "Performs final electrical and insulation tests before releasing the completed pack.",
    metrics: [
      "pack_voltage_v",
      "pack_current_a",
      "insulation_resistance_mohm",
      "pass",
    ],
  },
];

export const DEFAULT_THRESHOLDS = {
  temperature_threshold: 80,
  vibration_threshold: 50,
};
