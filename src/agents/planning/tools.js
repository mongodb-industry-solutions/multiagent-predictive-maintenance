import { tool } from "@langchain/core/tools";
import getMongoClientPromise from "@/integrations/mongodb/client";
import {
  inventoryAvailabilityCheck,
  assignStaffToWorkorder,
  scheduleMaintenanceWorkOrder,
} from "@/lib/simulation/planning";
import { queryDownstreamImpactGraph } from "@/lib/knowledgeGraph/agentQueries";

export const queryKnowledgeGraph = tool(
  async ({ machine_id = "M1" }) => {
    const result = await queryDownstreamImpactGraph({
      machineId: machine_id,
    });
    return JSON.stringify(result);
  },
  {
    name: "query_knowledge_graph",
    description:
      "Traverse the factory knowledge graph via MongoDB $graphLookup to resolve machine topology, check station redundancy, and assess downstream production blast radius (starved stations and blocked EV products) to inform scheduling priority (delay_factor).",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["query_knowledge_graph"],
        },
        machine_id: {
          type: "string",
          description: "Machine ID from the work order (e.g. M1 or LTW-04)",
          default: "M1",
        },
      },
      required: ["name", "machine_id"],
    },
  }
);

export const checkInventoryAvailability = tool(
  async ({ items }) => {
    if (!Array.isArray(items) || items.length === 0) {
      return JSON.stringify({ error: "No items provided." });
    }
    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    if (!dbName)
      throw new Error(
        "DATABASE_NAME environment variable is required but not set"
      );
    const db = client.db(dbName);
    const collection = db.collection("inventory");
    // Find all inventory docs for the requested items
    const docs = await collection.find({ name: { $in: items } }).toArray();
    // Use helper to check availability and lead times
    const result = inventoryAvailabilityCheck(items, docs);
    return JSON.stringify(result);
  },
  {
    name: "check_inventory_availability",
    description: "Check inventory availability for a list of items.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["check_inventory_availability"],
        },
        items: {
          type: "array",
          description: "List of inventory item names to check",
          items: {
            type: "string",
            enum: [
              "Protective Optics Window",
              "Focusing Lens Assembly",
              "Coolant Filter & Tubing",
              "Linear Stage Bearings",
              "Clamping Fixture Bolts",
              "Optical Housing Seals",
            ],
          },
          minItems: 1,
        },
      },
      required: ["name", "items"],
    },
  }
);

export const checkStaffAvailability = tool(
  async ({ required_skills }) => {
    if (!Array.isArray(required_skills) || required_skills.length === 0) {
      return JSON.stringify({ error: "No required skills provided." });
    }
    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    if (!dbName)
      throw new Error(
        "DATABASE_NAME environment variable is required but not set"
      );
    const db = client.db(dbName);
    const collection = db.collection("maintenance_staff");
    // Find all staff with at least one of the required skills
    const staffDocs = await collection
      .find({ skills: { $in: required_skills } })
      .toArray();
    // Use helper to assign staff for any day in the week
    const result = assignStaffToWorkorder(staffDocs, required_skills);
    return JSON.stringify(result);
  },
  {
    name: "check_staff_availability",
    description:
      "Find staff with required skills and available shifts for any day in the week.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["check_staff_availability"],
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
        },
      },
      required: ["name", "required_skills"],
    },
  }
);

export const scheduleWorkOrder = tool(
  async ({ duration, delay_factor }) => {
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 1) {
      return JSON.stringify({ error: "Invalid duration." });
    }
    const normalizedDuration = Math.ceil(duration);
    const normalizedDelayFactor =
      typeof delay_factor === "number" && Number.isFinite(delay_factor)
        ? delay_factor
        : 0;

    // Normalize "today" to UTC midnight so all calendar comparisons use a single boundary
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const task_id = `MAINT-${today.getUTCFullYear()}${(today.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}${today
      .getUTCDate()
      .toString()
      .padStart(2, "0")}-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;
    const maintenance_task = {
      task_id,
    };
    const client = await getMongoClientPromise();
    const dbName = process.env.DATABASE_NAME;
    if (!dbName)
      throw new Error(
        "DATABASE_NAME environment variable is required but not set"
      );
    const db = client.db(dbName);
    const collection = db.collection("production_calendar");
    // Fetch only active and future tasks (strictly excluding past tasks whose exclusive end <= today)
    const tasks = await collection
      .find({
        planned_end_date: { $gt: today },
      })
      .sort({ planned_start_date: 1 })
      .toArray();
    // Schedule maintenance work order and shift only colliding future tasks
    const result = await scheduleMaintenanceWorkOrder(
      tasks,
      db,
      maintenance_task,
      normalizedDuration,
      normalizedDelayFactor,
      today
    );
    return JSON.stringify(result);
  },
  {
    name: "schedule_work_order",
    description:
      "Schedule a new maintenance workorder, update affected tasks, and insert the new task into the production calendar.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["schedule_work_order"],
        },
        duration: {
          type: "number",
          description: "Duration in days of the new workorder",
          minimum: 1,
        },
        delay_factor: {
          type: "number",
          description:
            "Delay factor of the new workorder (0 = highest priority)",
        },
      },
      required: ["name", "duration", "delay_factor"],
    },
  }
);

export function getTools() {
  return [
    queryKnowledgeGraph,
    checkInventoryAvailability,
    checkStaffAvailability,
    scheduleWorkOrder,
  ];
}
