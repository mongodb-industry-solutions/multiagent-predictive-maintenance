import { useState, useEffect, useRef, useCallback } from "react";

// Template for generating new incident reports
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

export function useIncidentResponse({ alertTrigger } = {}) {
  const [agentActive, setAgentActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [incidentReports, setIncidentReports] = useState([]); // Start empty
  const [rootCause, setRootCause] = useState("");
  const [repairInstructions, setRepairInstructions] = useState("");
  const processingRef = useRef(false);
  const lastAlertRef = useRef(alertTrigger);

  // Generic trigger handler for AgentStatus (for future extensibility)
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

  // React to alertTrigger prop from parent
  useEffect(() => {
    if (typeof alertTrigger === "number") {
      if (alertTrigger !== lastAlertRef.current && !processingRef.current) {
        lastAlertRef.current = alertTrigger;
        handleAgentStatusTrigger(() => {
          // Generate a new incident report and update root cause/repair instructions
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

  return {
    agentActive,
    showModal,
    setShowModal,
    rootCause,
    repairInstructions,
    incidentReports,
    handleAgentStatusTrigger,
  };
}
