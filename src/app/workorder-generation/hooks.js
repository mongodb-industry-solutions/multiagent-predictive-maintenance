import { useState, useEffect, useCallback, useRef } from "react";
import { fetchIncidentReports } from "@/lib/api/incidentReports";
import { fetchWorkOrders } from "@/lib/api/workOrders";
import { callWorkOrderAgent } from "@/lib/api/agent";

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

export function useWorkOrderGenerationPage() {
  const [incidentReports, setIncidentReports] = useState([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [workOrderForm, setWorkOrderForm] = useState({});
  const [workorders, setWorkorders] = useState([]);
  const [agentStatus, setAgentStatus] = useState("idle"); // idle | active | done
  const [showModal, setShowModal] = useState(false);
  const [emptyIncidentText, setEmptyIncidentText] = useState("");
  const [agentLogs, setAgentLogs] = useState([]);
  const processingRef = useRef(false);

  // Fetch incident reports from API
  const fetchReports = useCallback(async () => {
    const data = await fetchIncidentReports();
    setIncidentReports(data);
    if (data && data.length > 0) {
      setSelectedIncidentId(data[0]._id || data[0].Id);
      setEmptyIncidentText("");
    } else {
      setSelectedIncidentId(null);
      setEmptyIncidentText(
        "No incident reports found. You can generate new incidents by running the simulation in the Failure Prediction tab!"
      );
    }
  }, []);

  // Fetch workorders from API
  const fetchWorkorders = useCallback(async () => {
    const data = await fetchWorkOrders();
    setWorkorders(data);
    if (data && data.length > 0) {
      setWorkOrderForm(data[0]);
    } else {
      setWorkOrderForm({});
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchWorkorders();
  }, [fetchReports, fetchWorkorders]);

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

  async function handleContinueWorkflow() {
    if (selectedIncidentId == null || processingRef.current) return;
    setAgentStatus("active");
    setWorkOrderForm({});
    setAgentLogs([]);
    processingRef.current = true;
    const selectedIncident = incidentReports.find(
      (ir) => ir._id === selectedIncidentId || ir.Id === selectedIncidentId
    );
    try {
      // Stream logs from agent
      await callWorkOrderAgent(selectedIncident, {
        onEvent: (evt) => {
          setAgentLogs((prev) => [...prev, evt]);
        },
      });
    } finally {
      setAgentStatus("done");
      processingRef.current = false;
      // Refresh workorders and fill form with latest
      await fetchWorkorders();
    }
  }

  function handleFormChange(field, value) {
    setWorkOrderForm((prev) => ({ ...prev, [field]: value }));
  }

  return {
    selectedIncidentId,
    handleIncidentSelect,
    canContinue: selectedIncidentId !== null && !processingRef.current,
    handleContinueWorkflow,
    workOrderForm,
    handleFormChange,
    workorders,
    agentStatus,
    showModal,
    setShowModal,
    modalContent,
    incidentReports,
    inventorySample,
    staffSample,
    emptyIncidentText,
    agentLogs,
  };
}
