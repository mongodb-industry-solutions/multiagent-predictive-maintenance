import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createBedrockClient } from "../../integrations/bedrock/chat.js";
import { StateAnnotation } from "./state.js";
import { getTools } from "./tools.js";

// Get available tools
const tools = getTools();

/**
 * Create a tool node for handling tool calls
 */
const toolNode = new ToolNode(tools);

/**
 * Define the function that calls the model
 * @param {Object} state - Current graph state
 * @param {Object} config - Configuration options
 * @returns {Object} Updated state with AI message
 */
export async function callModel(state, config) {
  const model = createBedrockClient();
  const bindedModel = model.bindTools(tools);

  // Create a prompt template for the conversation
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are the Failure agent. 
      You receive alert details, retrieve additional context, and generate an incident report. 
      Use your tools as needed.
      Current time: {time}.`,
    ],
    new MessagesPlaceholder("messages"),
  ]);

  // Format the prompt with the current state
  const formattedPrompt = await prompt.formatMessages({
    time: new Date().toISOString(),
    messages: state.messages,
  });

  try {
    // Call the model with the formatted prompt
    const result = await bindedModel.invoke(formattedPrompt);

    // Return the model's response to update the state
    return { messages: [result] };
  } catch (error) {
    console.error("Error calling model:", error);

    // Return a fallback response in case of error
    return {
      messages: [
        {
          role: "ai",
          content:
            "I apologize, but I encountered an error while processing your request. Please try again.",
        },
      ],
    };
  }
}

/**
 * Define the function that determines the next step in the graph
 * @param {Object} state - Current graph state
 * @returns {string} Next node to execute or end
 */
export function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // If the last message has tool calls, route to tools node
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Otherwise, end the graph
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
  graph.name = "Failure Agent";

  return graph;
}
