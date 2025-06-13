import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { fromSSO } from "@aws-sdk/credential-provider-sso";

let bedrockClient = null;

function getBedrockClient(options = {}) {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION,
      credentials: fromSSO({ profile: process.env.AWS_PROFILE || "default" }),
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
    modelId: process.env.EMBEDDING_MODEL,
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
