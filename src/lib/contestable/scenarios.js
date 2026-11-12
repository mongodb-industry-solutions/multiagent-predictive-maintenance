import { computeCandidateScores, DEFAULT_CANDIDATES } from "./scoring.js";

export const DEFAULT_REFINEMENT_BY_CANDIDATE = {
  misalignment: {
    root_cause:
      "Shaft and fixture misalignment on Machine M1 triggered by the tooling swap two shifts prior (verified via Contestable AI review; bearing replacement 3 weeks ago ruled out primary bearing wear).",
    repair_instructions: [
      {
        step: 1,
        description:
          "Perform precision laser alignment on M1 spindle and tooling fixture assembly to eliminate the post-swap axial offset.",
      },
      {
        step: 2,
        description:
          "Re-torque all fixture clamping bolts using a calibrated torque wrench and record values on checklist #TC-882.",
      },
      {
        step: 3,
        description:
          "Verify 60 Hz (2X) sideband amplitude drops below 0.25 mm/s and overall vibration remains under 1.2 mm/s during a 15-minute load test.",
      },
    ],
  },
  sensor_fault: {
    root_cause:
      "Accelerometer stabilization drift on Machine M1 following sensor replacement 18 hours ago (verified via Contestable AI review; mechanical bearing and alignment failure ruled out).",
    repair_instructions: [
      {
        step: 1,
        description:
          "Cross-check ACCEL-M1-VIB-01 reading against a portable reference vibrometer while M1 runs at standard production load.",
      },
      {
        step: 2,
        description:
          "Inspect sensor mounting stud torque and cable shielding, then apply zero-point offset calibration in the SCADA controller.",
      },
      {
        step: 3,
        description:
          "Monitor sensor baseline over the remaining 48-hour stabilization window before re-enabling automated shutdown triggers.",
      },
    ],
  },
  bearing_degradation: {
    root_cause:
      "Early-stage outer-race bearing degradation (184 Hz BPFO peak) on Machine M1 exacerbated by thermal load (verified via Contestable AI review).",
    repair_instructions: [
      {
        step: 1,
        description:
          "Lock out Machine M1, inspect the spindle bearing housing for lubrication starvation or raceway pitting, and replace the bearing assembly.",
      },
      {
        step: 2,
        description:
          "Flush and prime the automatic lubrication lines and verify oil flow pressure at high RPM.",
      },
      {
        step: 3,
        description:
          "Run a post-replacement vibration spectrum check to confirm the 184 Hz defect band peak returns to baseline (<0.20 mm/s).",
      },
    ],
  },
};

export const CONTESTABLE_AGENTS = [
  {
    id: "vibration_pattern_agent",
    name: "Vibration Pattern Agent",
    shortName: "Vibration Agent",
    role: "Signal & Frequency Spectrum Specialist",
    description:
      "Reads the vibration frequency spectrum at alert time and compares harmonic peaks and sidebands against known defect bands for the equipment model.",
    sources: [
      "Vibration frequency spectrum (FFT)",
      "Equipment model defect bands",
      "Time-series alert telemetry",
    ],
  },
  {
    id: "maintenance_history_agent",
    name: "Maintenance History Agent",
    shortName: "Maintenance Agent",
    role: "Maintenance, Calibration & Tooling Specialist",
    description:
      "Reads repair logs, sensor calibration records, tooling swap history, and the equipment manual to argue for or against each candidate.",
    sources: [
      "Maintenance & repair work orders",
      "Sensor calibration logs",
      "Tooling change history & equipment manual",
    ],
  },
];

