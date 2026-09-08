import { useState, useRef, useCallback, useEffect } from "react";
import {
  getInitialMachineData,
  updateMachineTelemetry,
} from "@/lib/simulation/machineTelemetry";
import { checkForAlert } from "@/lib/simulation/failureDetection";
import {
  buildLeafyMachineData,
  createLeafyPredictiveOrder,
  LEAFY_PREDICTIVE_THRESHOLDS,
  toWorkflowAlert,
} from "@/lib/simulation/leafyFactory";
import {
  createRemoteOrder,
  fetchFactoryAlerts,
  fetchFactoryStatus,
  fetchMachineEvents,
  sendRemoteMetrics,
  setRemoteThresholds,
  stopRemoteOrder,
} from "@/lib/factory/factoryClient";
import { fetchIncidentReports } from "@/lib/api/incidentReports";
import { callFailureAgent } from "@/lib/api/agent";
import { fetchAlerts, persistAlert } from "@/lib/api/alerts";
import { persistTelemetry } from "@/lib/api/telemetry";
import { markAgenticProgress } from "@/lib/agenticProgress";

export function useFailureDetectionPage() {
  // Machine simulation logic
  const [dataSource, setDataSource] = useState("leafy");
  const [leafyAvailable, setLeafyAvailable] = useState(null);
  const [isSourceChecking, setIsSourceChecking] = useState(true);
  const [alertTrigger, setAlertTrigger] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [machineData, setMachineData] = useState(getInitialMachineData());
  const [temperature, setTemperature] = useState(machineData.temperature.value);
  const [vibration, setVibration] = useState(machineData.vibration.value);
  const [status, setStatus] = useState("off");
  const [localAlerts, setLocalAlerts] = useState([]);
  const [factoryAlerts, setFactoryAlerts] = useState([]);
  const [sourceError, setSourceError] = useState("");
  const [expandedAlertId, setExpandedAlertId] = useState(null);
  const intervalRef = useRef(null);
  const alertActiveRef = useRef(false);
  const remoteOrderIdRef = useRef(null);
  const remoteAbortControllerRef = useRef(null);
  const remoteTickInFlightRef = useRef(false);
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

  const checkLeafyAvailability = useCallback(async (signal) => {
    setIsSourceChecking(true);
    try {
      await fetchFactoryStatus({ signal });
      if (signal?.aborted) return false;
      setLeafyAvailable(true);
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;
      setLeafyAvailable(false);
      return false;
    } finally {
      if (!signal?.aborted) setIsSourceChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkLeafyAvailability(controller.signal).then((available) => {
      if (!controller.signal.aborted) {
        setDataSource(available ? "leafy" : "local");
      }
    });
    return () => controller.abort();
  }, [checkLeafyAvailability]);

  // Alerts
  const fetchAlertsCallback = useCallback(async () => {
    const data = await fetchAlerts();
    setLocalAlerts(data);
  }, []);

  useEffect(() => {
    fetchAlertsCallback();
  }, [fetchAlertsCallback]);

  const persistAlertCallback = useCallback(
    async (alert) => {
      await persistAlert(alert);
      await fetchAlertsCallback();
    },
    [fetchAlertsCallback]
  );

  // Telemetry
  const persistTelemetryCallback = useCallback(async (telemetry) => {
    await persistTelemetry(telemetry);
  }, []);

  const triggerAlertWorkflow = useCallback((alert) => {
    lastGeneratedAlertRef.current = alert;
    markAgenticProgress("detection");
    alertActiveRef.current = true;
    setAlertTrigger((current) => current + 1);
  }, []);

  // Local simulation
  const startLocalSimulation = useCallback(() => {
    setIsRunning(true);
    setStatus("running");
    setSourceError("");
    alertActiveRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setMachineData((prev) => {
        const updated = updateMachineTelemetry(
          prev,
          temperatureRef.current,
          vibrationRef.current
        );
        // Persist telemetry to DB
        persistTelemetryCallback(updated);
        let newAlert = null;
        if (
          (updated.temperature.value > 90 || updated.vibration.value > 1.2) &&
          !alertActiveRef.current
        ) {
          newAlert = checkForAlert(updated, [], status);
          if (newAlert) {
            persistAlertCallback(newAlert);
            triggerAlertWorkflow(newAlert);
          }
        } else if (
          updated.temperature.value <= 90 &&
          updated.vibration.value <= 1.2 &&
          alertActiveRef.current
        ) {
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
  }, [
    persistAlertCallback,
    persistTelemetryCallback,
    status,
    triggerAlertWorkflow,
  ]);

  // Leafy Factory simulation
  const runLeafyTick = useCallback(
    async (orderId, signal) => {
      if (document.hidden || signal.aborted) return true;
      if (remoteTickInFlightRef.current) return true;
      remoteTickInFlightRef.current = true;
      try {
        const requestedTemperature = temperatureRef.current;
        const requestedVibration = vibrationRef.current;
        const metrics = await sendRemoteMetrics(
          orderId,
          {
            temperature: requestedTemperature,
            vibration: requestedVibration,
          },
          { signal }
        );
        const [remoteAlerts, events] = await Promise.all([
          fetchFactoryAlerts({ orderId, limit: 20, signal }),
          fetchMachineEvents({
            orderId,
            station: "Laser Tab Welding",
            limit: 20,
            signal,
          }),
        ]);
        const updated = buildLeafyMachineData({
          orderId,
          metrics,
          latestEvent: events[0],
          temperature: requestedTemperature,
          vibration: requestedVibration,
        });
        const nextTemperature = updated.temperature.value;
        const nextVibration = updated.vibration.value;

        setMachineData(updated);
        setFactoryAlerts(
          remoteAlerts.map((alert) => toWorkflowAlert(alert, updated))
        );
        persistTelemetryCallback(updated);

        const generatedMetrics = Array.isArray(metrics.alerts_generated)
          ? metrics.alerts_generated
          : [];
        if (generatedMetrics.length > 0 && !alertActiveRef.current) {
          // Preserve the local simulator's temperature-first behavior when
          // both readings cross their thresholds in the same sample.
          const metric = generatedMetrics.includes("temperature")
            ? "temperature"
            : generatedMetrics[0];
          const factoryAlert =
            remoteAlerts.find((alert) => alert.metric === metric) || {
              order_id: orderId,
              machine: "Laser Tab Welding",
              metric,
              value:
                metric === "temperature" ? nextTemperature : nextVibration,
              threshold:
                metric === "temperature"
                  ? LEAFY_PREDICTIVE_THRESHOLDS.temperature_threshold
                  : LEAFY_PREDICTIVE_THRESHOLDS.vibration_threshold,
              timestamp: new Date().toISOString(),
            };
          const workflowAlert = toWorkflowAlert(factoryAlert, updated);
          persistAlert(workflowAlert);
          triggerAlertWorkflow(workflowAlert);
        }

        const temperatureAlertActive =
          metrics.temperature_alert_active ??
          nextTemperature >
            LEAFY_PREDICTIVE_THRESHOLDS.temperature_threshold;
        const vibrationAlertActive =
          metrics.vibration_alert_active ??
          nextVibration > LEAFY_PREDICTIVE_THRESHOLDS.vibration_threshold;
        const alertActive =
          temperatureAlertActive || vibrationAlertActive;
        if (!alertActive) alertActiveRef.current = false;
        setStatus(alertActive ? "alert" : "running");
        setSourceError("");
        return true;
      } catch (error) {
        if (error.name === "AbortError") return false;
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        if (remoteOrderIdRef.current === orderId) {
          remoteOrderIdRef.current = null;
          remoteAbortControllerRef.current = null;
          stopRemoteOrder(orderId).catch(() => {});
        }
        setLeafyAvailable(false);
        setDataSource("local");
        setIsRunning(false);
        setStatus("off");
        setSourceError(error.message || "Leafy Factory is unavailable");
        return false;
      } finally {
        remoteTickInFlightRef.current = false;
      }
    },
    [persistTelemetryCallback, triggerAlertWorkflow]
  );

  const startLeafySimulation = useCallback(async () => {
    setIsStarting(true);
    setSourceError("");
    setFactoryAlerts([]);
    alertActiveRef.current = false;
    const controller = new AbortController();
    remoteAbortControllerRef.current = controller;
    let order = null;
    try {
      order = await createRemoteOrder(createLeafyPredictiveOrder(), {
        signal: controller.signal,
      });
      remoteOrderIdRef.current = order.order_id;
      await setRemoteThresholds(
        order.order_id,
        LEAFY_PREDICTIVE_THRESHOLDS,
        { signal: controller.signal }
      );
      setIsRunning(true);
      setStatus("running");

      const started = await runLeafyTick(order.order_id, controller.signal);
      if (started) {
        intervalRef.current = setInterval(
          () => runLeafyTick(order.order_id, controller.signal),
          1000
        );
      }
    } catch (error) {
      if (
        order?.order_id &&
        remoteOrderIdRef.current === order.order_id
      ) {
        remoteOrderIdRef.current = null;
        stopRemoteOrder(order.order_id).catch(() => {});
      }
      if (remoteAbortControllerRef.current === controller) {
        remoteAbortControllerRef.current = null;
      }
      setIsRunning(false);
      setStatus("off");
      if (error.name !== "AbortError") {
        setLeafyAvailable(false);
        setDataSource("local");
        setSourceError(error.message || "Leafy Factory is unavailable");
      }
    } finally {
      setIsStarting(false);
    }
  }, [runLeafyTick]);

  const handleStart = useCallback(() => {
    if (isRunning || isStarting || isSourceChecking) return;
    if (dataSource === "leafy") return startLeafySimulation();
    startLocalSimulation();
  }, [
    dataSource,
    isRunning,
    isSourceChecking,
    isStarting,
    startLeafySimulation,
    startLocalSimulation,
  ]);

  const handleStop = useCallback(async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    remoteAbortControllerRef.current?.abort();
    remoteAbortControllerRef.current = null;
    setIsRunning(false);
    setStatus("off");
    alertActiveRef.current = false;

    const remoteOrderId = remoteOrderIdRef.current;
    remoteOrderIdRef.current = null;
    if (dataSource === "leafy" && remoteOrderId) {
      try {
        await stopRemoteOrder(remoteOrderId);
      } catch (error) {
        setSourceError(error.message || "Unable to stop the Leafy Factory order");
      }
    }
  }, [dataSource]);

  const handleSourceChange = useCallback(
    async (nextSource) => {
      if (
        nextSource === dataSource ||
        (nextSource !== "local" && nextSource !== "leafy")
      ) {
        return;
      }
      if (
        nextSource === "leafy" &&
        leafyAvailable !== true &&
        !(await checkLeafyAvailability())
      ) {
        setSourceError("Leafy Factory is unavailable");
        return;
      }
      await handleStop();
      const initial = getInitialMachineData();
      setDataSource(nextSource);
      setMachineData(initial);
      setTemperature(initial.temperature.value);
      setVibration(initial.vibration.value);
      temperatureRef.current = initial.temperature.value;
      vibrationRef.current = initial.vibration.value;
      setFactoryAlerts([]);
      setSourceError("");
    },
    [
      checkLeafyAvailability,
      dataSource,
      handleStop,
      leafyAvailable,
    ]
  );

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      remoteAbortControllerRef.current?.abort();
      remoteAbortControllerRef.current = null;
      const remoteOrderId = remoteOrderIdRef.current;
      remoteOrderIdRef.current = null;
      if (remoteOrderId) stopRemoteOrder(remoteOrderId).catch(() => {});
    },
    []
  );

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
              markAgenticProgress("root-cause");
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
      isStarting,
      dataSource,
      onTemperatureChange,
      onVibrationChange,
      machineData,
      status,
      temperature,
      vibration,
      alerts: dataSource === "leafy" ? factoryAlerts : localAlerts,
      sourceError,
      leafyAvailable,
      isSourceChecking,
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
    handleSourceChange,
    agentLogs, // <-- pass logs to page
    showTelemetry,
    setShowTelemetry,
  };
}
