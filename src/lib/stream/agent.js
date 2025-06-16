// Streaming NDJSON parser for agent events
// Usage: for await (const evt of streamAgentEvents(response.body)) { ... }

/**
 * Async generator to parse NDJSON events from a ReadableStream
 * @param {ReadableStream} stream
 * @returns {AsyncGenerator<object>}
 */
export async function* streamAgentEvents(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split("\n");
      buffer = lines.pop(); // last line may be incomplete
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          yield JSON.parse(line);
        } catch (e) {
          // ignore parse errors
        }
      }
    }
    if (buffer.trim()) {
      try {
        yield JSON.parse(buffer);
      } catch {}
    }
  } finally {
    reader.releaseLock();
  }
}
