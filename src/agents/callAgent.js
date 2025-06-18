import { HumanMessage } from "@langchain/core/messages";
import { clientPromise } from "@/integrations/mongodb/client.js";
import { getAgentById } from "./config.js";

/**
 * Cache for compiled agent graphs by agentId
 * @type {Object<string, import("@langchain/core").AgentGraph>}
 */
const agentGraphCache = {};

/**
 * Create agent callbacks that write logs to a stream
 * @param {WritableStreamDefaultWriter} writer
 */
function createAgentCallbacks(writer) {
  const writeLog = async (obj) => {
    await writer.ready;
    writer.write(JSON.stringify(obj) + "\n");
  };
  return {
    handleToolStart(tool, input, runId) {
      console.log("[Tool Start]", JSON.parse(input).name);
      writeLog({
        type: "update",
        name: "tool_start",
        values: { name: JSON.parse(input).name },
      });
    },
    handleToolEnd(output, runId) {
      console.log("[Tool End]", output.name);
      writeLog({
        type: "update",
        name: "tool_end",
        values: { name: output.name },
      });
    },
    handleToolError(err, runId) {
      writeLog({
        type: "error",
        name: "tool_error",
        values: { name: err?.name || "unknown" },
      });
    },
    handleLLMError(err, runId) {
      writeLog({
        type: "error",
        name: "llm_error",
        values: { name: err?.name || "unknown" },
      });
    },
    handleChainError(err, runId) {
      writeLog({
        type: "error",
        name: "chain_error",
        values: { name: err?.name || "unknown" },
      });
    },
  };
}

// LangChain callback handlers
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
 * Call the agent with a message and get a response, streaming logs to writer if provided
 * @param {string} message - User's message
 * @param {string} threadId - Thread ID for conversation tracking
 * @param {string} agentId - Agent ID to select which agent to use
 * @param {WritableStreamDefaultWriter} [writer] - Optional stream writer for logs
 * @returns {Promise<string>} Agent's response
 */
export async function callAgent(message, threadId, agentId = "test", writer) {
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

    console.log(writer ? "Streaming mode enabled" : "Non-streaming mode");

    // Use streaming callbacks if writer is provided
    const callbacks = writer
      ? [createAgentCallbacks(writer)]
      : [agentCallbacks];

    // Invoke the agent with the user's message
    const finalState = await agentGraph.invoke(
      {
        messages: [new HumanMessage(message)],
      },
      {
        recursionLimit: 10,
        configurable: { thread_id: threadId },
        callbacks,
      }
    );

    // Extract the agent's response (last message)
    const messages = finalState.messages;
    const lastMessage = messages[messages.length - 1];

    // If streaming, send the final response
    if (writer) {
      await writer.ready;
      await writer.write(
        JSON.stringify({
          type: "final",
          name: "agent_response",
          values: { name: "response", content: lastMessage.content },
        }) + "\n"
      );
      await writer.close();
    }

    return lastMessage.content;
  } catch (error) {
    if (writer) {
      await writer.ready;
      await writer.write(
        JSON.stringify({
          type: "error",
          name: "agent_error",
          values: { name: error.message },
        }) + "\n"
      );
      await writer.close();
    }
    console.error("Error in callAgent:", error);
    throw new Error(`Failed to get agent response: ${error.message}`);
  }
}

/**
 * Handle API request to chat with the agent (non-streaming)
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

/**
 * Handle API request to chat with the agent (streaming)
 * @param {Object} req - Request object
 * @param {WritableStreamDefaultWriter} writer - Stream writer
 * @returns {Promise<void>}
 */
export async function handleChatRequestStream(req, writer) {
  const { message, threadId = Date.now().toString(), agentId = "test" } = req;
  if (!message) {
    await writer.ready;
    await writer.write(
      JSON.stringify({
        type: "error",
        message: 'Missing required field: "message"',
      }) + "\n"
    );
    await writer.close();
    return;
  }
  await callAgent(message, threadId, agentId, writer);
}
