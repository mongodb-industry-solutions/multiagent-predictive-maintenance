import { NextResponse } from "next/server";
import { getKnowledgeGraphStatus } from "@/lib/knowledgeGraph/seedData";

export const dynamic = "force-dynamic";

async function respond() {
  const status = await getKnowledgeGraphStatus();
  return NextResponse.json(status);
}

export async function GET() {
  try {
    return await respond();
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Knowledge graph status failed." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    return await respond();
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Knowledge graph status failed." },
      { status: 500 }
    );
  }
}
