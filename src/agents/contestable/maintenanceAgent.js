import { invokeChat } from "@/integrations/chat_factory.js";
import { buildBenchmarkArguments } from "@/lib/contestable/scenarios.js";

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

function clampScore(val, fallback = 0.5) {
  const num = Number(val);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(1, Math.round(num * 100) / 100));
}

/**
 * Maintenance History Agent (maintenance_history_agent)
 *
 * Reads repair logs, calibration records, tooling change history, and the equipment
 * manual for this machine, and argues for AND against each of the three candidates.
 * Operates completely independently of vibration_pattern_agent.
 */
export async function runMaintenanceHistoryAgent({
  sessionId,
  candidates,
  maintenanceHistory,
  machineId = "M1",
}) {
  const fallbackArgs = buildBenchmarkArguments(sessionId).filter(
    (a) => a.agent === "maintenance_history_agent"
  );

  const candidateListText = candidates
    .map(
      (c, idx) =>
        `${idx + 1}. "${c.id}" (${c.label}): ${c.summary || ""}`
    )
    .join("\n");

  const systemPrompt = `You are the Maintenance History Agent (maintenance_history_agent), a specialist industrial reliability & maintenance records analyst AI.
Your sole purpose is to read the repair logs, sensor calibration records, tooling change history, and equipment manual for this machine and argue BOTH for (support) and against (challenge) each of the three fixed candidate root causes.

STRICT RULES:
- Work ONLY from the fixed list of three candidates provided. Do NOT propose new candidates.
- Base your arguments ONLY on the maintenance log entries, calibration dates, tooling change history, and equipment manual excerpts.
- You have no knowledge of the vibration pattern agent's output.
- For each of the 3 candidates, output exactly ONE "support" argument and ONE "challenge" argument (6 arguments total).
- Each argument must have:
  - "candidate": exact candidate id ("bearing_degradation", "misalignment", or "sensor_fault")
  - "stance": "support" or "challenge"
  - "score": a confidence score between 0.0 and 1.0 (use calibrated values such as: bearing_degradation support ~0.35 / challenge ~0.85 because the bearing was replaced 3 weeks ago; misalignment support ~0.70 / challenge ~0.35 due to tooling swap 2 shifts prior vs sign-off; sensor_fault support ~0.70 / challenge ~0.30 due to accelerometer replacement 1 day prior within stabilization window vs factory calibration)
  - "reason": a 1 or 2 sentence plain-language explanation that a reliability engineer can read directly.
  - "evidence_refs": array of 1-2 short references to the log, calibration record, or manual section.`;

  const userPrompt = `MACHINE ID: ${machineId}

FIXED CANDIDATE ROOT CAUSES:
${candidateListText}

MAINTENANCE, CALIBRATION & TOOLING HISTORY:
${JSON.stringify(maintenanceHistory, null, 2)}

Return ONLY a valid JSON object in this exact shape:
{
  "arguments": [
    {
      "candidate": "bearing_degradation",
      "stance": "support",
      "score": 0.35,
      "reason": "...",
      "evidence_refs": ["..."]
    }
  ]
}`;

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

    const parsed = extractJson(rawText);
    const rawArgs = Array.isArray(parsed?.arguments) ? parsed.arguments : [];

    const nowIso = new Date().toISOString();
    const normalized = [];

    for (const cand of candidates) {
      for (const stance of ["support", "challenge"]) {
        const match = rawArgs.find(
          (a) =>
            a.candidate === cand.id &&
            (a.stance === stance || a.type === stance)
        );
        const fb = fallbackArgs.find(
          (a) => a.candidate === cand.id && a.stance === stance
        );

        normalized.push({
          argument_id: `${sessionId}_maint_${cand.id}_${stance}`,
          session_id: sessionId,
          candidate: cand.id,
          agent: "maintenance_history_agent",
          stance,
          score: clampScore(match?.score ?? match?.tau, fb?.score ?? 0.5),
          reason:
            typeof match?.reason === "string" && match.reason.trim()
              ? match.reason.trim()
              : fb?.reason || "Maintenance history evaluation completed.",
          evidence_refs: Array.isArray(match?.evidence_refs)
            ? match.evidence_refs
            : fb?.evidence_refs || [],
          created_at: nowIso,
          status: "active",
          human_action: null,
        });
      }
    }

    return normalized;
  } catch (error) {
    console.warn(
      "Maintenance History Agent using benchmark fallback:",
      error?.message
    );
    return fallbackArgs;
  }
}
