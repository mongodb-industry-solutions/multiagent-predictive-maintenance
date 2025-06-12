import { useState } from "react";

// Helper to generate a workorder JSON from incident data
function generateWorkOrder(incident) {
  if (!incident) return null;
  const now = new Date();
  const proposedStart = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2 hours
  return {
    machine_id: incident.Machine_id,
    title: `Maintenance for ${incident.Machine_id}`,
    instructions:
      incident["Repair Instructions"] || "Refer to OEM manual section 4.2.",
    estimated_duration: "2 hours",
    proposed_start_time: proposedStart.toISOString(),
    required_skills: ["General Maintenance"],
    recommended_action:
      incident["Repair Instructions"] || "Check and repair as needed.",
    justification: incident["Root Cause"] || "Routine maintenance required.",
    status: "draft",
    created_at: now.toISOString(),
  };
}

export function useWorkOrderGenerator({ triggerAgent, selectedIncident }) {
  const [agentStatus, setAgentStatus] = useState("idle"); // idle | active | done
  const [form, setForm] = useState({});
  const [workorders, setWorkorders] = useState([]);
  const [expanded, setExpanded] = useState(null);

  // Called when the workflow is triggered
  async function handleAgentTrigger() {
    setAgentStatus("active");
    setForm({});
    await new Promise((res) => setTimeout(res, 5000));
    const workorder = generateWorkOrder(selectedIncident);
    setForm(workorder);
    setWorkorders((prev) => [workorder, ...prev]);
    setAgentStatus("done");
  }

  // For form editing (if needed in future)
  function handleFormChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleExpand(idx) {
    setExpanded(idx === expanded ? null : idx);
  }

  // Expose trigger to parent
  if (triggerAgent) {
    triggerAgent.current = handleAgentTrigger;
  }

  return {
    agentStatus,
    form,
    workorders,
    expanded,
    handleFormChange,
    handleExpand,
    handleAgentTrigger,
  };
}
