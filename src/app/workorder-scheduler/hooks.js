import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchProductionCalendarEvents,
  resetProductionCalendar,
} from "@/lib/api/calendar";
import { fetchWorkOrders } from "@/lib/api/workOrders";
import { sendChatMessage } from "@/lib/api/agent";

const productionCalendarSample = {
  task_id: "PROD-1001",
  task_type: "production",
  initial_start_date: "2025-06-25T00:00:00.000Z",
  planned_start_date: "2025-06-25T00:00:00.000Z",
  deadline_date: "2025-07-01T00:00:00.000Z",
  duration: 3,
  delay_factor: 0,
  priority: "high",
  pieces_to_produce: 1200,
};

export function useWorkorderSchedulerPage() {
  // Workorders state
  const [workorders, setWorkorders] = useState([]);
  const [selectedWorkorderId, setSelectedWorkorderId] = useState(null);
  const [workordersLoading, setWorkordersLoading] = useState(true);
  const [workordersError, setWorkordersError] = useState(null);

  // Only allow selection for workorders with status "new"
  const handleWorkorderSelect = useCallback(
    (id) => {
      const selected = workorders.find((w) => w._id === id);
      if (selected && selected.status === "new") {
        setSelectedWorkorderId(id);
      }
    },
    [workorders]
  );

  useEffect(() => {
    setWorkordersLoading(true);
    fetchWorkOrders()
      .then((data) => {
        setWorkorders(data);
        // Default select first "new" workorder
        const firstNew = data.find((w) => w.status === "new");
        setSelectedWorkorderId(firstNew ? firstNew._id : null);
      })
      .catch((err) => setWorkordersError(err))
      .finally(() => setWorkordersLoading(false));
  }, []);

  // Calendar events
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(null);

  const fetchCalendar = useCallback(() => {
    setCalendarLoading(true);
    fetchProductionCalendarEvents()
      .then((evs) => setCalendarEvents(evs))
      .catch((err) => setCalendarError(err))
      .finally(() => setCalendarLoading(false));
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Agent status and logs
  const [agentStatus, setAgentStatus] = useState("idle");
  const [showModal, setShowModal] = useState(false);
  const [agentLogs, setAgentLogs] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [agentError, setAgentError] = useState(null);
  const processingRef = useRef(false);

  // Continue workflow: schedule selected workorder
  const canContinue = selectedWorkorderId && !processingRef.current;
  const handleContinueWorkflow = useCallback(async () => {
    if (!selectedWorkorderId || processingRef.current) return;
    const selectedWorkorder = workorders.find(
      (w) => w._id === selectedWorkorderId
    );
    if (!selectedWorkorder) return;
    setAgentStatus("active");
    setAgentLogs([]);
    setAgentError(null);
    processingRef.current = true;
    setThreadId(null);
    // Initial user message
    setAgentLogs([
      {
        type: "user",
        values: {
          content:
            "Schedule this workorder in the production calendar:\n" +
            JSON.stringify(selectedWorkorder, null, 2),
        },
      },
    ]);
    try {
      await sendChatMessage({
        message:
          "Schedule this workorder in the production calendar:\n" +
          JSON.stringify(selectedWorkorder, null, 2),
        agentId: "planning",
        threadId: null,
        setLogs: setAgentLogs,
        setThreadId,
        setError: setAgentError,
      });
    } finally {
      setAgentStatus("done");
      processingRef.current = false;
      // Refresh calendar events after agent finishes
      fetchCalendar();
    }
  }, [selectedWorkorderId, workorders, fetchCalendar]);

  // Reset calendar handler
  const handleResetCalendar = useCallback(async () => {
    await resetProductionCalendar();
    fetchCalendar();
  }, [fetchCalendar]);

  const modalContent = (
    <>
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
    </>
  );

  return {
    workorders,
    selectedWorkorderId,
    setSelectedWorkorderId: handleWorkorderSelect,
    workordersLoading,
    workordersError,
    productionCalendarSample,
    calendarEvents,
    calendarLoading,
    calendarError,
    agentStatus,
    showModal,
    setShowModal,
    modalContent,
    agentLogs,
    threadId,
    canContinue,
    handleContinueWorkflow,
    agentError,
    handleResetCalendar,
  };
}
