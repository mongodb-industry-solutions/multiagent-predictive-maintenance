import { useState, useRef, useCallback, useEffect } from "react";
import {
  getInitialMachineData,
  updateMachineTelemetry,
} from "@/lib/simulation/machineTelemetry";
import { checkForAlert } from "@/lib/simulation/failureDetection";
import { fetchIncidentReports } from "@/lib/api/incidentReports";
import { callFailureAgent } from "@/lib/api/agent";
import { fetchAlerts, persistAlert } from "@/lib/api/alerts";
import { persistTelemetry } from "@/lib/api/telemetry";

export function useFailureDetectionPage() {
  // Machine simulation logic
  const [alertTrigger, setAlertTrigger] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [machineData, setMachineData] = useState(getInitialMachineData());
  const [temperature, setTemperature] = useState(machineData.temperature.value);
  const [vibration, setVibration] = useState(machineData.vibration.value);
  const [status, setStatus] = useState("off");
  const [alerts, setAlerts] = useState([]);
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const intervalRef = useRef(null);
  const alertActiveRef = useRef(false);
  const temperatureRef = useRef(temperature);
  const vibrationRef = useRef(vibration);
  const lastGeneratedAlertRef = useRef(null);
  const [showTelemetry, setShowTelemetry] = useState(false);

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);
  useEffect(() => {
    vibrationRef.current = vibration;
  }, [vibration]);

  // Alerts
  const fetchAlertsCallback = useCallback(async () => {
    const data = await fetchAlerts();
    setAlerts(data);
  }, []);

  useEffect(() => {
    fetchAlertsCallback();
  }, [fetchAlertsCallback]);

  const persistAlertCallback = useCallback(
    async (alert) => {
      await persistAlert(alert);
      fetchAlertsCallback();
    },
    [fetchAlertsCallback]
  );

  // Telemetry
  const persistTelemetryCallback = useCallback(async (telemetry) => {
    await persistTelemetry(telemetry);
  }, []);

  // Simulation
  const handleStart = useCallback(() => {
    setIsRunning(true);
    setStatus("running");
    alertActiveRef.current = false;
    intervalRef.current = setInterval(() => {
      setMachineData((prev) => {
        const updated = updateMachineTelemetry(
          prev,
          temperatureRef.current,
          vibrationRef.current
        );
        // Persist telemetry to DB
        persistTelemetryCallback(updated);
        let newStatus = "running";
        let newAlert = null;
        if (
          (updated.temperature.value > 90 || updated.vibration.value > 1.2) &&
          !alertActiveRef.current
        ) {
          newAlert = checkForAlert(updated, [], status);
          if (newAlert) {
            lastGeneratedAlertRef.current = newAlert;
            persistAlertCallback(newAlert);
            newStatus = "alert";
            alertActiveRef.current = true;
            setAlertTrigger((prev) => prev + 1);
          }
        } else if (
          updated.temperature.value <= 90 &&
          updated.vibration.value <= 1.2 &&
          alertActiveRef.current
        ) {
          newStatus = "running";
          alertActiveRef.current = false;
        }
        setStatus(
          updated.temperature.value > 90 || updated.vibration.value > 1.2
            ? "alert"
            : "running"
        );
        return updated;
      });
    }, 1000);
  }, [status, persistTelemetryCallback, persistAlertCallback]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setStatus("off");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const onTemperatureChange = useCallback((v) => {
    setTemperature(v);
    setMachineData((prev) => ({
      ...prev,
      temperature: { ...prev.temperature, value: v },
    }));
  }, []);
  const onVibrationChange = useCallback((v) => {
    setVibration(v);
    setMachineData((prev) => ({
      ...prev,
      vibration: { ...prev.vibration, value: v },
    }));
  }, []);

  // Incident Reports
  const [agentActive, setAgentActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [incidentReports, setIncidentReports] = useState([]);
  const [rootCause, setRootCause] = useState("");
  const [repairInstructions, setRepairInstructions] = useState("");
  const processingRef = useRef(false);
  const lastAlertRef = useRef(alertTrigger);
  const [agentLogs, setAgentLogs] = useState([]);

  function formatRepairInstructions(instructions) {
    if (!Array.isArray(instructions)) return "";
    return instructions
      .map((step) => `- Step ${step.step}: ${step.description}`)
      .join("\n");
  }

  const fetchIncidentReportsCallback = useCallback(async () => {
    const data = await fetchIncidentReports();
    setIncidentReports(data);
    // Do not set root cause or repair instructions on page load
  }, []);

  useEffect(() => {
    fetchIncidentReportsCallback();
    // Always clear root cause and repair instructions on load
    setRootCause("");
    setRepairInstructions("");
  }, [fetchIncidentReportsCallback]);

  useEffect(() => {
    if (typeof alertTrigger === "number") {
      if (alertTrigger !== lastAlertRef.current && !processingRef.current) {
        lastAlertRef.current = alertTrigger;
        setAgentActive(true);
        setAgentLogs([]); // Clear logs for new agent run
        const callAgentAsync = async () => {
          try {
            const alertToSend = lastGeneratedAlertRef.current;
            // Push initial user message with label
            setAgentLogs((prev) => [
              ...prev,
              {
                type: "user",
                values: {
                  content:
                    "New alert received:\n" +
                    JSON.stringify(alertToSend, null, 2),
                },
              },
            ]);
            await callFailureAgent(alertToSend, {
              onEvent: (evt) => {
                if (
                  evt.type === "update" &&
                  (evt.name === "tool_start" || evt.name === "tool_end")
                ) {
                  setAgentLogs((prev) => [...prev, evt]);
                } else if (evt.type === "final") {
                  setAgentLogs((prev) => [...prev, evt]);
                } else if (evt.type === "error") {
                  setAgentLogs((prev) => [...prev, evt]);
                }
              },
            });
          } finally {
            setAgentActive(false);
            processingRef.current = false;
            // Fetch new incident reports and set root cause/repair instructions from the latest
            const data = await fetchIncidentReports();
            setIncidentReports(data);
            if (data && data.length > 0) {
              setRootCause(data[0].root_cause || "");
              setRepairInstructions(
                formatRepairInstructions(data[0].repair_instructions)
              );
            } else {
              setRootCause("");
              setRepairInstructions("");
            }
          }
        };
        processingRef.current = true;
        callAgentAsync();
      } else {
        lastAlertRef.current = alertTrigger;
      }
    }
  }, [alertTrigger]);

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

  return {
    sim: {
      isRunning,
      onTemperatureChange,
      onVibrationChange,
      machineData,
      status,
      temperature,
      vibration,
      alerts,
      expandedAlertId,
    },
    agentActive,
    showModal,
    setShowModal,
    rootCause,
    repairInstructions,
    incidentReports,
    modalContent,
    handleStart,
    handleStop,
    agentLogs, // <-- pass logs to page
    showTelemetry,
    setShowTelemetry,
  };
}
