import { useState } from "react";

const mockIncidentReports = [
  {
    Id: 1,
    Err_name: "Overheating Motor",
    ts: "2025-06-12T10:00:00Z",
    Err_code: "E101",
    "Root Cause": "Insufficient lubrication",
    "Repair Instructions": "Check oil levels and refill as needed.",
    Machine_id: "M-001",
  },
  {
    Id: 2,
    Err_name: "Sensor Failure",
    ts: "2025-06-11T14:30:00Z",
    Err_code: "E202",
    "Root Cause": "Wiring issue",
    "Repair Instructions": "Inspect and replace faulty wires.",
    Machine_id: "M-002",
  },
];

const inventorySample = {
  _id: "inv123",
  partName: "Bearing",
  quantity: 42,
  location: "Warehouse A",
  supplier: "Acme Parts Co.",
};

const staffSample = {
  _id: "staff456",
  name: "Alex Johnson",
  role: "Maintenance Technician",
  shift: "Day",
  skills: ["Electrical", "Mechanical"],
};

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

export function useWorkOrderGenerationPage() {
  const [selectedIncidentId, setSelectedIncidentId] = useState(
    mockIncidentReports.length > 0 ? mockIncidentReports[0].Id : null
  );
  const [workOrderForm, setWorkOrderForm] = useState({});
  const [workorders, setWorkorders] = useState([]);
  const [agentStatus, setAgentStatus] = useState("idle"); // idle | active | done
  const [showModal, setShowModal] = useState(false);

  const modalContent = (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Agent Info</h3>
      <div className="text-gray-600">(Agent details coming soon...)</div>
      <div className="mt-4 flex justify-end">
        <button
          className="bg-gray-200 px-4 py-2 rounded"
          onClick={() => setShowModal(false)}
        >
          Close
        </button>
      </div>
    </div>
  );

  function handleIncidentSelect(id) {
    setSelectedIncidentId(id);
  }

  function handleContinueWorkflow() {
    if (selectedIncidentId == null) return;
    setAgentStatus("active");
    setWorkOrderForm({});
    setTimeout(() => {
      const selectedIncident = mockIncidentReports.find(
        (ir) => ir.Id === selectedIncidentId
      );
      const workorder = generateWorkOrder(selectedIncident);
      setWorkOrderForm(workorder);
      setWorkorders((prev) => [workorder, ...prev]);
      setAgentStatus("done");
    }, 5000);
  }

  function handleFormChange(field, value) {
    setWorkOrderForm((prev) => ({ ...prev, [field]: value }));
  }

  return {
    selectedIncidentId,
    handleIncidentSelect,
    canContinue: selectedIncidentId !== null,
    handleContinueWorkflow,
    workOrderForm,
    handleFormChange,
    workorders,
    agentStatus,
    showModal,
    setShowModal,
    modalContent,
    mockIncidentReports,
    inventorySample,
    staffSample,
  };
}
