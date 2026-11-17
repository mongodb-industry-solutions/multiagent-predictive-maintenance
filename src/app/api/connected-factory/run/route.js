import { NextResponse } from "next/server";
import { runReadOnlyPipeline } from "@/lib/connectedFactory/pipelineRunner";
import { CF_COLLECTIONS } from "@/lib/connectedFactory/seedData";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const collection = body?.collection || CF_COLLECTIONS.TELEMETRY;
    const pipeline = body?.pipeline;
    const explain = Boolean(body?.explain);

    if (!pipeline) {
      return NextResponse.json(
        { error: "Missing aggregation pipeline." },
        { status: 400 }
      );
    }

    const result = await runReadOnlyPipeline({
      collection,
      pipeline,
      explain,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Pipeline execution failed." },
      { status: 400 }
    );
  }
}
