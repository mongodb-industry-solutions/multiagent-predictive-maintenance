import { ChatBedrockConverse } from "@langchain/aws";
import { defaultProvider } from "@aws-sdk/credential-provider-node";

const AWS_REGION = process.env.AWS_REGION;
const AWS_PROFILE = process.env.AWS_PROFILE;
const COMPLETION_MODEL = process.env.COMPLETION_MODEL;

/**
 * Initialize a Bedrock client with configured model and credentials
 * @returns {ChatBedrockConverse} Initialized Bedrock client
 */
let bedrockClient = null;

export function createBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new ChatBedrockConverse({
      model: COMPLETION_MODEL,
      region: AWS_REGION,
      credentials: defaultProvider(AWS_PROFILE ? { profile: AWS_PROFILE } : {}),
    });
  }
  return bedrockClient;
}

/**
 * Send messages to Bedrock and get a response
 * @param {Array} messages - Array of messages in LangChain format
 * @returns {Promise<Object>} - Response from the model
 */
export async function invokeBedrock(messages) {
  try {
    const model = createBedrockClient();
    return await model.invoke(messages);
  } catch (error) {
    console.error("Error invoking Bedrock:", error);
    throw new Error(`Bedrock conversation failed: ${error.message}`);
  }
}

/**
 * Stream responses from Bedrock
 * @param {Array} messages - Array of messages in LangChain format
 * @returns {Promise<AsyncIterable>} - Stream of responses
 */
export async function streamFromBedrock(messages) {
  try {
    const model = createBedrockClient();
    return await model.stream(messages);
  } catch (error) {
    console.error("Error streaming from Bedrock:", error);
    throw new Error(`Bedrock streaming failed: ${error.message}`);
  }
}
