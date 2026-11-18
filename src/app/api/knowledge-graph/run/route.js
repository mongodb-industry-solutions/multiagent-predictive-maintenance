import { NextResponse } from "next/server";
import { KNOWLEDGE_GRAPH_COLLECTION } from "@/lib/knowledgeGraph/seedData";
import { runKnowledgeGraphPipeline } from "@/lib/knowledgeGraph/pipelineRunner";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const collection = body?.collection || KNOWLEDGE_GRAPH_COLLECTION;
    const pipeline = body?.pipeline;
    if (!pipeline) {
      return NextResponse.json(
        { error: "Missing aggregation pipeline." },
        { status: 400 }
      );
    }
    const result = await runKnowledgeGraphPipeline({ collection, pipeline });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Knowledge graph query failed." },
      { status: 400 }
    );
  }
}
