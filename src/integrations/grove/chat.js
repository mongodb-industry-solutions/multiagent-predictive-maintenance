import { ChatOpenAI } from "@langchain/openai";

const GROVE_API_KEY = process.env.GROVE_API_KEY;
const COMPLETION_MODEL = process.env.COMPLETION_MODEL;
const GROVE_BASE_URL = "https://grove-gateway-prod.azure-api.net/grove-foundry-prod/openai/v1";

/**
 * Initialize an OpenAI client with configured model and credentials
 * @returns {ChatOpenAI} Initialized OpenAI client
 */
let openaiClient = null;

export function createChatClient() {
  if (!openaiClient) {
    openaiClient = new ChatOpenAI({
      model: COMPLETION_MODEL,
      apiKey: "unused",
      configuration: {
        baseURL: GROVE_BASE_URL,
        defaultHeaders: { "api-key": GROVE_API_KEY }
      },
    });
  }
  return openaiClient;
}

/**
 * Send messages to OpenAI and get a response
 * @param {Array} messages - Array of messages in LangChain format
 * @returns {Promise<Object>} - Response from the model
 */
export async function invokeChat(messages) {
  try {
    const model = createChatClient();
    return await model.invoke(messages);
  } catch (error) {
    console.error("Error invoking OpenAI:", error);
    throw new Error(`OpenAI conversation failed: ${error.message}`);
  }
}

/**
 * Stream responses from OpenAI
 * @param {Array} messages - Array of messages in LangChain format
 * @returns {Promise<AsyncIterable>} - Stream of responses
 */
export async function streamChat(messages) {
  try {
    const model = createChatClient();
    return await model.stream(messages);
  } catch (error) {
    console.error("Error streaming from OpenAI:", error);
    throw new Error(`OpenAI streaming failed: ${error.message}`);
  }
}