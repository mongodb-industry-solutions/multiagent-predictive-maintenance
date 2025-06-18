import { tool } from "@langchain/core/tools";

export const retrieveWorkOrders = tool(async ({}) => [], {
  name: "retrieve_work_orders",
  description: "Retrieve related work orders for the incident.",
  schema: { type: "object", properties: {}, required: [] },
});

export const generateWorkOrder = tool(async ({}) => ({}), {
  name: "generate_work_order",
  description: "Generate a work order for the incident.",
  schema: { type: "object", properties: {}, required: [] },
});

export function getTools() {
  return [retrieveWorkOrders, generateWorkOrder];
}
