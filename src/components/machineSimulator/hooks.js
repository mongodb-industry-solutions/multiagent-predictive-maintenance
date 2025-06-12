"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  startMachineSimulation,
  stopMachineSimulation,
  getInitialMachineData,
  updateMachineTelemetry,
} from "../../lib/simulation/machineTelemetry";
import { checkForAlert } from "../../lib/simulation/failureDetection";

export function useMachineSimulator({ onAlert } = {}) {
  // Machine running state
  const [isRunning, setIsRunning] = useState(false);
  // Machine telemetry data (object)
  const [machineData, setMachineData] = useState(getInitialMachineData());
  // Sliders (these are the "target" values for the simulation)
  const [temperature, setTemperature] = useState(machineData.temperature.value);
  const [vibration, setVibration] = useState(machineData.vibration.value);
  // Status: 'off', 'running', 'alert'
  const [status, setStatus] = useState("off");
  // Alerts list
  const [alerts, setAlerts] = useState([]);
  // Expanded alert id
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  // Simulation interval ref
  const intervalRef = useRef(null);

  // Track if we are currently in alert state (to allow only one alert per excursion)
  const alertActiveRef = useRef(false);

  // Start simulation
  const onStart = useCallback(() => {
    setIsRunning(true);
    setStatus("running");
    alertActiveRef.current = false;
    intervalRef.current = setInterval(() => {
      setMachineData((prev) => {
        // Use latest slider values from refs
        const updated = updateMachineTelemetry(
          prev,
          temperatureRef.current,
          vibrationRef.current
        );
        // Only check for alert if not already in alert status
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
            if (typeof onAlert === "function") {
              onAlert(newAlert); // Pass the alert object for future extensibility
            }
          }
        } else if (
          updated.temperature.value <= 90 &&
          updated.vibration.value <= 1.2 &&
          alertActiveRef.current
        ) {
          // Reset alert state when values go back to normal
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
  }, [alerts, status, onAlert]);

  // Refs to always have latest slider values in simulation
  const temperatureRef = useRef(temperature);
  const vibrationRef = useRef(vibration);

  // Keep refs in sync with state
  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);
  useEffect(() => {
    vibrationRef.current = vibration;
  }, [vibration]);

  // Stop simulation
  const onStop = useCallback(() => {
    setIsRunning(false);
    setStatus("off");
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  // Sliders (these set the "target" value for the simulation)
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

  // Alert expand/collapse
  const onAlertExpand = useCallback((id) => {
    setExpandedAlertId((prev) => (prev === id ? null : id));
  }, []);

  return {
    isRunning,
    onStart,
    onStop,
    machineData,
    status,
    temperature,
    vibration,
    onTemperatureChange,
    onVibrationChange,
    alerts,
    onAlertExpand,
    expandedAlertId,
  };
}
