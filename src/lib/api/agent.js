import { streamAgentEvents } from "@/lib/stream/agent";

// Agent API (for /api/agent/* and /api/chat endpoints)

export async function fetchAgentOptions() {
  const res = await fetch("/api/agent/options");
  if (!res.ok) throw new Error("Failed to fetch agent options");
  return await res.json();
}

export async function sendChatMessage({
  message,
  agentId,
  threadId,
  setLogs,
  setThreadId,
  setError,
}) {
  const url = threadId ? `/api/chat/${threadId}` : "/api/chat";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, agentId }),
  });
  if (!res.body) throw new Error("No response body");
  let newThreadId = threadId;
  for await (const evt of streamAgentEvents(res.body)) {
    if (evt.type === "update") {
      setLogs((prev) => [...prev, evt]);
    } else if (evt.type === "final") {
      setLogs((prev) => [...prev, { ...evt, type: "final" }]);
    } else if (evt.type === "error") {
      setError(evt.values?.name || "Error");
      setLogs((prev) => [...prev, evt]);
    }
    if (!newThreadId && evt.threadId) {
      newThreadId = evt.threadId;
      setThreadId(newThreadId);
    }
  }
  if (!newThreadId) setThreadId((prev) => prev || Date.now().toString());
}

export async function callFailureAgent(alert, { onEvent } = {}) {
  // Always use /api/chat for failure agent
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `New alert received\n${JSON.stringify(alert, null, 2)}`,
      agentId: "failure",
    }),
  });
  if (!response.body) throw new Error("No response body");
  let fullText = "";
  for await (const evt of streamAgentEvents(response.body)) {
    if (onEvent) onEvent(evt);
    if (evt.type === "update" || evt.type === "final") {
      fullText += evt.values?.content || "";
    }
    // handle errors or other event types as needed
  }
  return fullText;
}

export async function callWorkOrderAgent(incidentReport, { onEvent } = {}) {
  // Always use /api/chat for workorder agent
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: JSON.stringify(incidentReport, null, 2),
      agentId: "workorder",
    }),
  });
  if (!response.body) throw new Error("No response body");
  let fullText = "";
  for await (const evt of streamAgentEvents(response.body)) {
    if (onEvent) onEvent(evt);
    if (evt.type === "update" || evt.type === "final") {
      fullText += evt.values?.content || "";
    }
    // handle errors or other event types as needed
  }
  return fullText;
}
