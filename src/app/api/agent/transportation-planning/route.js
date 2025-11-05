import { callAgent } from "@/agents/callAgent";
import getMongoClientPromise from "@/integrations/mongodb/client";

export async function POST(request) {
  try {
    const { shipmentData } = await request.json();
    
    if (!shipmentData || !shipmentData.shipment_id) {
      return Response.json({ error: "Shipment data with shipment_id is required" }, { status: 400 });
    }

    console.log('Received RCA data:', JSON.stringify(shipmentData, null, 2));
    
    // Fetch complete shipment details from MongoDB
    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    if (!dbName) {
      throw new Error("DATABASE_NAME environment variable is required but not set");
    }
    
    const db = client.db(dbName);
    const shipmentsCollection = db.collection("shipments");
    
    const fullShipment = await shipmentsCollection.findOne({ 
      shipment_id: shipmentData.shipment_id 
    });
    
    if (!fullShipment) {
      return Response.json({ 
        error: `Shipment ${shipmentData.shipment_id} not found in database` 
      }, { status: 404 });
    }
    
    console.log('Found full shipment:', JSON.stringify(fullShipment, null, 2));
    
    // Create detailed message for the Transportation Planning Agent
    const message = `Find alternative routes for delayed shipment:

Shipment ID: ${fullShipment.shipment_id}
Priority: ${fullShipment.priority}
Origin: ${fullShipment.origin?.city}, ${fullShipment.origin?.state}, ${fullShipment.origin?.country}
Destination: ${fullShipment.destination?.city}, ${fullShipment.destination?.state}, ${fullShipment.destination?.country}
Failed Carrier: ${fullShipment.carrier}
Delay Reason: ${shipmentData.root_cause || fullShipment.delay_reason || 'Unknown'}
Product Category: ${fullShipment.product?.category}
Product Name: ${fullShipment.product?.name}
Weight: ${fullShipment.product?.weight_kg} kg
Value: $${fullShipment.product?.value_usd}
Special Handling: ${fullShipment.special_handling ? fullShipment.special_handling.join(', ') : 'None'}

Root Cause Analysis: ${shipmentData.root_cause}
Delay Impact: ${shipmentData.delay_impact}

Please use your geospatial tools to find suitable alternative carriers near the origin and destination locations, and provide cost-benefit analysis with reliability recommendations.`;

    // Call Transportation Planning Agent with full state access
    const threadId = `transportation-${shipmentData.shipment_id}-${Date.now()}`;
    
    // Import and create the graph to get full state
    const { createAgentGraph } = await import("@/agents/transportation/graph.js");
    const { HumanMessage } = await import("@langchain/core/messages");
    
    const agentGraph = createAgentGraph(client, dbName);
    
    // Invoke the agent and get full state
    const finalState = await agentGraph.invoke({
      messages: [new HumanMessage(message)],
    }, {
      recursionLimit: 25,
      configurable: { thread_id: threadId }
    });
    
    // Extract the agent's response
    const messages = finalState.messages;
    const lastMessage = messages[messages.length - 1];
    
    // Look for format_alternatives tool results in the messages
    let structuredAlternatives = null;
    for (const message of messages) {
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.name === 'format_alternatives') {
            // Find the corresponding tool result
            const toolResult = messages.find(m => 
              m.type === 'tool' && m.tool_call_id === toolCall.id
            );
            if (toolResult) {
              try {
                structuredAlternatives = JSON.parse(toolResult.content);
              } catch (e) {
                console.error('Failed to parse tool result:', e);
              }
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      agent_response: lastMessage.content,
      threadId: threadId,
      alternatives: structuredAlternatives?.alternatives || null,
      metadata: structuredAlternatives?.metadata || null
    });
    
  } catch (error) {
    console.error("Transportation planning agent error:", error);
    return Response.json(
      { error: "Failed to process transportation planning request" },
      { status: 500 }
    );
  }
}