import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: "OK",
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "API connection failed" },
      { status: 500 }
    );
  }
}
