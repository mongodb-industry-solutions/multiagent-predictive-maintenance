import { tool } from "@langchain/core/tools";

const agentOptions = ["failure", "workorder", "planning", "__end__"];

export const routeAgent = tool(
  async ({ next }) => {
    // Just echo back the next agent, this is for structured output
    return { next };
  },
  {
    name: "route_agent",
    description:
      "Route to the next agent in the workflow. The output must be one of the allowed agent options.",
    schema: {
      type: "object",
      properties: {
        next: {
          type: "string",
          description: "The next agent to call in the workflow.",
          enum: agentOptions,
        },
      },
      required: ["next"],
    },
  }
);

export function getTools() {
  return [routeAgent];
}
