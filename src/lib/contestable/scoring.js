/**
 * Quantitative Bipolar Argumentation Framework (QBAF) & Candidate Scoring Engine
 *
 * Implements the candidate scoring formula from the Contestable AI specification:
 *   score = sigmoid(tau + 0.3 * total_support - 0.3 * total_challenge)
 * where tau starts at 0, and rejected arguments are excluded from totals.
 *
 * Also computes iterative QBAF per-argument strengths (alpha = 0.3, 10 iterations)
 * following the reference implementation in mongodb-industry-solutions/contestable-ai.
 */

export const DEFAULT_TAU = 0;
export const DEFAULT_ALPHA = 0.3;
export const DEFAULT_ITERATIONS = 10;

export const DEFAULT_CANDIDATES = [
  {
    id: "bearing_degradation",
    label: "Bearing Degradation",
    shortLabel: "Bearing Degradation",
    summary:
      "Spindle or shaft bearing wear causing elevated harmonic vibration and friction heat.",
    sourceCase: "WO-M1-01: Vibration Alert Investigation (Bearing wear / alignment)",
  },
  {
    id: "misalignment",
    label: "Shaft / Tooling Misalignment",
    shortLabel: "Misalignment",
    summary:
      "Mechanical misalignment introduced by a recent tooling or fixture swap under load.",
    sourceCase: "WO-M1-05: Mechanical Balancing & Alignment After Tooling Change",
  },
  {
    id: "sensor_fault",
    label: "Sensor Calibration / Stabilization Fault",
    shortLabel: "Sensor Fault",
    summary:
      "False or drifted reading from a recently replaced or uncalibrated accelerometer/thermal sensor.",
    sourceCase: "WO-M1-03: Vibration Sensor False Trigger & Calibration Drift Review",
  },
];

export function sigmoid(x) {
  const clamped = Math.max(-20.0, Math.min(20.0, Number(x) || 0));
  return 1.0 / (1.0 + Math.exp(-clamped));
}

export function roundTo(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}

export function isArgumentActive(arg) {
  if (!arg) return false;
  if (arg.is_rejected === true) return false;
  if (arg.status === "rejected" || arg.human_action === "reject") return false;
  return true;
}

/**
 * Build coalition (supporters) and attack (attackers) relations within each candidate
 * for iterative QBAF per-argument strength calculation.
 */
export function buildRelations(argumentsList = []) {
  const active = argumentsList.filter(isArgumentActive);
  const supporters = {};
  const attackers = {};

  for (const arg of active) {
    const id = arg.argument_id;
    supporters[id] = [];
    attackers[id] = [];
  }

  const byCandidate = {};
  for (const arg of active) {
    const cand = arg.candidate;
    const stance = arg.stance || arg.type || "support";
    if (!byCandidate[cand]) {
      byCandidate[cand] = { support: [], challenge: [] };
    }
    if (stance === "challenge") {
      byCandidate[cand].challenge.push(arg.argument_id);
    } else {
      byCandidate[cand].support.push(arg.argument_id);
    }
  }

  for (const cand of Object.keys(byCandidate)) {
    const supIds = byCandidate[cand].support;
    const chalIds = byCandidate[cand].challenge;

    for (const a of supIds) {
      for (const b of supIds) {
        if (a !== b) supporters[a].push(b);
      }
    }
    for (const a of chalIds) {
      for (const b of chalIds) {
        if (a !== b) supporters[a].push(b);
      }
    }
    for (const c of chalIds) {
      for (const s of supIds) {
        attackers[s].push(c);
      }
    }
    for (const s of supIds) {
      for (const c of chalIds) {
        attackers[c].push(s);
      }
    }
  }

  return { supporters, attackers };
}

/**
 * Iteratively compute QBAF strength f^(n)(x) for each active argument.
 */
export function computeQbafArgumentScores(
  argumentsList = [],
  alpha = DEFAULT_ALPHA,
  iterations = DEFAULT_ITERATIONS
) {
  const active = argumentsList.filter(isArgumentActive);
  if (active.length === 0) return {};

  const tauMap = {};
  for (const arg of active) {
    tauMap[arg.argument_id] = Number(arg.score ?? arg.tau ?? 0.5);
  }

  const { supporters, attackers } = buildRelations(active);
  let currentScores = { ...tauMap };

  for (let i = 0; i < iterations; i += 1) {
    const nextScores = {};
    for (const arg of active) {
      const id = arg.argument_id;
      const supSum = (supporters[id] || []).reduce(
        (sum, sId) => sum + (currentScores[sId] ?? 0),
        0
      );
      const attSum = (attackers[id] || []).reduce(
        (sum, aId) => sum + (currentScores[aId] ?? 0),
        0
      );
      nextScores[id] = roundTo(
        sigmoid(tauMap[id] + alpha * supSum - alpha * attSum),
        4
      );
    }
    currentScores = nextScores;
  }

  return currentScores;
}

