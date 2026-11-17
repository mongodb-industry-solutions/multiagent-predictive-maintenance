import { invokeChat } from "@/integrations/chat_factory.js";
import { createActivityLog } from "@/lib/contestable/activityLog.js";
import { isArgumentActive } from "@/lib/contestable/scoring.js";
import { getCandidateById } from "@/lib/contestable/scenarios.js";

function extractJson(text = "") {
  const trimmed = String(text).trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    return JSON.parse(codeBlock[1].trim());
  }
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    return JSON.parse(objMatch[0]);
  }
  return JSON.parse(trimmed);
}

const FALLBACK_RESOLUTION_BY_CANDIDATE = {
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

/**
 * Contestable Resolution / Incident Report Refiner Agent
 *
 * Explains the contestation outcome and generates the refined root_cause
 * and repair_instructions for the incident report based on the highest-scoring
 * candidate and the reliability engineer's interventions.
 */
export async function runContestableRefinerAgent({
  machineId = "M1",
  candidates = [],
  winningCandidateId,
  scoresBefore = {},
  scoresAfter = {},
  argumentsList = [],
  reviewEvents = [],
  originalIncident = null,
  log,
}) {
  const activity = log || createActivityLog();
  const winningMeta = getCandidateById(winningCandidateId, candidates);
  const fallback =
    FALLBACK_RESOLUTION_BY_CANDIDATE[winningCandidateId] ||
    FALLBACK_RESOLUTION_BY_CANDIDATE.misalignment;

  const activeArgs = argumentsList.filter(isArgumentActive);
  const winningSupportArgs = activeArgs.filter(
    (a) =>
      a.candidate === winningCandidateId &&
      (a.stance || a.type) === "support"
  );
  const rejectedArgs = argumentsList.filter((a) => !isArgumentActive(a));
  const modifiedArgs = argumentsList.filter(
    (a) => a.human_action === "modify"
  );
  const addedArgs = argumentsList.filter((a) => a.human_action === "add");

  const defaultDecisive = [
    ...winningSupportArgs.map(
      (a) => `[${a.agent} · support ${a.score}]: ${a.reason}`
    ),
    ...rejectedArgs.map(
      (a) => `[Rejected ${a.agent} · ${a.stance} ${a.score}]: ${a.reason}`
    ),
  ].slice(0, 4);

  const beforeWinnerScore = scoresBefore?.[winningCandidateId]?.score ?? 0.5;
  const afterWinnerScore = scoresAfter?.[winningCandidateId]?.score ?? 0.5;

  const defaultSummary = `Following multi-agent debate between vibration_pattern_agent and maintenance_history_agent and ${reviewEvents.length} reliability engineer intervention(s) (${rejectedArgs.length} rejected, ${modifiedArgs.length} modified, ${addedArgs.length} added), "${winningMeta.label}" achieved the highest candidate score (${Math.round(afterWinnerScore * 100)}%, up from ${Math.round(beforeWinnerScore * 100)}%).`;

  const systemPrompt = `You are the Contestable AI Resolution Agent for an industrial predictive maintenance system.
The scoring engine has selected the highest-scoring root cause candidate after a debate between two specialist agents (vibration_pattern_agent and maintenance_history_agent) and review by a human Reliability Engineer.
You DO NOT choose the root cause candidate — you must explain the selected winner ("${winningMeta.label}") and produce a refined Incident Report (root_cause and 3 to 5 concrete repair_instructions steps) that incorporates the winning arguments and the Reliability Engineer's interventions.`;

  const userPrompt = `MACHINE ID: ${machineId}
SELECTED ROOT CAUSE CANDIDATE: ${winningCandidateId} (${winningMeta.label})

ORIGINAL INCIDENT REPORT:
${JSON.stringify(
    {
      root_cause: originalIncident?.root_cause || "Initial automated diagnosis",
      repair_instructions: originalIncident?.repair_instructions || [],
    },
    null,
    2
  )}

SCORES BEFORE REVIEW:
${JSON.stringify(scoresBefore, null, 2)}

SCORES AFTER ENGINEER CONTESTATION:
${JSON.stringify(scoresAfter, null, 2)}

ACTIVE SUPPORTING ARGUMENTS FOR WINNER:
${JSON.stringify(winningSupportArgs, null, 2)}

REJECTED ARGUMENTS:
${JSON.stringify(rejectedArgs, null, 2)}

ENGINEER REVIEW EVENTS:
${JSON.stringify(reviewEvents, null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "root_cause": "Clear 1-2 sentence refined root cause for the incident report reflecting ${winningMeta.label} and the contested evidence.",
  "repair_instructions": [
    { "step": 1, "description": "..." },
    { "step": 2, "description": "..." },
    { "step": 3, "description": "..." }
  ],
  "rationale": "2-3 sentence explanation of why ${winningMeta.label} won after combining vibration spectrum, maintenance history, and reliability engineer review.",
  "decisive_arguments": [
    "Summary of decisive argument 1",
    "Summary of decisive argument 2"
  ],
  "confidence_summary": "1 paragraph summarizing how the score shifted from before to after human contestation."
}`;

  const readRunId = await activity.toolStart("read_contestation", {
    machine_id: machineId,
    winning_candidate: winningCandidateId,
    winning_label: winningMeta.label,
    score_before: beforeWinnerScore,
    score_after: afterWinnerScore,
  });
  await activity.toolEnd(readRunId, "read_contestation", {
    supporting_arguments: winningSupportArgs.length,
    rejected_arguments: rejectedArgs.length,
    modified_arguments: modifiedArgs.length,
    added_arguments: addedArgs.length,
    review_events: reviewEvents.length,
  });
  await activity.addMessage("system", systemPrompt);
  await activity.addMessage("user", userPrompt);

  const writeRunId = await activity.toolStart("write_incident_report", {
    winning_candidate: winningCandidateId,
  });

  try {
    const response = await invokeChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const rawText =
      typeof response?.content === "string"
        ? response.content
        : Array.isArray(response?.content)
          ? response.content.map((part) => part.text || "").join("")
          : "";

    await activity.addMessage("assistant", rawText);
    const parsed = extractJson(rawText);
    const instructions =
      Array.isArray(parsed?.repair_instructions) &&
      parsed.repair_instructions.length >= 2
        ? parsed.repair_instructions.map((item, idx) => ({
            step: Number(item.step) || idx + 1,
            description:
              typeof item === "string"
                ? item
                : item.description || `Step ${idx + 1}`,
          }))
        : fallback.repair_instructions;

    const resolution = {
      winning_candidate: winningCandidateId,
      winning_label: winningMeta.label,
      root_cause:
        typeof parsed?.root_cause === "string" && parsed.root_cause.trim()
          ? parsed.root_cause.trim()
          : fallback.root_cause,
      repair_instructions: instructions,
      rationale:
        typeof parsed?.rationale === "string" && parsed.rationale.trim()
          ? parsed.rationale.trim()
          : defaultSummary,
      decisive_arguments:
        Array.isArray(parsed?.decisive_arguments) &&
        parsed.decisive_arguments.length > 0
          ? parsed.decisive_arguments
          : defaultDecisive,
      confidence_summary:
        typeof parsed?.confidence_summary === "string" &&
        parsed.confidence_summary.trim()
          ? parsed.confidence_summary.trim()
          : defaultSummary,
    };
    await activity.toolEnd(writeRunId, "write_incident_report", {
      root_cause: resolution.root_cause,
      repair_steps: resolution.repair_instructions.length,
    });
    return resolution;
  } catch (error) {
    console.warn("Contestable Refiner Agent fallback:", error?.message);
    await activity.toolError(
      writeRunId,
      "write_incident_report",
      error?.message || "Model call failed"
    );
    await activity.addStatus(
      "fallback",
      "A fallback incident report was used because the model call failed."
    );
    return {
      winning_candidate: winningCandidateId,
      winning_label: winningMeta.label,
      root_cause: fallback.root_cause,
      repair_instructions: fallback.repair_instructions,
      rationale: defaultSummary,
      decisive_arguments: defaultDecisive,
      confidence_summary: defaultSummary,
    };
  }
}
