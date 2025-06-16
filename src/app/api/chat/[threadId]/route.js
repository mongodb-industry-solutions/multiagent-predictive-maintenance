import { NextResponse } from "next/server";
import { handleChatRequestStream } from "@/agents/callAgent.js";

export async function POST(request, { params }) {
  try {
    const { threadId } = await params;
    const { message, agentId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const streamWriter = {
          ready: Promise.resolve(),
          write: (chunk) => {
            controller.enqueue(new TextEncoder().encode(chunk));
          },
          close: () => controller.close(),
        };
        await handleChatRequestStream(
          { message, threadId, agentId },
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
  } catch (error) {
    console.error("Error in chat continuation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
