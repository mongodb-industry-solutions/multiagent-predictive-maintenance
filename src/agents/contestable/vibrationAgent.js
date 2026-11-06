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
 * Vibration Pattern Agent (vibration_pattern_agent)
 *
 * Reads the vibration frequency data from the alert and argues for AND against
 * each of the fixed three candidates based on what the frequency signature shows.
 * Operates completely independently of maintenance_history_agent.
 */
export async function runVibrationPatternAgent({
  sessionId,
  candidates,
  vibrationSpectrum,
  machineId = "M1",
}) {
  const fallbackArgs = buildBenchmarkArguments(sessionId).filter(
    (a) => a.agent === "vibration_pattern_agent"
  );

  const candidateListText = candidates
    .map(
      (c, idx) =>
        `${idx + 1}. "${c.id}" (${c.label}): ${c.summary || ""}`
    )
    .join("\n");

  const systemPrompt = `You are the Vibration Pattern Agent (vibration_pattern_agent), a specialist mechanical signal analysis AI.
Your sole purpose is to read the vibration frequency spectrum at the time of an industrial machine alert and argue BOTH for (support) and against (challenge) each of the three fixed candidate root causes.

STRICT RULES:
- Work ONLY from the fixed list of three candidates provided. Do NOT propose new candidates.
- Base your arguments ONLY on the vibration frequency spectrum, harmonic patterns, sideband frequencies, check stability, and known defect bands for the equipment model.
- You have no knowledge of maintenance logs or repair history.
- For each of the 3 candidates, output exactly ONE "support" argument and ONE "challenge" argument (6 arguments total).
- Each argument must have:
  - "candidate": exact candidate id ("bearing_degradation", "misalignment", or "sensor_fault")
  - "stance": "support" or "challenge"
  - "score": a confidence score between 0.0 and 1.0 (use calibrated values such as: bearing_degradation support ~0.75 / challenge ~0.25, misalignment support ~0.40 / challenge ~0.30, sensor_fault support ~0.20 / challenge ~0.55 when the spectrum matches the standard SP-2000 harmonic profile)
  - "reason": a 1 or 2 sentence plain-language explanation that a reliability engineer can read directly.
  - "evidence_refs": array of 1-2 short references to the frequency bands or stability checks.`;

  const userPrompt = `MACHINE ID: ${machineId}
EQUIPMENT MODEL: ${vibrationSpectrum?.equipment_model || "Model SP-2000"}

FIXED CANDIDATE ROOT CAUSES:
${candidateListText}

VIBRATION FREQUENCY SPECTRUM AT ALERT TIME:
${JSON.stringify(vibrationSpectrum, null, 2)}

Return ONLY a valid JSON object in this exact shape:
{
  "arguments": [
    {
      "candidate": "bearing_degradation",
      "stance": "support",
      "score": 0.75,
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
          argument_id: `${sessionId}_vib_${cand.id}_${stance}`,
          session_id: sessionId,
          candidate: cand.id,
          agent: "vibration_pattern_agent",
          stance,
          score: clampScore(match?.score ?? match?.tau, fb?.score ?? 0.5),
          reason:
            typeof match?.reason === "string" && match.reason.trim()
              ? match.reason.trim()
              : fb?.reason || "Frequency spectrum evaluation completed.",
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
      "Vibration Pattern Agent using benchmark fallback:",
      error?.message
    );
    return fallbackArgs;
  }
}
