// Client API wrapper for Contestable AI endpoints

export async function startContestableSession({
  incident = null,
  alert = null,
  machineId = "M1",
  dataSource = "leafy",
  mode = "agent",
} = {}) {
  const res = await fetch("/api/contestable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "start_session",
      incident,
      alert,
      machineId,
      dataSource,
      mode,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to start contestable session");
  }
  return res.json();
}

export async function submitContestableAction({
  sessionId,
  actionType,
  argumentId,
  reason,
  score,
  candidate,
  stance,
  reviewerRole = "Reliability Engineer",
  note = "",
}) {
  const res = await fetch("/api/contestable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "contest_action",
      session_id: sessionId,
      action_type: actionType,
      argument_id: argumentId,
      reason,
      score,
      candidate,
      stance,
      reviewer_role: reviewerRole,
      note,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to apply contestation action");
  }
  return res.json();
}

export async function generateContestableRefinement({ sessionId }) {
  const res = await fetch("/api/contestable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "generate_refinement",
      session_id: sessionId,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to generate refined incident report");
  }
  return res.json();
}

export async function commitContestableIncident({
  sessionId,
  incidentId,
  rootCause,
  repairInstructions,
  rationale,
  reviewerRole = "Reliability Engineer",
  createIfMissing = true,
}) {
  const res = await fetch("/api/contestable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "commit_incident",
      session_id: sessionId,
      incident_id: incidentId,
      root_cause: rootCause,
      repair_instructions: repairInstructions,
      rationale,
      reviewer_role: reviewerRole,
      create_if_missing: createIfMissing,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to commit refined incident report");
  }
  return res.json();
}

export async function fetchContestableLineage(sessionId) {
  const res = await fetch("/api/contestable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "get_lineage",
      session_id: sessionId,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch contestable lineage");
  }
  return res.json();
}
