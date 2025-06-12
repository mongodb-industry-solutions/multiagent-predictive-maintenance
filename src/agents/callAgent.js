import { HumanMessage } from "@langchain/core/messages";
import { clientPromise } from "@/integrations/mongodb/client.js";
import { getAgentById } from "./config.js";

/**
 * Cache for compiled agent graphs by agentId
 * @type {Object<string, import("@langchain/core").AgentGraph>}
 */
const agentGraphCache = {};

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
        callbacks: [
          //   {
          //     handleNodeStart(node, input) {
          //       console.log(`🔵 [Node Start] ${node.name}`, input);
          //     },
          //     handleNodeEnd(node, output) {
          //       console.log(`🟢 [Node End] ${node.name}`, output);
          //     },
          //     handleToolStart(tool, input) {
          //       console.log(`🛠️ [Tool Start] ${tool.name}`, input);
          //     },
          //     handleToolEnd(tool, output) {
          //       console.log(`✅ [Tool End] ${tool.name}`, output);
          //     },
          //     handleChainStart(chain, input) {
          //       console.log(`⛓️ [Chain Start] ${chain.name}`, input);
          //     },
          //     handleChainEnd(chain, output) {
          //       console.log(`🔚 [Chain End] ${chain.name}`, output);
          //     },
          //     handleAgentAction(action, runId) {
          //       console.log(`🧠 [Agent Action]`, action);
          //     },
          //     handleAgentEnd(action, runId) {
          //       console.log(`🏁 [Agent End]`, action);
          //     },
          //     handleError(error, run) {
          //       console.error(`❌ [Error]`, error);
          //     },
          //   },
        ],
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
