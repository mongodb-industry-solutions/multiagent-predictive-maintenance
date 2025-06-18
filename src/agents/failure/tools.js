import { tool } from "@langchain/core/tools";

export const retrieveManual = tool(async ({}) => ({}), {
  name: "retrieve_manual",
  description: "Retrieve the relevant manual for the alert.",
  schema: { type: "object", properties: {}, required: [] },
});

export const retrieveWorkOrders = tool(async ({}) => [], {
  name: "retrieve_work_orders",
  description: "Retrieve related work orders for the alert.",
  schema: { type: "object", properties: {}, required: [] },
});

export const retrieveInterviews = tool(async ({}) => [], {
  name: "retrieve_interviews",
  description: "Retrieve interviews related to the alert.",
  schema: { type: "object", properties: {}, required: [] },
});

export const generateIncidentReport = tool(async ({}) => ({}), {
  name: "generate_incident_report",
  description: "Generate an incident report for the alert.",
  schema: { type: "object", properties: {}, required: [] },
});

export function getTools() {
  return [
    retrieveManual,
    retrieveWorkOrders,
    retrieveInterviews,
    generateIncidentReport,
  ];
}
