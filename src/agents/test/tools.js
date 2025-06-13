import { tool } from "@langchain/core/tools";
import { vectorSearch } from "@/integrations/mongodb/vectorSearch";

/**
 * A simple dummy tool that just returns a placeholder response
 * This is useful for testing the agent's tool-calling capabilities
 */
export const dummyTool = tool(
  async ({ query }) => {
    console.log("Dummy tool called with query:", query);

    // Return a simple placeholder response
    return `This is a placeholder response for your query: "${query}". 
In a real implementation, this would retrieve actual data or perform actions.
Current timestamp: ${new Date().toISOString()}`;
  },
  {
    name: "dummy_tool",
    description: "A placeholder tool that returns sample text for any query",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The query to process",
        },
      },
      required: ["query"],
    },
  }
);

/**
 * Tool for performing a vector search on the 'reviews' collection.
 */
export const reviewLookupTool = tool(
  async ({ query, n = 10 }) => {
    console.log("Review lookup tool called with query:", query);

    const dbConfig = {
      collection: "reviews",
      indexName: "default",
      textKey: "message",
      embeddingKey: "emb",
    };

    const result = await vectorSearch(query, dbConfig, n);
    return JSON.stringify(result);
  },
  {
    name: "review_lookup",
    description:
      "Performs a vector search on the reviews collection to find relevant reviews.",
    schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        n: {
          type: "number",
          description: "Number of results to return (optional, default 10)",
          default: 10,
        },
      },
      required: ["query"],
    },
  }
);

/**
 * Get all available tools for the agent
 * @returns {Array} Array of tool objects
 */
export function getTools() {
  return [dummyTool, reviewLookupTool];
}
