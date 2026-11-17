import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { SystemMessage } from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createChatClient } from "@/integrations/chat_factory";
import { getCurrentDemoDay } from "@/lib/connectedFactory/constants";
import { StateAnnotation } from "./state";
import { getContextExplorerTools } from "./tools";

const tools = getContextExplorerTools();
const toolNode = new ToolNode(tools);

export function buildContextExplorerSystemPrompt(dbName) {
  const targetDb =
    dbName || process.env.DATABASE_NAME || "agentic_predictive_maintenance";
  const dayStr = getCurrentDemoDay();
  return `You are a manufacturing data analyst for Leafy Factory's EV Battery Pack Assembly line, working live in the Connected Factory Context Explorer.
You answer questions about production and welding telemetry data in MongoDB using ONLY the read-only tools provided ("aggregate" and "find").

Database: "${targetDb}". Active UTC shift date ("today"): "${dayStr}".
Collections and their exact fields for machine "LTW-04":
- telemetry (time series, 24h TTL): ts (BSON Date), value (number), metadata.machine_id (e.g. "LTW-04"), metadata.signal ("weld-zone-temp" in degC, "laser-power" in W, "shield-gas-flow" in L/min), metadata.materialMaster (e.g. "MAT-CU-020"), metadata.workOrder (e.g. "WO-1001234"), metadata.factory_id ("leafy_factory"), metadata.prod_line_id ("ev_module_assembly"), metadata.area ("welding").
- alerts: alert_id, machine_id (e.g. "LTW-04"), ts (BSON Date), err_code, err_name, priority (1 = highest), status, source, details.component, details.message. Carries NO workOrder, NO materialMaster, and NO operatorId.
- workorders: shared collection containing M1 maintenance work orders AND LTW-04 production order spans. Production order spans on LTW-04 have orderType: "production", workOrder (e.g. "WO-1001234"), machine_id ("LTW-04"), startedAt (BSON Date), endedAt (BSON Date), materialMaster, product (e.g. "EV-PM-4C-S"), plannedQty, operatorId.
- materials: materialMaster ("MAT-CU-020", "MAT-AL-030", "MAT-CU-025"), name, supplier, thicknessMm, maxWeldTempC (number, degC).
- excursions: excursionId, machine_id, site, signal, start, end, materialMaster, material, peakTempC, rootCause, fix, status, signature (24-number curve vector).

Key relationships:
- alerts.machine_id, workorders.machine_id, and telemetry.metadata.machine_id all hold the machine ID (e.g. "LTW-04").
- Join materials on materialMaster (from telemetry.metadata.materialMaster or workorders.materialMaster), never on product.
- Use Extended JSON {"$date": "${dayStr}T00:00:00Z"} when matching BSON Date fields (ts, startedAt, endedAt).

Work like a senior engineer:
- Do NOT inspect schemas or sample documents first; the field names above are complete and exact.
- Write ONE concise aggregation pipeline that answers the whole question, pass database "${targetDb}", and run it with the "aggregate" tool.
- When matching a point-in-time alert to a production order span, use $lookup from "workorders" with localField: "machine_id", foreignField: "machine_id", let: { t: "$ts" }, and $expr with $lte: ["$startedAt", "$$t"] and $gt: ["$endedAt", "$$t"], followed by $unwind with preserveNullAndEmptyArrays: true.
- Avoid $unionWith, $facet, or many small find calls unless unavoidable.
- Do not invent numbers. Once the tool returns the numbers, stop calling tools and answer in at most 3 short, actionable bullet points for a plant manager. Do not repeat the pipeline in prose or comment on tool formatting.`;
}

export async function callModel(state) {
  const model = createChatClient().bindTools(tools);
  const response = await model.invoke([
    new SystemMessage(buildContextExplorerSystemPrompt()),
    ...state.messages,
  ]);
  return { messages: [response] };
}

export function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  return lastMessage?.tool_calls?.length ? "tools" : "__end__";
}

export function createAgentGraph(client, dbName) {
  const builder = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  const checkpointer =
    client && dbName ? new MongoDBSaver({ client, dbName }) : undefined;
  const graph = builder.compile(checkpointer ? { checkpointer } : {});
  graph.name = "Connected Factory Context Explorer Agent";
  return graph;
}
