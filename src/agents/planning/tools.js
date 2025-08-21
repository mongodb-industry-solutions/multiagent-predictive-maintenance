import { tool } from "@langchain/core/tools";
import getMongoClientPromise from "@/integrations/mongodb/client";
import {
  inventoryAvailabilityCheck,
  assignStaffToWorkorder,
  findProductionSlot,
  scheduleMaintenanceWorkOrder,
} from "@/lib/simulation/planning";

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
              "Bearings",
              "Shafts",
              "Lubricant",
              "Seals",
              "Bolts",
              "Gaskets",
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
    if (typeof duration !== "number" || duration < 1) {
      return JSON.stringify({ error: "Invalid duration." });
    }
    // Build the maintenance task object
    const today = new Date();
    const task_id = `MAINT-${today.getFullYear()}${(today.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${today
      .getDate()
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
    // Get all tasks with planned_end_date after today, for the next 2 months
    today.setUTCHours(0, 0, 0, 0);
    const twoMonthsLater = new Date(today);
    twoMonthsLater.setUTCMonth(twoMonthsLater.getUTCMonth() + 2);
    const tasks = await collection
      .find({
        planned_end_date: { $gte: today, $lte: twoMonthsLater },
      })
      .sort({ planned_start_date: 1 })
      .toArray();
    // Use helper to schedule and update tasks
    const result = await scheduleMaintenanceWorkOrder(
      tasks,
      db,
      maintenance_task,
      duration,
      delay_factor
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
    checkInventoryAvailability,
    checkStaffAvailability,
    scheduleWorkOrder,
  ];
}
