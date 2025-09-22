import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { defaultProvider } from "@aws-sdk/credential-provider-node";

const AWS_REGION = process.env.AWS_REGION;
const AWS_PROFILE = process.env.AWS_PROFILE;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL;

let bedrockClient = null;

function getBedrockClient(options = {}) {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: defaultProvider(AWS_PROFILE ? { profile: AWS_PROFILE } : {}),
      ...options,
    });
  }
  return bedrockClient;
}

/**
 * Generate an embedding for a given text using Bedrock Runtime API.
 * @param {string} text - The text to embed.
 * @param {object} [options] - Optional Bedrock client options.
 * @returns {Promise<Array<number>>} The embedding vector.
 */
export async function generateEmbedding(text, options = {}) {
  const payload = {
    texts: [text],
    input_type: "search_query",
    embedding_types: ["float"],
  };

  const input = {
    body: JSON.stringify(payload),
    modelId: EMBEDDING_MODEL,
    accept: "*/*",
    contentType: "application/json",
  };

  try {
    const client = getBedrockClient(options);
    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    const responseText = new TextDecoder().decode(response.body);
    const embedding = JSON.parse(responseText).embeddings.float[0];
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}
