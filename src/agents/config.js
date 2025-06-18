// Agent registry for multi-agent support
import { createAgentGraph as createTestAgentGraph } from "./test/graph.js";
import { createAgentGraph as createSupervisorAgentGraph } from "./supervisor/graph.js";
import { createAgentGraph as createFailureAgentGraph } from "./failure/graph.js";
import { createAgentGraph as createWorkorderAgentGraph } from "./workorder/graph.js";
import { createAgentGraph as createPlanningAgentGraph } from "./planning/graph.js";

export const AGENTS = [
  {
    id: "test",
    name: "Test Agent",
    createGraph: createTestAgentGraph,
    description: "A simple predictive maintenance test agent.",
  },
  {
    id: "supervisor",
    name: "Supervisor Agent",
    createGraph: createSupervisorAgentGraph,
    description:
      "Multi-agent workflow: Supervisor coordinates Failure, Workorder, and Planning agents.",
  },
  {
    id: "failure",
    name: "Failure Agent",
    createGraph: createFailureAgentGraph,
    description:
      "Handles alerts, retrieves context, and generates incident reports.",
  },
  {
    id: "workorder",
    name: "Workorder Agent",
    createGraph: createWorkorderAgentGraph,
    description: "Receives incident reports and generates workorders.",
  },
  {
    id: "planning",
    name: "Planning Agent",
    createGraph: createPlanningAgentGraph,
    description: "Schedules workorder execution based on context.",
  },
];

/**
 * Get agent config by id
 * @param {string} id
 * @returns {object|null}
 */
export function getAgentById(id) {
  return AGENTS.find((agent) => agent.id === id) || null;
}

/**
 * Get all agent options for UI
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getAgentOptions() {
  return AGENTS.map(({ id, name, description }) => ({ id, name, description }));
}
