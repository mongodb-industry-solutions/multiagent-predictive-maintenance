import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  AIMessage,
  HumanMessage,
  isHumanMessage,
  isToolMessage,
} from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createChatClient } from "@/integrations/chat_factory";
import { StateAnnotation } from "./state";
import { getTools, getToolsForSource } from "./tools";

const tools = getTools();
const toolNode = new ToolNode(tools);

function currentTurn(messages) {
  let start = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (isHumanMessage(messages[index])) {
      start = index;
      break;
    }
  }
  return {
    userText:
      start >= 0 && typeof messages[start]?.content === "string"
        ? messages[start].content
        : "",
    messages: start >= 0 ? messages.slice(start) : messages,
  };
}

function requiresChart(userText) {
  return /\b(chart|graph|plot|distribution|trend|mix)\b/i.test(userText);
}

function hasChartArtifact(messages) {
  return messages.some(
    (message) =>
      isToolMessage(message) && message.name === "render_factory_chart"
  );
}

function observedGradeCounts(messages) {
  const counts = new Map();
  const observed = new Set();
  const visited = new WeakSet();

  const visit = (value) => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (typeof value.grade === "string" && value.grade.trim()) {
      const grade = value.grade.trim();
      const key =
        value.event_id ||
        value.cell_id ||
        `${grade}:${value.ocv_v ?? ""}:${value.ir_milliohm ?? ""}`;
      if (!observed.has(key)) {
        observed.add(key);
        counts.set(grade, (counts.get(grade) || 0) + 1);
      }
    }
    Object.values(value).forEach(visit);
  };

  messages.forEach((message) => {
    if (!isToolMessage(message) || typeof message.content !== "string") return;
    try {
      visit(JSON.parse(message.content));
    } catch {
      // Non-JSON tool outputs cannot contribute grade observations.
    }
  });
  return counts;
}

function forcedGradeChart(messages, userText) {
  if (!/\b(cell|grade)\b/i.test(userText)) return null;
  const counts = observedGradeCounts(messages);
  if (counts.size === 0) return null;
  return new AIMessage({
    content: "",
    tool_calls: [
      {
        id: `forced-grade-chart-${Date.now()}`,
        name: "render_factory_chart",
        type: "tool_call",
        args: {
          name: "render_factory_chart",
          chart_type: "donut",
          title: "Live Cell-Grade Mix",
          description:
            "Observed Cell Screening grades for the active order. In-process values are provisional until unit completion.",
          unit: "cells",
          series: [
            {
              name: "Screened cells",
              data: [...counts.entries()].map(([label, value]) => ({
                label,
                value,
              })),
            },
          ],
        },
      },
    ],
  });
}

function sourceInstructions(config) {
  const source =
    config?.configurable?.factorySource === "local" ? "local" : "leafy";
  if (source === "local") {
    return `The selected source is Local simulation. For every new user
question, call inspect_local_factory_snapshot before answering. Treat its
captured_at value as the observation time. Do not call Leafy-only tools.`;
  }
  return `The selected source is Leafy Factory. Use the read-only Leafy tools
for evidence. If the user does not specify an order ID, call
list_factory_orders first and use the first active order unless comparison is
needed.`;
}

export async function callModel(state, config) {
  const source =
    config?.configurable?.factorySource === "local" ? "local" : "leafy";
  const model = createChatClient().bindTools(getToolsForSource(source));
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are Factory Chat, a manufacturing operations copilot for an EV
battery-module Unified Namespace demo.

Answer operational questions from tool evidence, not assumptions. Keep answers
concise, practical, and understandable to production supervisors, quality
engineers, and process engineers.

Rules:
- Always inspect the current source with tools before answering data questions.
- State the order ID and evidence source used. Qualify live, historical, and
  derived values accurately.
- Never invent measurements, orders, downtime, OEE, energy, root causes, or
  history that the available evidence does not contain.
- For every explicit chart request, retrieve numeric evidence and call
  render_factory_chart before the final answer. Never answer a chart request
  with text alone.
- If completed-unit metrics are empty, use the relevant live machine events or
  SCADA results when available and label the chart as in-process or
  intermediate. For Leafy cell-grade charts, prefer recent Cell Screening
  machine events so a running order can still produce a useful live chart. A
  single observed grade is enough for a provisional chart; do not refuse to
  chart it because the sample is small.
- For other trends, distributions, or metric comparisons, retrieve the data
  and then call render_factory_chart. Briefly interpret the chart in the final
  answer.
- Use SCADA state for the current batch/stage, machine events for station
  readings, production-unit documents for traceability, alerts for anomalies,
  thresholds for configured limits, and metrics for aggregated KPIs.
- A zero or empty result is valid evidence; explain its scope rather than
  filling gaps.
- Treat station-level failed checks separately from final unit disposition. A
  failed process check does not prove that a unit was scrapped, reworked, or
  blocked if the evidence does not say so.
- Recommend investigation areas only when useful. Do not claim a root cause,
  direct a production stop, quarantine material, or prescribe rework unless a
  tool result explicitly supports that action.
- Do not create, stop, or modify factory data. The page manages demo orders
  separately from this agent.

${sourceInstructions(config)}`,
    ],
    new MessagesPlaceholder("messages"),
  ]);
  const formattedPrompt = await prompt.formatMessages({
    messages: state.messages,
  });
  const result = await model.invoke(formattedPrompt);
  const turn = currentTurn(state.messages);
  if (
    requiresChart(turn.userText) &&
    !hasChartArtifact(turn.messages) &&
    !result.tool_calls?.length
  ) {
    const corrected = await model.invoke([
      ...formattedPrompt,
      result,
      new HumanMessage(
        "The user explicitly requested a chart. Call render_factory_chart now using the numeric evidence already retrieved. A single observation or category is valid for a provisional live chart. Do not answer with text until the chart tool has been called."
      ),
    ]);
    if (corrected.tool_calls?.length) return { messages: [corrected] };
    const fallbackChart = forcedGradeChart(turn.messages, turn.userText);
    if (fallbackChart) return { messages: [fallbackChart] };
    return { messages: [corrected] };
  }
  return { messages: [result] };
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
    client && dbName ? new MongoDBSaver({ client, dbName }) : null;
  const graph = builder.compile({ checkpointer });
  graph.name = "UNS Factory Chat";
  return graph;
}
