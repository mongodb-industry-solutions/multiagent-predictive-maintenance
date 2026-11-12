import { tool } from "@langchain/core/tools";
import { gatherContestableEvidence } from "@/lib/contestable/evidence.js";
import { computeCandidateScores } from "@/lib/contestable/scoring.js";
import { runVibrationPatternAgent } from "./vibrationAgent.js";
import { runMaintenanceHistoryAgent } from "./maintenanceAgent.js";

export const loadCandidateEvidence = tool(
  async ({ machine_id = "M1", error_code = "E13", error_name = "High vibration" }) => {
    const evidence = await gatherContestableEvidence({
      machineId: machine_id,
      alert: { err_code: error_code, err_name: error_name, machine_id },
    });
    return JSON.stringify({
      machine_id: evidence.machine_id,
      candidates: evidence.candidates,
      vibration_spectrum: evidence.vibration_spectrum,
      maintenance_history: evidence.maintenance_history,
    });
  },
  {
    name: "load_candidate_evidence",
    description:
      "Retrieve the three candidate root causes from vector search along with the vibration frequency spectrum and maintenance history for the machine.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ["load_candidate_evidence"],
        },
        machine_id: {
          type: "string",
          description: "Machine ID (e.g., M1)",
          default: "M1",
        },
        error_code: {
          type: "string",
          description: "Alert error code (E12 or E13)",
          default: "E13",
        },
        error_name: {
          type: "string",
          description: "Alert error name",
          default: "High vibration",
        },
      },
      required: ["name"],
    },
  }
);

export const runSpecialistDebate = tool(
  async ({ machine_id = "M1", session_id }) => {
    const resolvedSessionId = session_id || `incident-${Date.now().toString().slice(-4)}`;
    const evidence = await gatherContestableEvidence({ machineId: machine_id });
    const [vibArgs, maintArgs] = await Promise.all([
      runVibrationPatternAgent({
        sessionId: resolvedSessionId,
        candidates: evidence.candidates,
        vibrationSpectrum: evidence.vibration_spectrum,
        machineId: machine_id,
      }),
      runMaintenanceHistoryAgent({
        sessionId: resolvedSessionId,
        candidates: evidence.candidates,
        maintenanceHistory: evidence.maintenance_history,
        machineId: machine_id,
      }),
    ]);

    const combined = [...vibArgs, ...maintArgs];
    const scored = computeCandidateScores(combined, evidence.candidates);

    return JSON.stringify({
      session_id: resolvedSessionId,
      winning_candidate: scored.winningCandidate,
      candidate_scores: scored.candidateScores,
      arguments: scored.arguments,
    });
  },
  {
    name: "run_specialist_debate",
    description:
      "Run both vibration_pattern_agent and maintenance_history_agent independently across the three candidates and compute sigmoid(tau + 0.3 * total_support - 0.3 * total_challenge) scores.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          enum: ["run_specialist_debate"],
        },
        machine_id: {
          type: "string",
          description: "Machine ID (default M1)",
          default: "M1",
        },
        session_id: {
          type: "string",
          description: "Optional session identifier",
        },
      },
      required: ["name"],
    },
  }
);

export function getTools() {
  return [loadCandidateEvidence, runSpecialistDebate];
}
