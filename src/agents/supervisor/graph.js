import { StateGraph } from "@langchain/langgraph";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createBedrockClient } from "../../integrations/bedrock/chat.js";
import { StateAnnotation } from "./state.js";
import { createAgentGraph as createFailureAgentGraph } from "../failure/graph.js";
import { createAgentGraph as createWorkorderAgentGraph } from "../workorder/graph.js";
import { createAgentGraph as createPlanningAgentGraph } from "../planning/graph.js";
import { getTools } from "./tools.js";

const tools = getTools();

const supervisorPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a supervisor working for a manufacturing plant in a predictive maintenance scenario.
    You have three agents: failure, workorder, and planning. Each agent should be called only once in a workflow. Proceed witht he next agents even if one of them fails or doesn;t return results.
    Given the conversation below, use the 'route_agent' tool to decide who should act next. The output must be one of: failure, workorder, planning, __end__.
    1. Use 'failure' when you receive an alert to create an incident report. 
    2. Use 'workorder' to create a workorder from an incident report.
    3. Use 'planning' to schedule a workorder.
    The end to end flow when receiving an alert is calling in this order 'failure', then 'workorder', then 'planning'.
    You can answer general questions yourself, but if you receive an alert, you must route to the workflow starting with 'failure'.
    If all the other agents have acted, return '__end__'.`,
  ],
  new MessagesPlaceholder("messages"),
]);

const validAgents = ["failure", "workorder", "planning", "__end__"];

export async function callModel(state) {
  const model = createBedrockClient();
  const bindedModel = model.bindTools(tools);
  // Only exclude ToolMessage objects from the prompt history
  const filteredMessages = (state.messages || []).filter(
    (msg) => !(msg.constructor && msg.constructor.name === "ToolMessage")
  );
  const formattedPrompt = await supervisorPrompt.formatMessages({
    messages: filteredMessages,
  });
  console.log(formattedPrompt);
  let next = null;
  let supervisorMessage = "";
  let outputMessage = null;
  try {
    const result = await bindedModel.invoke(formattedPrompt);
    // If the model called the tool, use the tool result for routing
    if (result.tool_calls && result.tool_calls.length > 0) {
      const toolResult = result.tool_calls.find(
        (tc) => tc.name === "route_agent"
      );
      if (
        toolResult &&
        toolResult.args &&
        toolResult.args.next &&
        validAgents.includes(toolResult.args.next)
      ) {
        next = toolResult.args.next;
        supervisorMessage = `Supervisor decided: ${next}`;
      }
    } else if (
      result &&
      result.content &&
      typeof result.content === "string" &&
      result.content.trim() !== ""
    ) {
      // No tool call, so output the model's response to the user
      outputMessage = result.content.trim();
      next = "__end__";
    }
  } catch (error) {
    console.error("Error in supervisorAgent LLM routing:", error);
    next = "__end__";
    supervisorMessage = `I'm sorry, I cannot process this request. Please provide a valid alert or workflow input.`;
  }
  console.log("Supervisor routing decision:", next);

  let messages = [...state.messages];
  if (outputMessage) {
    messages.push({
      role: "ai",
      content: outputMessage,
      name: "supervisor",
    });
  } else if (supervisorMessage) {
    messages.push({
      role: "system",
      content: supervisorMessage,
      name: "supervisor",
    });
  }

  return {
    next: next || "__end__",
    messages,
    lastAgent: next === "__end__" ? null : next,
  };
}

export function shouldContinue(state) {
  // Route to the next agent or end
  const next = state.next;
  if (next === "failure") return "failure";
  if (next === "workorder") return "workorder";
  if (next === "planning") return "planning";
  return "__end__";
}

export function agentNode(agentGraph, name) {
  return async (state) => {
    const result = await agentGraph.invoke(state);
    // Only append messages with non-empty content
    const validMessages = (result.messages || []).filter(
      (msg) =>
        msg.content &&
        typeof msg.content === "string" &&
        msg.content.trim() !== ""
    );
    return {
      messages: [...(state.messages || []), ...validMessages],
      lastAgent: name,
    };
  };
}

export function createAgentGraph(client, dbName) {
  // Create subagent graphs with checkpointer
  const failureGraph = createFailureAgentGraph(client, dbName);
  const workorderGraph = createWorkorderAgentGraph(client, dbName);
  const planningGraph = createPlanningAgentGraph(client, dbName);

  const builder = new StateGraph(StateAnnotation)
    .addNode("supervisor", callModel)
    .addNode("failure", agentNode(failureGraph, "failure"))
    .addNode("workorder", agentNode(workorderGraph, "workorder"))
    .addNode("planning", agentNode(planningGraph, "planning"))
    .addEdge("__start__", "supervisor")
    .addConditionalEdges("supervisor", shouldContinue)
    .addEdge("failure", "supervisor")
    .addEdge("workorder", "supervisor")
    .addEdge("planning", "supervisor");

  let checkpointer = null;
  if (client && dbName) {
    checkpointer = new MongoDBSaver({ client, dbName });
  }

  const graph = builder.compile({ checkpointer });
  graph.name = "SupervisorAgentGraph";
  return graph;
}