export const ENGINEER_PRESET_SUGGESTIONS = [
  {
    id: "preset_alignment_verify",
    label: "Field Check: Post-swap alignment was visual only (Support Misalignment)",
    candidate: "misalignment",
    stance: "support",
    score: 0.85,
    reason:
      "Floor inspection confirmed the post-tooling-swap check was visual only; laser dial indicator shows a 0.18 mm fixture offset on the press/welding head.",
  },
  {
    id: "preset_sensor_window",
    label: "Calibration Log: Accelerometer burn-in drift confirmed (Support Sensor Fault)",
    candidate: "sensor_fault",
    stance: "support",
    score: 0.85,
    reason:
      "Cross-checking with a portable reference vibrometer read 0.92 mm/s steady, confirming the newly installed accelerometer is reading +0.65 mm/s high during its 48h stabilization window.",
  },
  {
    id: "preset_bearing_acoustic",
    label: "Ultrasound Check: Bearing raceway pitting detected (Support Bearing Degradation)",
    candidate: "bearing_degradation",
    stance: "support",
    score: 0.85,
    reason:
      "Handheld ultrasonic probe on spindle housing measured +14 dB spike at BPFO (ball pass frequency outer race), indicating infant mortality on the replacement bearing.",
  },
];

export const STANDALONE_PRESET_SCENARIOS = [
  {
    id: "stamping-press-benchmark",
    title: "M1 · High Vibration & Thermal Spike (E13 / E12)",
    subtitle: "Laser Tab Welding & Stamping Press Unit (CentriMax / Leafy EV Line)",
    machine_id: "M1",
    equipment_model: "Leafy EV-Weld & Stamping Press Model SP-2000",
    error_code: "E13",
    error_name: "High vibration & temperature spike",
    alert: {
      _id: "alert-benchmark-4471",
      err_code: "E13",
      err_name: "High vibration",
      machine_id: "M1",
      station: "Laser Tab Welding",
      details: {
        temperature: 93.4,
        vibration: 1.68,
      },
      ts: new Date().toISOString(),
    },
    initial_root_cause:
      "Suspected bearing degradation on machine M1 based on elevated vibration (1.68 mm/s) and thermal rise (93.4 °C) exceeding safety thresholds.",
    initial_repair_instructions: [
      {
        step: 1,
        description:
          "Lock out machine M1 and disassemble spindle housing to inspect and replace primary shaft bearing.",
      },
      {
        step: 2,
        description:
          "Flush lubrication lines and verify oil pump flow rate before reassembly.",
      },
      {
        step: 3,
        description:
          "Run unloaded test cycle for 30 minutes and verify vibration remains below 1.2 mm/s.",
      },
    ],
  },
];

/**
 * Default benchmark arguments matching the exact specification example.
 * Used as fallback or baseline reference when deterministic benchmark mode is needed.
 */
