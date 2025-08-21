import { tool } from "@langchain/core/tools";
import { vectorSearch } from "@/integrations/mongodb/vectorSearch";
import getMongoClientPromise from "@/integrations/mongodb/client";
import { generateEmbedding } from "@/integrations/bedrock/embeddings";

export const retrieveWorkOrders = tool(
  async ({ query, n = 3 }) => {
    const dbConfig = {
      collection: "workorders",
      indexName: "default",
      textKey: ["instructions", "title", "observations", "root_cause"],
      embeddingKey: "embedding",
      includeScore: false,
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

export const generateWorkOrder = tool(
  async (params) => {
    // Remove the name field
    const { name, ...rest } = params;
    // Add timestamp
    const created_at = new Date();
    // Proposed start time: current date + 2 days
    const proposed_start_time = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    // Default status
    const status = "new";
    // Prepare embedding text
    const embeddingText = [
      rest.title || "",
      rest.instructions || "",
      rest.root_cause || "",
      rest.observations || "",
    ].join("\n");
    // Generate embedding
    const embedding = await generateEmbedding(embeddingText);
    // Build work order doc
    const doc = {
      ...rest,
      created_at,
      proposed_start_time,
      status,
      embedding,
    };
    // Insert into MongoDB
    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    if (!dbName)
      throw new Error(
        "DATABASE_NAME environment variable is required but not set"
      );
    const db = client.db(dbName);
    const result = await db.collection("workorders").insertOne(doc);
    return JSON.stringify(result);
  },
  {
    name: "generate_work_order",
    description: "Generate a work order for the incident.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["generate_work_order"],
        },
        machine_id: {
          type: "string",
          description: "ID of the machine involved in the work order",
        },
        title: {
          type: "string",
          description: "Title of the work order",
        },
        estimated_duration_days: {
          type: "number",
          description: "Estimated duration in days (1-5)",
          minimum: 1,
          maximum: 3,
        },
        required_skills: {
          type: "array",
          description: "List of required skills",
          items: {
            type: "string",
            enum: [
              "Mechanical Maintenance",
              "Electrical Maintenance",
              "Safety Compliance",
              "Diagnostics",
              "Welding",
              "Calibration",
            ],
          },
          minItems: 1,
          maxItems: 2,
        },
        required_materials: {
          type: "array",
          description: "List of required materials",
          items: {
            type: "string",
            enum: [
              "Bearings",
              "Shafts",
              "Lubricant",
              "Seals",
              "Bolts",
              "Gaskets",
            ],
          },
          minItems: 0,
        },
        observations: {
          type: "string",
          description:
            "Observations relevant to the work order from past work orders",
        },
      },
      required: [
        "name",
        "machine_id",
        "title",
        "estimated_duration_days",
        "required_skills",
        "required_materials",
        "observations",
      ],
    },
  }
);

export function getTools() {
  return [retrieveWorkOrders, generateWorkOrder];
}
