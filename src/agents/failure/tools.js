import { tool } from "@langchain/core/tools";
import { vectorSearch } from "@/integrations/mongodb/vectorSearch";

export const retrieveManual = tool(
  async ({ query, n = 3 }) => {
    const dbConfig = {
      collection: "manuals",
      indexName: "default",
      textKey: "text",
      embeddingKey: "embedding",
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
      textKey: "instructions",
      embeddingKey: "embedding",
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
      textKey: "text",
      embeddingKey: "embedding",
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

export const generateIncidentReport = tool(async ({}) => ({}), {
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
    },
    required: [],
  },
});

export function getTools() {
  return [
    retrieveManual,
    retrieveWorkOrders,
    retrieveInterviews,
    generateIncidentReport,
  ];
}