export function buildBenchmarkArguments(sessionId = "incident-4471") {
  const nowIso = new Date().toISOString();
  return [
    // Vibration Pattern Agent (6 arguments: support + challenge for each of 3 candidates)
    {
      argument_id: `${sessionId}_vib_bearing_support`,
      session_id: sessionId,
      candidate: "bearing_degradation",
      agent: "vibration_pattern_agent",
      stance: "support",
      score: 0.75,
      reason:
        "Frequency signature matches the known defect band for this press model.",
      evidence_refs: ["FFT spectrum 184 Hz BPFO peak", "Model SP-2000 defect table"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_vib_bearing_challenge`,
      session_id: sessionId,
      candidate: "bearing_degradation",
      agent: "vibration_pattern_agent",
      stance: "challenge",
      score: 0.25,
      reason:
        "The same harmonic pattern also shows up in early-stage misalignment.",
      evidence_refs: ["2X/3X running speed harmonic overlap"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_vib_misalignment_support`,
      session_id: sessionId,
      candidate: "misalignment",
      agent: "vibration_pattern_agent",
      stance: "support",
      score: 0.4,
      reason: "Sideband frequencies present in the spectrum.",
      evidence_refs: ["1X/2X axial sideband modulation (+18 Hz)"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_vib_misalignment_challenge`,
      session_id: sessionId,
      candidate: "misalignment",
      agent: "vibration_pattern_agent",
      stance: "challenge",
      score: 0.3,
      reason: "The dominant peak reads more like pure bearing wear.",
      evidence_refs: ["Dominant radial peak at 184 Hz vs 60 Hz 2X"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_vib_sensor_support`,
      session_id: sessionId,
      candidate: "sensor_fault",
      agent: "vibration_pattern_agent",
      stance: "support",
      score: 0.2,
      reason: "A recently replaced sensor can introduce noise.",
      evidence_refs: ["Broadband noise floor above 1.2 kHz"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_vib_sensor_challenge`,
      session_id: sessionId,
      candidate: "sensor_fault",
      agent: "vibration_pattern_agent",
      stance: "challenge",
      score: 0.55,
      reason: "The reading has stayed stable across the last six checks.",
      evidence_refs: ["6 consecutive 10-min telemetry windows at 1.64–1.69 mm/s"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },

    // Maintenance History Agent (6 arguments: support + challenge for each of 3 candidates)
    {
      argument_id: `${sessionId}_maint_bearing_support`,
      session_id: sessionId,
      candidate: "bearing_degradation",
      agent: "maintenance_history_agent",
      stance: "support",
      score: 0.35,
      reason: "Bearing hours are close to rated life.",
      evidence_refs: ["Cumulative spindle runtime log"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_maint_bearing_challenge`,
      session_id: sessionId,
      candidate: "bearing_degradation",
      agent: "maintenance_history_agent",
      stance: "challenge",
      score: 0.85,
      reason: "This exact bearing was replaced three weeks ago.",
      evidence_refs: ["WO-2025-0409: Bearing replacement completed 21 days ago"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_maint_misalignment_support`,
      session_id: sessionId,
      candidate: "misalignment",
      agent: "maintenance_history_agent",
      stance: "support",
      score: 0.7,
      reason:
        "A tooling swap two shifts before the alert is a known alignment trigger.",
      evidence_refs: ["Shift log: Tooling die & fixture swap 2 shifts prior"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_maint_misalignment_challenge`,
      session_id: sessionId,
      candidate: "misalignment",
      agent: "maintenance_history_agent",
      stance: "challenge",
      score: 0.35,
      reason: "Alignment was checked and signed off after the swap.",
      evidence_refs: ["Checklist #TC-882 signed off after swap"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_maint_sensor_support`,
      session_id: sessionId,
      candidate: "sensor_fault",
      agent: "maintenance_history_agent",
      stance: "support",
      score: 0.7,
      reason:
        "The accelerometer was replaced the day before and has not cleared its stabilization window.",
      evidence_refs: ["Calibration log #CAL-119: Sensor installed 18h ago (48h window)"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
    {
      argument_id: `${sessionId}_maint_sensor_challenge`,
      session_id: sessionId,
      candidate: "sensor_fault",
      agent: "maintenance_history_agent",
      stance: "challenge",
      score: 0.3,
      reason: "The replacement passed factory calibration before install.",
      evidence_refs: ["OEM Certificate of Calibration (±0.02 mm/s)"],
      created_at: nowIso,
      status: "active",
      human_action: null,
    },
  ];
}

export function getCandidateById(candidateId, candidates = DEFAULT_CANDIDATES) {
  return (
    candidates.find((c) => c.id === candidateId) || {
      id: candidateId,
      label: String(candidateId || "")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      shortLabel: String(candidateId || ""),
    }
  );
}

/**
 * Synchronous initial state builder so the UI renders Step 1 immediately
 * with zero loading spinner on open, while MongoDB persistence runs in the background.
 */
export function buildInitialClientSession({
  incident = null,
  alert = null,
  dataSource = "leafy",
} = {}) {
  const sessionId = "incident-4471";
  const machineId = incident?.machine_id || alert?.machine_id || "M1";
  const errorName =
    incident?.error_name ||
    alert?.err_name ||
    STANDALONE_PRESET_SCENARIOS[0].error_name;
  const errorCode =
    incident?.error_code ||
    alert?.err_code ||
    STANDALONE_PRESET_SCENARIOS[0].error_code;

  const candidates = DEFAULT_CANDIDATES.map((c, idx) => ({
    ...c,
    similarity_score: [0.89, 0.86, 0.84][idx] || 0.85,
    historical_case: {
      title: c.sourceCase,
      observations: c.summary,
      root_cause: c.label,
      score: [0.89, 0.86, 0.84][idx] || 0.85,
    },
  }));

  const rawArgs = buildBenchmarkArguments(sessionId);
  const scored = computeCandidateScores(rawArgs, candidates);

  const session = {
    session_id: sessionId,
    machine_id: machineId,
    data_source: dataSource,
    incident_id: incident?._id ? String(incident._id) : null,
    error_code: errorCode,
    error_name: errorName,
    candidates,
    scores_before: scored.candidateScores,
    scores_after: scored.candidateScores,
    winning_candidate_before: scored.winningCandidate,
    winning_candidate: scored.winningCandidate,
    evidence_summary: {
      vibration_spectrum: {
        machine_id: machineId,
        equipment_model:
          dataSource === "leafy"
            ? "Leafy Factory Laser Tab Welder & Stamping Press (Model SP-2000)"
            : "CentriMax 2000 / Stamping Press Unit M1",
        overall_rms_mm_s: 1.68,
        temperature_c: 93.4,
        threshold_mm_s: 1.2,
        frequency_bands: [
          {
            band_hz: "30 Hz (1X Running Speed)",
            amplitude_mm_s: 0.42,
            baseline_mm_s: 0.35,
            notes: "Slight elevation at fundamental shaft speed",
          },
          {
            band_hz: "60 Hz (2X Axial / Radial)",
            amplitude_mm_s: 0.58,
            baseline_mm_s: 0.25,
            notes:
              "2X harmonic with ±18 Hz sidebands (characteristic of angular misalignment or early bearing wear)",
          },
          {
            band_hz: "184 Hz (BPFO Defect Band)",
            amplitude_mm_s: 0.94,
            baseline_mm_s: 0.18,
            notes:
              "Dominant peak inside the Model SP-2000 outer-race bearing defect band (180–190 Hz)",
          },
          {
            band_hz: "1,200–2,500 Hz (High-Freq Floor)",
            amplitude_mm_s: 0.29,
            baseline_mm_s: 0.14,
            notes:
              "Mild broadband floor lift often seen after new piezoelectric accelerometer installation",
          },
        ],
      },
      maintenance_history: {
        machine_id: machineId,
        repair_logs: [
          {
            date: "3 weeks ago",
            work_order: "WO-2026-0412",
            component: "Primary Spindle / Press Bearing Assembly",
            action:
              "Replaced exact primary bearing assembly on M1 during scheduled overhaul; cumulative machine frame hours are near rated life, but this specific bearing has only 21 days of service.",
            status: "completed",
          },
          {
            date: "2 shifts ago",
            work_order: "CHG-2026-0889",
            component: "Tooling Die & Laser Welding Fixture",
            action:
              "Performed heavy tooling swap for new EV module batch. Post-swap alignment was signed off on shift checklist #TC-882.",
            status: "completed",
          },
        ],
        calibration_records: [
          {
            sensor_id: "ACCEL-M1-VIB-01",
            sensor_type: "Tri-axial Piezoelectric Accelerometer",
            replaced_at: "1 day ago",
            stabilization_window:
              "Requires 48-hour thermal/mechanical burn-in stabilization window; currently at 18 hours.",
            factory_calibration:
              "Passed OEM factory bench calibration (±0.02 mm/s certificate) prior to installation.",
          },
        ],
      },
    },
  };

  return {
    session,
    arguments: scored.arguments,
    candidateScores: scored.candidateScores,
    winningCandidate: scored.winningCandidate,
  };
}

