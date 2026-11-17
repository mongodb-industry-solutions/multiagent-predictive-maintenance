function compactValue(value, depth = 0) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (typeof value?.toHexString === "function" && value._bsontype === "ObjectId") {
    return value.toHexString();
  }
  if (typeof value === "string") {
    return value.length > 1200 ? `${value.slice(0, 1200)}…` : value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 6).map((item) => compactValue(item, depth + 1));
  }
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "embedding" || key === "_id") continue;
    if (depth > 4) continue;
    const next = compactValue(item, depth + 1);
    if (next !== undefined) out[key] = next;
  }
  return out;
}

/**
 * Collects contestable agent activity. Tool calls are emitted as they run.
 * Message and status entries are emitted too, and kept for the final result.
 */
export function createActivityLog(emit = async () => {}, scope = "") {
  const messages = [];
  let sequence = 0;
  const prefix = scope ? `${scope}:` : "";

  const send = async (event) => {
    const stamped = {
      ...event,
      at: event.at || new Date().toISOString(),
    };
    await emit(stamped);
    return stamped;
  };

  return {
    messages,
    async toolStart(name, input = {}) {
      sequence += 1;
      const runId = `${prefix}${name}-${sequence}`;
      await send({
        type: "update",
        name: "tool_start",
        runId,
        values: { name, input: compactValue(input) },
      });
      return runId;
    },
    async toolEnd(runId, name, output) {
      await send({
        type: "update",
        name: "tool_end",
        runId,
        values: { name, output: compactValue(output) },
      });
    },
    async toolError(runId, name, content) {
      const event = {
        type: "status",
        status: "error",
        runId,
        name,
        content: String(content || "Tool failed"),
        at: new Date().toISOString(),
      };
      messages.push(event);
      await send(event);
    },
    async addMessage(role, content) {
      const event = {
        type: "message",
        role,
        content: String(content ?? ""),
        at: new Date().toISOString(),
      };
      messages.push(event);
      await send(event);
    },
    async addStatus(status, content) {
      const event = {
        type: "status",
        status,
        content: String(content ?? ""),
        at: new Date().toISOString(),
      };
      messages.push(event);
      await send(event);
    },
  };
}
