import { useState, useRef, useCallback, useEffect } from "react";
import {
  getInitialMachineData,
  updateMachineTelemetry,
} from "@/lib/simulation/machineTelemetry";
import { checkForAlert } from "@/lib/simulation/failureDetection";

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

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);
  useEffect(() => {
    vibrationRef.current = vibration;
  }, [vibration]);

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
        let newStatus = "running";
        let newAlert = null;
        if (
          (updated.temperature.value > 90 || updated.vibration.value > 1.2) &&
          !alertActiveRef.current
        ) {
          newAlert = checkForAlert(updated, alerts, status);
          if (newAlert) {
            newStatus = "alert";
            alertActiveRef.current = true;
            setAlerts((prevAlerts) => [...prevAlerts, newAlert]);
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
  }, [alerts, status]);

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

  // Incident response logic
  function generateIncident({ type = "temperature", value, ts }) {
    if (type === "temperature") {
      return {
        Id: Date.now(),
        Err_code: "E12",
        Err_name: "High temperature",
        "Root Cause": "Tool Wear",
        "Repair Instructions": {
          step1: "Replace worn tool.",
          step2: "Check coolant.",
        },
        Machine_id: "M1",
        ts,
      };
    } else {
      return {
        Id: Date.now(),
        Err_code: "E07",
        Err_name: "Low Pressure",
        "Root Cause": "Seal Leak",
        "Repair Instructions": {
          step1: "Inspect seals.",
          step2: "Replace faulty seal.",
        },
        Machine_id: "M2",
        ts,
      };
    }
  }

  const [agentActive, setAgentActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [incidentReports, setIncidentReports] = useState([]);
  const [rootCause, setRootCause] = useState("");
  const [repairInstructions, setRepairInstructions] = useState("");
  const processingRef = useRef(false);
  const lastAlertRef = useRef(alertTrigger);

  const handleAgentStatusTrigger = useCallback((afterAction) => {
    if (!processingRef.current) {
      processingRef.current = true;
      setAgentActive(true);
      setTimeout(() => {
        setAgentActive(false);
        processingRef.current = false;
        if (typeof afterAction === "function") {
          afterAction();
        }
      }, 5000);
    }
  }, []);

  useEffect(() => {
    if (typeof alertTrigger === "number") {
      if (alertTrigger !== lastAlertRef.current && !processingRef.current) {
        lastAlertRef.current = alertTrigger;
        handleAgentStatusTrigger(() => {
          const now = new Date();
          const ts = now.toLocaleString();
          const type =
            incidentReports.length % 2 === 0 ? "temperature" : "pressure";
          const newIncident = generateIncident({ type, ts });
          setIncidentReports((prev) => [...prev, newIncident]);
          setRootCause(newIncident["Root Cause"] || "");
          setRepairInstructions(
            typeof newIncident["Repair Instructions"] === "string"
              ? newIncident["Repair Instructions"]
              : JSON.stringify(newIncident["Repair Instructions"], null, 2)
          );
        });
      } else {
        lastAlertRef.current = alertTrigger;
      }
    }
  }, [alertTrigger, incidentReports, handleAgentStatusTrigger]);

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
  };
}
