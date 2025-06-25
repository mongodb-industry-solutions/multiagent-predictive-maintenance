import { useEffect, useState, useCallback } from "react";
import { fetchProductionCalendarEvents } from "@/lib/api/calendar";
import { fetchWorkOrders } from "@/lib/api/workOrders";

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

  useEffect(() => {
    setCalendarLoading(true);
    fetchProductionCalendarEvents()
      .then((evs) => setCalendarEvents(evs))
      .catch((err) => setCalendarError(err))
      .finally(() => setCalendarLoading(false));
  }, []);

  // Agent status (placeholder, not connected yet)
  const [agentStatus, setAgentStatus] = useState("idle");
  const [showModal, setShowModal] = useState(false);
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
  };
}
