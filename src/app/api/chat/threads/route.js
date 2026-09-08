import { NextResponse } from "next/server";
import { listRecentChatThreads } from "@/agents/chatHistory";

export async function GET(request) {
  const agentId =
    new URL(request.url).searchParams.get("agentId") || "uns-chat";
  if (agentId !== "uns-chat") {
    return NextResponse.json(
      { error: "Conversation history is only available for UNS Factory Chat" },
      { status: 400 }
    );
  }

  try {
    const threads = await listRecentChatThreads(agentId, 10);
    return NextResponse.json(
      { threads },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unable to list chat threads:", error);
    return NextResponse.json(
      { error: "Unable to load recent conversations" },
      { status: 500 }
    );
  }
}
