import { tool } from "@langchain/core/tools";
import { vectorSearch } from "@/integrations/mongodb/vectorSearch";
import { clientPromise } from "@/integrations/mongodb/client";

export const retrieveManual = tool(
  async ({ query, n = 3 }) => {
    const dbConfig = {
      collection: "manuals",
      indexName: "default",
      textKey: ["text"],
      embeddingKey: "embedding",
      includeScore: true,
    };
    const result = await vectorSearch(query, dbConfig, n);
    return JSON.stringify(result);
  },
  {
    name: "retrieve_manual",
    description:
      "Retrieve the relevant manual for the alert via vector search.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["retrieve_manual"],
        },
        query: {
          type: "string",
          description: "The query to process",
        },
        n: {
          type: "number",
          description: "Number of results to return (optional, default 3)",
          default: 3,
        },
      },
      required: ["name", "query"],
    },
  }
);

export const retrieveWorkOrders = tool(
  async ({ query, n = 3 }) => {
    const dbConfig = {
      collection: "workorders",
      indexName: "default",
      textKey: ["title", "observations"],
      embeddingKey: "embedding",
      includeScore: true,
    };
    const result = await vectorSearch(query, dbConfig, n);
    return JSON.stringify(result);
  },
  {
    name: "retrieve_work_orders",
    description:
      "Retrieve related work orders for the alert via vector search.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["retrieve_work_orders"],
        },
        query: {
          type: "string",
          description: "The query to process",
        },
        n: {
          type: "number",
          description: "Number of results to return (optional, default )",
          default: 3,
        },
      },
      required: ["name", "query"],
    },
  }
);

export const retrieveInterviews = tool(
  async ({ query, n = 3 }) => {
    const dbConfig = {
      collection: "interviews",
      indexName: "default",
      textKey: ["text"],
      embeddingKey: "embedding",
      includeScore: true,
    };
    const result = await vectorSearch(query, dbConfig, n);
    return JSON.stringify(result);
  },
  {
    name: "retrieve_interviews",
    description: "Retrieve interviews related to the alert via vector search.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["retrieve_interviews"],
        },
        query: {
          type: "string",
          description: "The query to process",
        },
        n: {
          type: "number",
          description: "Number of results to return (optional, default 3)",
          default: 3,
        },
      },
      required: ["name", "query"],
    },
  }
);

export const generateIncidentReport = tool(
  async (params) => {
    // Remove the name field
    const { name, ...rest } = params;
    // Add timestamp
    const doc = { ...rest, ts: new Date() };

    // Insert into MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.DATABASE_NAME);
    const result = await db.collection("incident_reports").insertOne(doc);
    return JSON.stringify(result);
  },
  {
    name: "generate_incident_report",
    description: "Generate an incident report for the alert.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["generate_incident_report"],
        },
        error_code: {
          type: "string",
          description: "Error code for the incident",
        },
        error_name: {
          type: "string",
          description: "Error name for the incident",
        },
        root_cause: {
          type: "string",
          description: "Root cause of the incident inferred from the context",
        },
        repair_instructions: {
          type: "array",
          description: "Repair instructions (3 to 6 steps)",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              description: { type: "string" },
            },
            required: ["step", "description"],
          },
        },
        machine_id: {
          type: "string",
          description: "ID of the machine involved in the incident",
        },
      },
      required: [
        "name",
        "error_code",
        "error_name",
        "root_cause",
        "repair_instructions",
        "machine_id",
      ],
    },
  }
);

export function getTools() {
  return [
    retrieveManual,
    retrieveWorkOrders,
    retrieveInterviews,
    generateIncidentReport,
  ];
}
