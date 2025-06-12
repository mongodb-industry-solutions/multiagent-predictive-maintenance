// Agent registry for multi-agent support
import { createAgentGraph as createTestAgentGraph } from "./test/graph.js";

export const AGENTS = [
  {
    id: "test",
    name: "Test Agent",
    createGraph: createTestAgentGraph,
    description: "A simple predictive maintenance test agent.",
  },
  // Add more agents here as you implement them
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
