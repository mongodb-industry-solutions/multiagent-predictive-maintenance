import { NextResponse } from "next/server";
import { handleChatRequestStream } from "@/agents/callAgent.js";
import { getChatThread } from "@/agents/chatHistory";

export async function GET(request, { params }) {
  const { threadId } = await params;
  const agentId =
    new URL(request.url).searchParams.get("agentId") || "uns-chat";
  if (agentId !== "uns-chat") {
    return NextResponse.json({ error: "Invalid agent" }, { status: 400 });
  }
  try {
    const thread = await getChatThread(threadId, agentId);
    if (!thread) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(thread, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load chat thread:", error);
    return NextResponse.json(
      { error: "Unable to load conversation" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { threadId } = await params;
    const { message, agentId, context } = await request.json();

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
  } catch (error) {
    console.error("Error in chat continuation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
