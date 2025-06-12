import { NextResponse } from "next/server";
import { handleChatRequest } from "@/agents/callAgent.js";

export async function POST(request, { params }) {
  try {
    const { threadId } = await params;
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Call the agent with the message and existing threadId
    const result = await handleChatRequest({ message, threadId });

    return NextResponse.json({ response: result.response });
  } catch (error) {
    console.error("Error in chat continuation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
