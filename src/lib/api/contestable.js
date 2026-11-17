// Client API wrapper for Contestable AI endpoints

async function readNdjson(res, onEvent) {
  if (!res.body) {
    throw new Error("Contestable request returned an empty response");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  let streamError = null;

  const take = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const event = JSON.parse(trimmed);
    if (event.type === "result") result = event;
    else if (event.type === "error") {
      streamError = new Error(event.message || "Contestable request failed");
    } else if (onEvent) onEvent(event);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach(take);
  }
  if (buffer.trim()) take(buffer);
  if (streamError) throw streamError;
  if (!result) throw new Error("Contestable request ended without a result");
  return result;
}

async function postContestable(body, { onEvent, stream = false, fallbackMessage } = {}) {
  const res = await fetch("/api/contestable", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") || "";
  if (!stream || contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || fallbackMessage);
    return data;
  }
  if (!res.ok) throw new Error(fallbackMessage);
  return readNdjson(res, onEvent);
}

export async function prepareContestableSession({
  incident = null,
  alert = null,
  machineId = "M1",
  dataSource = "leafy",
  onEvent,
} = {}) {
  return postContestable(
    {
      action: "prepare_session",
      incident,
      alert,
      machineId,
      dataSource,
    },
    {
      onEvent,
      stream: true,
      fallbackMessage: "Failed to prepare contestable session",
    }
  );
}

export async function runContestableSpecialist({ sessionId, agent, onEvent }) {
  return postContestable(
    {
      action: "run_specialist",
      session_id: sessionId,
      agent,
    },
    {
      onEvent,
      stream: true,
      fallbackMessage: "Failed to run specialist agent",
    }
  );
}

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

export async function generateContestableRefinement({ sessionId, onEvent }) {
  return postContestable(
    {
      action: "generate_refinement",
      session_id: sessionId,
    },
    {
      onEvent,
      stream: true,
      fallbackMessage: "Failed to generate refined incident report",
    }
  );
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
