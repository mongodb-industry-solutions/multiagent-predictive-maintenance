import { NextResponse } from "next/server";
import { getAgentOptions } from "@/agents/config.js";

export async function GET() {
  const options = getAgentOptions();
  return NextResponse.json({ options });
}
