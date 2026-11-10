import getMongoClientPromise from "@/integrations/mongodb/client.js";
import { vectorSearch } from "@/integrations/mongodb/vectorSearch.js";
import { createActivityLog } from "./activityLog.js";
import { DEFAULT_CANDIDATES } from "./scoring.js";
import { STANDALONE_PRESET_SCENARIOS } from "./scenarios.js";

function summarizeEvidenceHit(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const text = typeof doc.text === "string" ? doc.text.slice(0, 280) : undefined;
  const observations =
    typeof doc.observations === "string" ? doc.observations.slice(0, 280) : undefined;
  return {
    title: doc.title || doc.section || doc.role || undefined,
    score: doc.score,
    root_cause: doc["root cause"] || doc.root_cause,
    section: doc.section,
    role: doc.role,
    observations,
    text,
  };
}

function summarizeTelemetry(doc) {
  if (!doc || typeof doc !== "object") return doc;
  return {
    ts: doc.ts,
    temperature: doc.temperature,
    vibration: doc.vibration,
    machine_id: doc.metadata?.machine_id,
  };
}

async function tracedSearch(activity, { name, input, run }) {
  const runId = await activity.toolStart(name, input);
  try {
    const rows = (await run()) || [];
    await activity.toolEnd(runId, name, {
      hit_count: rows.length,
      hits: rows.slice(0, 4).map(summarizeEvidenceHit),
    });
    return rows;
  } catch (error) {
    await activity.toolError(runId, name, error?.message || "Search failed");
    return [];
  }
}

async function tracedRead(activity, { name, input, run, summarize = summarizeEvidenceHit }) {
  const runId = await activity.toolStart(name, input);
  try {
    const rows = (await run()) || [];
    await activity.toolEnd(runId, name, {
      hit_count: rows.length,
      hits: rows.slice(0, 4).map(summarize),
    });
    return rows;
  } catch (error) {
    await activity.toolError(runId, name, error?.message || "Read failed");
    return [];
  }
}

/**
 * Map a historical work order document to one of the 3 canonical root cause candidates
 * or enrich the fixed 3 candidates with the retrieved historical cases.
 */
function matchWorkOrderToCandidateId(wo, usedIds) {
  const text = [
    wo?.title || "",
    wo?.observations || "",
    wo?.["root cause"] || "",
    wo?.root_cause || "",
    wo?.instructions || "",
  ]
    .join(" ")
    .toLowerCase();

  if (
    !usedIds.has("sensor_fault") &&
    (text.includes("sensor") ||
      text.includes("calibration") ||
      text.includes("false trigger") ||
      text.includes("drift"))
  ) {
    return "sensor_fault";
  }
  if (
    !usedIds.has("misalignment") &&
    (text.includes("align") ||
      text.includes("balanc") ||
      text.includes("impeller") ||
      text.includes("fixture") ||
      text.includes("tooling"))
  ) {
    return "misalignment";
  }
  if (
    !usedIds.has("bearing_degradation") &&
    (text.includes("bearing") ||
      text.includes("lubricat") ||
      text.includes("wear") ||
      text.includes("spindle"))
  ) {
    return "bearing_degradation";
  }
  for (const cand of DEFAULT_CANDIDATES) {
    if (!usedIds.has(cand.id)) return cand.id;
  }
  return "bearing_degradation";
}

/**
 * Gather evidence from MongoDB (Vector Search over workorders, manuals, interviews,
 * plus recent telemetry/alerts) for a given incident or alert.
 *
 * Pulls the 3 most similar past failure cases to ground the fixed list of 3 candidates,
 * and constructs the specialized inputs for:
 *  1. vibration_pattern_agent (frequency spectrum, harmonics, defect bands)
 *  2. maintenance_history_agent (repair logs, calibration dates, tooling history, manual sections)
 */
