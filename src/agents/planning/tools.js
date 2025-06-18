import { tool } from "@langchain/core/tools";

export const retrieveInventory = tool(async ({}) => [], {
  name: "retrieve_inventory",
  description: "Retrieve inventory relevant to the workorder.",
  schema: { type: "object", properties: {}, required: [] },
});

export const retrieveStaffShifts = tool(async ({}) => [], {
  name: "retrieve_staff_shifts",
  description: "Retrieve staff shifts relevant to the workorder.",
  schema: { type: "object", properties: {}, required: [] },
});

export const retrieveProductionPlanning = tool(async ({}) => [], {
  name: "retrieve_production_planning",
  description: "Retrieve production planning relevant to the workorder.",
  schema: { type: "object", properties: {}, required: [] },
});

export const scheduleWorkOrder = tool(async ({}) => ({}), {
  name: "schedule_work_order",
  description: "Schedule the workorder execution.",
  schema: { type: "object", properties: {}, required: [] },
});

export function getTools() {
  return [
    retrieveInventory,
    retrieveStaffShifts,
    retrieveProductionPlanning,
    scheduleWorkOrder,
  ];
}
