import { NextResponse } from "next/server";
import { getAgentById } from "@/agents/config";
import getMongoClientPromise from "@/integrations/mongodb/client";

export async function POST(req) {
  try {
    const { agentId } = await req.json();
    const dbName = process.env.DATABASE_NAME;
    if (!dbName)
      throw new Error(
        "DATABASE_NAME environment variable is required but not set"
      );
    const client = await getMongoClientPromise();
    const agentConfig = getAgentById(agentId);
    if (!agentConfig) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const graph = agentConfig.createGraph(client, dbName);
    const drawableGraph = await graph.getGraphAsync();

    if (!drawableGraph.drawMermaidPng) {
      return NextResponse.json(
        { error: "Graph visualization not supported for this agent." },
        { status: 400 }
      );
    }

    const image = await drawableGraph.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();

    return new Response(Buffer.from(arrayBuffer), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to visualize agent graph" },
      { status: 500 }
    );
  }
}
