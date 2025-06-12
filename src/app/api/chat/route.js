import { NextResponse } from "next/server";
import { handleChatRequest } from "@/agents/callAgent.js";

export async function POST(request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Generate a thread ID
    const threadId = Date.now().toString();

    // Call the agent with the message
    const result = await handleChatRequest({ message, threadId });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error starting conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