export async function gatherContestableEvidence({
  incident = null,
  alert = null,
  machineId = "M1",
  dataSource = "leafy",
  log,
} = {}) {
  const activity = log || createActivityLog();
  const defaultScenario = STANDALONE_PRESET_SCENARIOS[0];
  const resolvedMachineId =
    incident?.machine_id || alert?.machine_id || machineId || "M1";
  const errorName =
    incident?.error_name ||
    alert?.err_name ||
    defaultScenario.error_name;
  const errorCode =
    incident?.error_code ||
    alert?.err_code ||
    defaultScenario.error_code;

  const queryText = [
    `Machine ${resolvedMachineId}`,
    errorCode,
    errorName,
    incident?.root_cause || "vibration and temperature spike bearing misalignment sensor calibration",
  ].join(" ");

  await activity.addMessage(
    "system",
    "Root Cause Agent gathers candidate root causes and the evidence the specialist agents will read. It searches similar work orders, manuals, and technician interviews, then reads recent telemetry."
  );
  await activity.addMessage(
    "user",
    `Machine ${resolvedMachineId} · ${errorCode} ${errorName}\nQuery: ${queryText}`
  );

  const searchInput = {
    query: queryText,
    machine_id: resolvedMachineId,
    error_code: errorCode,
  };

  let similarWorkOrders = [];
  let manualSections = [];
  let technicianInterviews = [];
  let recentTelemetry = [];

  const [woResults, manualResults, interviewResults] = await Promise.all([
    tracedSearch(activity, {
      name: "search_workorders",
      input: { ...searchInput, limit: 6 },
      run: () =>
        vectorSearch(
          queryText,
          {
            collection: "workorders",
            indexName: "default",
            textKey: ["title", "observations", "instructions", "root cause"],
            embeddingKey: "embedding",
            includeScore: true,
          },
          6,
          {
            project: {
              machine_id: 1,
              created_at: 1,
              required_skills: 1,
              "root cause": 1,
              root_cause: 1,
            },
          }
        ),
    }),
    tracedSearch(activity, {
      name: "search_manuals",
      input: { ...searchInput, limit: 3 },
      run: () =>
        vectorSearch(
          queryText,
          {
            collection: "manuals",
            indexName: "default",
            textKey: ["section", "text"],
            embeddingKey: "embedding",
            includeScore: true,
          },
          3,
          { project: { pages: 1 } }
        ),
    }),
    tracedSearch(activity, {
      name: "search_interviews",
      input: { ...searchInput, limit: 3 },
      run: () =>
        vectorSearch(
          queryText,
          {
            collection: "interviews",
            indexName: "default",
            textKey: ["role", "text"],
            embeddingKey: "embedding",
            includeScore: true,
          },
          3,
          { project: { employee_id: 1, creation_date: 1 } }
        ),
    }),
  ]);

  similarWorkOrders = woResults;
  manualSections = manualResults;
  technicianInterviews = interviewResults;

  try {
    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    if (dbName) {
      const db = client.db(dbName);
      if (similarWorkOrders.length === 0) {
        similarWorkOrders = await tracedRead(activity, {
          name: "read_workorders",
          input: {
            reason: "Vector search returned no work orders",
            limit: 6,
          },
          run: () =>
            db
              .collection("workorders")
              .find({}, { projection: { _id: 0, embedding: 0 } })
              .limit(6)
              .toArray(),
        });
      }
      if (manualSections.length === 0) {
        manualSections = await tracedRead(activity, {
          name: "read_manuals",
          input: {
            reason: "Vector search returned no manual sections",
            limit: 4,
          },
          run: () =>
            db
              .collection("manuals")
              .find({}, { projection: { _id: 0, embedding: 0 } })
              .limit(4)
              .toArray(),
        });
      }
      if (technicianInterviews.length === 0) {
        technicianInterviews = await tracedRead(activity, {
          name: "read_interviews",
          input: {
            reason: "Vector search returned no interviews",
            limit: 4,
          },
          run: () =>
            db
              .collection("interviews")
              .find({}, { projection: { _id: 0, embedding: 0 } })
              .limit(4)
              .toArray(),
        });
      }
      recentTelemetry = await tracedRead(activity, {
        name: "read_recent_telemetry",
        input: { machine_id: resolvedMachineId, limit: 6 },
        summarize: summarizeTelemetry,
        run: () =>
          db
            .collection("telemetry")
            .find(
              { "metadata.machine_id": resolvedMachineId },
              { projection: { _id: 0 } }
            )
            .sort({ ts: -1 })
            .limit(6)
            .toArray(),
      });
    }
  } catch (err) {
    console.warn("Direct DB fallback in gatherContestableEvidence:", err?.message);
    await activity.addStatus(
      "error",
      err?.message || "Direct database read failed"
    );
  }

  // Map top historical cases onto our 3 fixed candidates
  const usedIds = new Set();
  const matchedByCandidate = {};
  for (const wo of similarWorkOrders) {
    if (usedIds.size >= 3) break;
    const candId = matchWorkOrderToCandidateId(wo, usedIds);
    if (!usedIds.has(candId)) {
      usedIds.add(candId);
      matchedByCandidate[candId] = wo;
    }
  }

  const candidates = DEFAULT_CANDIDATES.map((baseCand, idx) => {
    const matchedWo = matchedByCandidate[baseCand.id] || similarWorkOrders[idx] || null;
    const similarityScore = matchedWo?.score
      ? Math.round(Number(matchedWo.score) * 1000) / 1000
      : [0.892, 0.864, 0.841][idx] || 0.85;
    return {
      ...baseCand,
      similarity_score: similarityScore,
      historical_case: matchedWo
        ? {
            title: matchedWo.title || baseCand.sourceCase,
            observations: matchedWo.observations || baseCand.summary,
            instructions: matchedWo.instructions || "",
            root_cause:
              matchedWo["root cause"] || matchedWo.root_cause || baseCand.label,
            score: similarityScore,
          }
        : {
            title: baseCand.sourceCase,
            observations: baseCand.summary,
            root_cause: baseCand.label,
            score: similarityScore,
          },
    };
  });

  const latestTemp =
    alert?.details?.temperature ??
    recentTelemetry[0]?.temperature ??
    93.4;
  const latestVib =
    alert?.details?.vibration ??
    recentTelemetry[0]?.vibration ??
    1.68;

  // Vibration frequency spectrum packet for vibration_pattern_agent
  const vibrationSpectrum = {
    machine_id: resolvedMachineId,
    equipment_model:
      dataSource === "leafy"
        ? "Leafy Factory Laser Tab Welder & Stamping Press (Model SP-2000 / CentriMax)"
        : "CentriMax 2000 / Stamping Press Unit M1",
    captured_at: alert?.ts || incident?.ts || new Date().toISOString(),
    overall_rms_mm_s: Number(latestVib),
    temperature_c: Number(latestTemp),
    threshold_mm_s: 1.2,
    recent_checks: [
      { check: -5, rms_mm_s: 1.64, temp_c: 91.2 },
      { check: -4, rms_mm_s: 1.66, temp_c: 91.8 },
      { check: -3, rms_mm_s: 1.65, temp_c: 92.1 },
      { check: -2, rms_mm_s: 1.67, temp_c: 92.9 },
      { check: -1, rms_mm_s: 1.66, temp_c: 93.1 },
      { check: 0, rms_mm_s: Number(latestVib), temp_c: Number(latestTemp) },
    ],
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
        notes: "2X harmonic with ±18 Hz sidebands (characteristic of angular misalignment or early bearing wear)",
      },
      {
        band_hz: "184 Hz (BPFO Defect Band)",
        amplitude_mm_s: 0.94,
        baseline_mm_s: 0.18,
        notes: "Dominant peak inside the Model SP-2000 outer-race bearing defect band (180–190 Hz)",
      },
      {
        band_hz: "1,200–2,500 Hz (High-Freq Floor)",
        amplitude_mm_s: 0.29,
        baseline_mm_s: 0.14,
        notes: "Mild broadband floor lift often seen after new piezoelectric accelerometer installation",
      },
    ],
    model_defect_reference: {
      bearing_degradation_band:
        "180–190 Hz (BPFO) dominant peak with 2X/3X harmonics; Note: early-stage fixture misalignment under high clamping load can excite the same 184 Hz structural resonance.",
      misalignment_band:
        "2X running speed (60 Hz) axial/radial peak with ±18 Hz sideband modulation.",
      sensor_fault_signature:
        "Erratic step changes, zero-point drift, or erratic spikes across consecutive checks; steady readings across 6+ checks argue against random sensor noise.",
    },
  };

  // Maintenance history packet for maintenance_history_agent
  const maintenanceHistory = {
    machine_id: resolvedMachineId,
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
      ...similarWorkOrders.slice(0, 3).map((wo, i) => ({
        date: `Precedent #${i + 1}`,
        work_order: wo.title || `WO-HIST-${i + 1}`,
        component: "Machine M1",
        action: `${wo.observations || ""} — Resolution: ${wo.instructions || ""}`,
        root_cause: wo["root cause"] || wo.root_cause || "Recorded fault",
        status: "completed",
      })),
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
      {
        sensor_id: "THERM-M1-IR-02",
        sensor_type: "Optical / RTD Thermal Probe",
        replaced_at: "42 days ago",
        stabilization_window: "Cleared",
        factory_calibration: "Verified within ±0.4 °C against Fluke reference.",
      },
    ],
    tooling_changes: [
      {
        shift: "2 shifts before alert",
        change_type: "Fixture & Tooling Swap (EV-PM-4C-S Batch Setup)",
        known_risk:
          "Tooling swaps on M1 are a documented trigger for shaft/fixture misalignment if clamping torque is uneven.",
        sign_off:
          "Post-swap alignment was checked and signed off by shift technician after the swap.",
      },
    ],
    manual_excerpts:
      manualSections.length > 0
        ? manualSections.map((m) => ({
            section: m.section,
            pages: m.pages,
            text: m.text,
          }))
        : [
            {
              section: "Common Faults and Troubleshooting – E13: High Vibration",
              pages: 4,
              text: "Fault Code: E13 – High Vibration. Possible Causes: Bearing misalignment, Loose mechanical fittings, Imbalance in rotating assembly.",
            },
          ],
    interview_excerpts:
      technicianInterviews.length > 0
        ? technicianInterviews.map((iv) => ({
            role: iv.role,
            employee_id: iv.employee_id,
            text: iv.text,
          }))
        : [],
  };

  await activity.addMessage(
    "assistant",
    `Assembled evidence for ${resolvedMachineId}: ${candidates
      .map((candidate) => candidate.label)
      .join(", ")}. Vibration spectrum and maintenance history are ready for the specialist agents. Similar work orders: ${similarWorkOrders.length}. Manual sections: ${manualSections.length}. Interviews: ${technicianInterviews.length}. Telemetry points: ${recentTelemetry.length}.`
  );

  return {
    machine_id: resolvedMachineId,
    data_source: dataSource,
    error_code: errorCode,
    error_name: errorName,
    query_text: queryText,
    candidates,
    vibration_spectrum: vibrationSpectrum,
    maintenance_history: maintenanceHistory,
    similar_work_orders: similarWorkOrders.slice(0, 3),
    manual_sections: manualSections,
    technician_interviews: technicianInterviews,
  };
}
