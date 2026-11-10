import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createChatClient } from "@/integrations/chat_factory.js";
import { StateAnnotation } from "./state.js";
import { getTools } from "./tools.js";

const tools = getTools();
const toolNode = new ToolNode(tools);

export async function callModel(state) {
  const model = createChatClient().bindTools(tools);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are the Contestable AI Coordinator Agent for predictive maintenance.
You coordinate two independent specialist agents:
1. vibration_pattern_agent (analyzes vibration frequency spectrum against model defect bands)
2. maintenance_history_agent (analyzes repair logs, sensor calibration dates, tooling swaps, and manuals)

Both agents argue FOR (support) and AGAINST (challenge) a fixed list of three candidate root causes:
- bearing_degradation
- misalignment
- sensor_fault

Candidate scores are computed with:
score = sigmoid(tau + 0.3 * total_support - 0.3 * total_challenge) where tau starts at 0.
Use your tools to load evidence or run the specialist debate and explain how a reliability engineer can accept, reject, or modify any argument to immediately recalculate the score.`,
    ],
    new MessagesPlaceholder("messages"),
  ]);

  const formattedPrompt = await prompt.formatMessages({
    messages: state.messages,
  });

  try {
    const result = await model.invoke(formattedPrompt);
    return { messages: [result] };
  } catch (error) {
    console.error("Error calling Contestable Agent model:", error);
    return {
      messages: [
        {
          role: "ai",
          content:
            "I encountered an error while running the Contestable AI agent. Please try again.",
        },
      ],
    };
  }
}

export function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "__end__";
}

export function createAgentGraph(client, dbName) {
  const builder = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  let checkpointer = null;
  if (client && dbName) {
    checkpointer = new MongoDBSaver({ client, dbName });
  }

  const graph = builder.compile({ checkpointer });
  graph.name = "Contestable AI Agent";
  return graph;
}