/**
 * Compute each candidate's score using the exact specification formula:
 *   score = sigmoid(tau + 0.3 * total_support - 0.3 * total_challenge)
 * where tau = 0 by default.
 */
export function computeCandidateScores(
  argumentsList = [],
  candidates = DEFAULT_CANDIDATES,
  tau = DEFAULT_TAU,
  alpha = DEFAULT_ALPHA
) {
  const active = argumentsList.filter(isArgumentActive);
  const argumentStrengths = computeQbafArgumentScores(active, alpha);

  const candidateIds =
    Array.isArray(candidates) && candidates.length > 0
      ? candidates.map((c) => (typeof c === "string" ? c : c.id))
      : Array.from(new Set(argumentsList.map((a) => a.candidate)));

  const candidateMetaMap = {};
  for (const c of DEFAULT_CANDIDATES) {
    candidateMetaMap[c.id] = c;
  }
  if (Array.isArray(candidates)) {
    for (const c of candidates) {
      if (typeof c === "object" && c?.id) {
        candidateMetaMap[c.id] = { ...candidateMetaMap[c.id], ...c };
      }
    }
  }

  const results = {};

  for (const candId of candidateIds) {
    const candArgs = active.filter((a) => a.candidate === candId);
    const supportArgs = candArgs.filter(
      (a) => (a.stance || a.type) === "support"
    );
    const challengeArgs = candArgs.filter(
      (a) => (a.stance || a.type) === "challenge"
    );

    const totalSupport = roundTo(
      supportArgs.reduce((sum, a) => sum + Number(a.score ?? a.tau ?? 0), 0),
      4
    );
    const totalChallenge = roundTo(
      challengeArgs.reduce((sum, a) => sum + Number(a.score ?? a.tau ?? 0), 0),
      4
    );
    const netSupport = roundTo(totalSupport - totalChallenge, 4);
    const logit = roundTo(
      tau + alpha * totalSupport - alpha * totalChallenge,
      4
    );
    const score = roundTo(sigmoid(logit), 4);

    // Also compute QBAF converged raw margin for reference
    const qbafSupport = roundTo(
      supportArgs.reduce(
        (sum, a) => sum + (argumentStrengths[a.argument_id] ?? Number(a.score ?? 0)),
        0
      ),
      4
    );
    const qbafChallenge = roundTo(
      challengeArgs.reduce(
        (sum, a) => sum + (argumentStrengths[a.argument_id] ?? Number(a.score ?? 0)),
        0
      ),
      4
    );
    const qbafMargin = roundTo(qbafSupport - qbafChallenge, 4);

    const meta = candidateMetaMap[candId] || {
      id: candId,
      label: candId
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
    };

    results[candId] = {
      candidate: candId,
      label: meta.label,
      shortLabel: meta.shortLabel || meta.label,
      summary: meta.summary || "",
      tau,
      alpha,
      total_support: totalSupport,
      total_challenge: totalChallenge,
      net_support: netSupport,
      logit,
      score,
      percentage: roundTo(score * 100, 1),
      qbaf_margin: qbafMargin,
      support_count: supportArgs.length,
      challenge_count: challengeArgs.length,
      active_argument_count: candArgs.length,
    };
  }

  const sortedCandidates = Object.values(results).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.net_support - a.net_support;
  });

  const winningCandidate = sortedCandidates[0]?.candidate || candidateIds[0] || null;

  const updatedArguments = argumentsList.map((arg) => {
    const activeArg = isArgumentActive(arg);
    return {
      ...arg,
      final_score: activeArg
        ? argumentStrengths[arg.argument_id] ?? roundTo(sigmoid(Number(arg.score ?? 0.5)), 4)
        : 0,
    };
  });

  return {
    candidateScores: results,
    rankedCandidates: sortedCandidates,
    winningCandidate,
    winningCandidateInfo: winningCandidate ? results[winningCandidate] : null,
    argumentStrengths,
    arguments: updatedArguments,
  };
}
