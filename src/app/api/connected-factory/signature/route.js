import { NextResponse } from "next/server";
import { computeLiveSignature } from "@/lib/connectedFactory/pipelineRunner";
import {
  CF_MACHINE_ID,
  getCurrentDemoDay,
} from "@/lib/connectedFactory/constants";
import { DEFAULT_SIGNAL } from "@/lib/connectedFactory/signatures";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dayStr = searchParams.get("day") || getCurrentDemoDay();
    const machineId =
      searchParams.get("machineId") ||
      searchParams.get("workCell") ||
      CF_MACHINE_ID;
    const start = searchParams.get("start") || `${dayStr}T08:12:30Z`;
    const end = searchParams.get("end") || `${dayStr}T08:16:30Z`;
    const signal = searchParams.get("signal") || DEFAULT_SIGNAL;

    const result = await computeLiveSignature(machineId, start, end, signal);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to compute live signature" },
      { status: 400 }
    );
  }
}
