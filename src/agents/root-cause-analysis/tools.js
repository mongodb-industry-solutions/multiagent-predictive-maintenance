import { tool } from "@langchain/core/tools";
import getMongoClientPromise from "@/integrations/mongodb/client";

export const retrieveCarrierHistory = tool(
  async ({ carrier_name, n = 5 }) => {
    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    const db = client.db(dbName);
    
    // Find recent shipments from this carrier
    const shipments = await db.collection("shipments")
      .find({ carrier: carrier_name })
      .sort({ created_at: -1 })
      .limit(n)
      .toArray();
    
    return JSON.stringify(shipments);
  },
  {
    name: "retrieve_carrier_history",
    description: "Retrieve recent shipments history for a specific carrier",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["retrieve_carrier_history"],
        },
        carrier_name: {
          type: "string",
          description: "Name of the carrier to search for",
        },
        n: {
          type: "number",
          description: "Number of shipments to return (default 5)",
          default: 5,
        },
      },
      required: ["name", "carrier_name"],
    },
  }
);

export const generateShipmentIncidentReport = tool(
  async (params) => {
    const { name, ...rest } = params;
    const doc = { ...rest, ts: new Date() };

    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    const db = client.db(dbName);
    const result = await db.collection("shipment_incident_reports").insertOne(doc);
    
    return JSON.stringify(result);
  },
  {
    name: "generate_shipment_incident_report",
    description: "Generate a detailed incident report for a delayed shipment",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["generate_shipment_incident_report"],
        },
        shipment_id: {
          type: "string",
          description: "ID of the shipment involved",
        },
        carrier: {
          type: "string", 
          description: "Carrier involved in the incident",
        },
        root_cause: {
          type: "string",
          description: "Root cause analysis of the delay",
        },
        delay_impact: {
          type: "string",
          description: "Impact assessment of the delay",
        },
        recommendations: {
          type: "array",
          description: "List of recommendations to prevent future delays",
          items: {
            type: "string"
          }
        },
      },
      required: [
        "name",
        "shipment_id", 
        "carrier",
        "root_cause",
        "delay_impact",
        "recommendations"
      ],
    },
  }
);

export function getTools() {
  return [
    retrieveCarrierHistory,
    generateShipmentIncidentReport,
  ];
}