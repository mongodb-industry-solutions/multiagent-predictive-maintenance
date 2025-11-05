import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createBedrockClient } from "../../integrations/bedrock/chat.js";
import { StateAnnotation } from "./state.js";
import { findNearestCarriersTool, validateServiceCoverageTool, formatAlternativesTool } from "./tools.js";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";

const tools = [findNearestCarriersTool, validateServiceCoverageTool, formatAlternativesTool];

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are the Transportation Planning agent specialized in finding alternative carriers and routes for delayed shipments.
    
    Your workflow should be:
    1. Analyze the delayed shipment details (origin, destination, carrier failure reason)
    2. Find suitable alternative carriers using your geospatial tools
    3. **IMPORTANT**: After identifying carrier names, use format_alternatives tool to create structured data
    4. Focus on carriers that can handle the specific shipment requirements
    
    Available tools:
    - find_nearest_carriers: Find carriers near pickup/delivery locations with optimization
    - validate_service_coverage: Check if carriers serve specific locations within their service areas
    - format_alternatives: Convert recommended carrier names into structured alternatives with real data
    
    **Critical**: Always finish by calling format_alternatives with the recommended carrier names to provide structured data to the UI.
    The format_alternatives tool will fetch real carrier data from MongoDB and calculate accurate costs, times, and metrics.
    
    Current time: {time}.`,
  ],
  new MessagesPlaceholder("messages"),
]);

export async function callModel(state) {
  const model = createBedrockClient();
  const bindedModel = model.bindTools(tools);
  const formattedPrompt = await prompt.formatMessages({
    time: new Date().toISOString(),
    messages: state.messages,
  });
  const result = await bindedModel.invoke(formattedPrompt);
  
  // Parse any structured alternatives from the model response
  let alternatives = state.alternatives || [];
  
  // Check if model provided structured alternatives (this would be enhanced with custom parsing)
  if (result.content && typeof result.content === 'string') {
    try {
      // Look for JSON-like structures in the response that could be alternatives
      const jsonMatch = result.content.match(/\{[\s\S]*"alternatives"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.alternatives && Array.isArray(parsed.alternatives)) {
          alternatives = parsed.alternatives;
        }
      }
    } catch (e) {
      // If parsing fails, alternatives will remain empty/previous state
      console.log('Could not parse alternatives from model response');
    }
  }
  
  return { 
    messages: [result],
    alternatives 
  };
}

export function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  // If the last message has tool calls, route to tools node
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }

  // Otherwise, end the graph
  return "__end__";
}

export function createAgentGraph(client, dbName) {
  const builder = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  let checkpointer = null;
  if (client && dbName) {
    checkpointer = new MongoDBSaver({ client, dbName });
  }

  const graph = builder.compile({ checkpointer });
  graph.name = "Transportation Planning Agent";
  return graph;
}