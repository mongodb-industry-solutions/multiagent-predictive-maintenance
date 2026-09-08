import { handleChatRequestStream } from "@/agents/callAgent.js";

export async function POST(request) {
  // Streaming response using ReadableStream
  const { message, agentId, context } = await request.json();
  const threadId =
    agentId === "uns-chat"
      ? `uns-chat:${Date.now()}`
      : Date.now().toString();

  const stream = new ReadableStream({
    async start(controller) {
      const writer = controller;
      // Polyfill for writer interface
      const streamWriter = {
        ready: Promise.resolve(),
        write: (chunk) => {
          controller.enqueue(new TextEncoder().encode(chunk));
        },
        close: () => controller.close(),
      };
      await handleChatRequestStream(
        { message, threadId, agentId, context },
        streamWriter
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
