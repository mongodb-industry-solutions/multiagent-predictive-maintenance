import { NextResponse } from "next/server";
import {
  getConnectedFactoryStatus,
  triggerConnectedFactoryBackgroundInit,
} from "@/lib/connectedFactory/seedData";
import { plainValue } from "@/lib/connectedFactory/pipelineRunner";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    let status = await getConnectedFactoryStatus();

    // If anything for the active UTC day is missing and no init error occurred,
    // automatically start single-flight background provisioning.
    if (!status.fullyProvisioned && !status.initializing && !status.initError) {
      void triggerConnectedFactoryBackgroundInit({ force: false });
      status = { ...status, initializing: true };
    }

    return NextResponse.json({
      ...status,
      collections: status.collections.map((col) => ({
        ...col,
        sample: col.sample ? plainValue(col.sample) : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to inspect Connected Factory status" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    // Kick off non-blocking background initialization so Kanopy/Envoy proxies
    // never time out waiting for 120,960 time-series inserts.
    void triggerConnectedFactoryBackgroundInit({
      force: Boolean(body?.force),
    });
    const status = await getConnectedFactoryStatus();
    return NextResponse.json({
      ...status,
      initializing: true,
      collections: status.collections.map((col) => ({
        ...col,
        sample: col.sample ? plainValue(col.sample) : null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to initialize Connected Factory data" },
      { status: 500 }
    );
  }
}
