import { tool } from "@langchain/core/tools";

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
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["dummy_tool"],
        },
        query: {
          type: "string",
          description: "The query to process",
        },
      },
      required: ["name", "query"],
    },
  }
);

/**
 * Get all available tools for the agent
 * @returns {Array} Array of tool objects
 */
export function getTools() {
  return [dummyTool];
}
