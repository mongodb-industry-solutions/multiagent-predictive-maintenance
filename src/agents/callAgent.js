import { HumanMessage } from "@langchain/core/messages";
import { clientPromise } from "@/integrations/mongodb/client.js";
import { getAgentById } from "./config.js";

/**
 * Cache for compiled agent graphs by agentId
 * @type {Object<string, import("@langchain/core").AgentGraph>}
 */
const agentGraphCache = {};

// LangChain callback handlers (no emojis, only required params)
export const agentCallbacks = {
  handleToolStart(tool, input, runId) {
    console.log("[Tool Start]", JSON.parse(input).name);
  },
  handleToolEnd(output, runId) {
    console.log("[Tool End]", output.name);
  },
  handleToolError(err, runId) {
    console.error("[Tool Error]", err);
  },
  handleLLMError(err, runId) {
    console.error("[LLM Error]", err);
  },
  handleChainError(err, runId) {
    console.error("[Chain Error]", err);
  },
};

/**
 * Call the agent with a message and get a response
 * @param {string} message - User's message
 * @param {string} threadId - Thread ID for conversation tracking
 * @param {string} agentId - Agent ID to select which agent to use
 * @returns {Promise<string>} Agent's response
 */
export async function callAgent(message, threadId, agentId = "test") {
  try {
    // Initialize MongoDB client
    const dbName = process.env.DATABASE_NAME;
    const client = await clientPromise;

    // Get the agent config
    const agentConfig = getAgentById(agentId);
    if (!agentConfig) throw new Error(`Agent not found: ${agentId}`);

    // Only create the agent graph if not already cached
    let agentGraph = agentGraphCache[agentId];
    if (!agentGraph) {
      agentGraph = agentConfig.createGraph(client, dbName);
      agentGraphCache[agentId] = agentGraph;
    }

    // Invoke the agent with the user's message
    const finalState = await agentGraph.invoke(
      {
        messages: [new HumanMessage(message)],
      },
      {
        recursionLimit: 10,
        configurable: { thread_id: threadId },
        callbacks: [agentCallbacks],
      }
    );

    // Extract the agent's response (last message)
    const messages = finalState.messages;
    const lastMessage = messages[messages.length - 1];

    return lastMessage.content;
  } catch (error) {
    console.error("Error in callAgent:", error);
    throw new Error(`Failed to get agent response: ${error.message}`);
  }
}

/**
 * Handle API request to chat with the agent
 * @param {Object} req - Request object
 * @returns {Promise<Object>} Response object
 */
export async function handleChatRequest(req) {
  const { message, threadId = Date.now().toString(), agentId = "test" } = req;

  if (!message) {
    throw new Error('Missing required field: "message"');
  }

  const response = await callAgent(message, threadId, agentId);

  return {
    threadId,
    response,
  };
}
