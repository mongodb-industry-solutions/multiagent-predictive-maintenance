import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getInitialMachineData,
  updateMachineTelemetry,
} from "@/lib/simulation/machineTelemetry";
import { checkForAlert } from "@/lib/simulation/failureDetection";
import {
  buildLeafyMachineData,
  createLeafyPredictiveOrder,
  toWorkflowAlert,
} from "@/lib/simulation/leafyFactory";
import {
  createRemoteOrder,
  fetchFactoryAlerts,
  fetchMachineEvents,
  sendRemoteMetrics,
  setRemoteThresholds,
  stopRemoteOrder,
} from "@/lib/factory/factoryClient";
import {
  DEFAULT_SENSOR_READINGS,
  DEFAULT_THRESHOLDS,
} from "@/lib/factory/constants";
import { useAgenticSource } from "@/components/agenticSourceProvider/AgenticSourceProvider";
import { fetchIncidentReports } from "@/lib/api/incidentReports";
import { callFailureAgent } from "@/lib/api/agent";
import {
  ensureAlertPersisted,
  fetchAlertById,
  fetchAlerts,
} from "@/lib/api/alerts";
import { persistTelemetry } from "@/lib/api/telemetry";
import { markAgenticProgress } from "@/lib/agenticProgress";

export function useFailureDetectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    dataSource,
    leafyAvailable,
    isSourceChecking,
    setIsSourceBusy,
    sourceError,
    setSourceError,
    handleSourceChange,
    reportLeafyUnavailable,
    registerBeforeSourceChange,
  } = useAgenticSource();

  // Machine simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSensorBusy, setIsSensorBusy] = useState(false);
  const [sensorMessage, setSensorMessage] = useState("");
  const [machineData, setMachineData] = useState(() => getInitialMachineData());
  const [temperature, setTemperature] = useState(
    DEFAULT_SENSOR_READINGS.temperature
  );
  const [vibration, setVibration] = useState(DEFAULT_SENSOR_READINGS.vibration);
  const [thresholds, setThresholds] = useState(() => ({
    ...DEFAULT_THRESHOLDS,
  }));
  const [status, setStatus] = useState("off");
  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [activeAlertId, setActiveAlertId] = useState(null);
  const [showTelemetry, setShowTelemetry] = useState(false);

  const intervalRef = useRef(null);
  const statusRef = useRef("off");
  const tempAlertActiveRef = useRef(false);
  const vibAlertActiveRef = useRef(false);
  const remoteOrderIdRef = useRef(null);
  const remoteAbortControllerRef = useRef(null);
  const remoteTickInFlightRef = useRef(false);
  const temperatureRef = useRef(temperature);
  const vibrationRef = useRef(vibration);
  const thresholdsRef = useRef(thresholds);

  // Incident Reports & Failure Agent state
  const [agentActive, setAgentActive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [incidentReports, setIncidentReports] = useState([]);
  const [rootCause, setRootCause] = useState("");
  const [repairInstructions, setRepairInstructions] = useState("");
  const processingRef = useRef(false);
  const [agentLogs, setAgentLogs] = useState([]);
  const [agentThreadId, setAgentThreadId] = useState(null);
  const [contestableIncident, setContestableIncident] = useState(null);
  const handledAutorunKeyRef = useRef(null);

  useEffect(() => {
    temperatureRef.current = temperature;
  }, [temperature]);

  useEffect(() => {
    vibrationRef.current = vibration;
  }, [vibration]);

  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    setIsSourceBusy(isStarting);
    return () => setIsSourceBusy(false);
  }, [isStarting, setIsSourceBusy]);

  function formatRepairInstructions(instructions) {
    if (!Array.isArray(instructions)) return "";
    return instructions
      .map((step) => `- Step ${step.step}: ${step.description}`)
      .join("\n");
  }

  // Shared MongoDB `alerts` list (used for both Leafy Factory and Local simulation)
  const fetchAlertsCallback = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      const list = Array.isArray(data) ? data : [];
      setAlerts(list);
      setSelectedAlertId((current) => {
        if (
          current &&
          list.some(
            (item) =>
              String(item._id) === String(current) ||
              item.uns_alert_key === current
          )
        ) {
          return current;
        }
        return list[0]?._id ? String(list[0]._id) : null;
      });
      return list;
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlertsCallback();
  }, [fetchAlertsCallback]);

  const persistTelemetryCallback = useCallback(async (telemetry) => {
    await persistTelemetry(telemetry);
  }, []);

  const runFailureAgentForAlert = useCallback(async (alertItem) => {
    if (!alertItem || processingRef.current) return;
    processingRef.current = true;
    const alertId = String(alertItem._id || alertItem.uns_alert_key || "");
    if (alertId) {
      setSelectedAlertId(alertId);
      setActiveAlertId(alertId);
    }
    markAgenticProgress("detection");
    setAgentActive(true);
    setAgentLogs([]);

    try {
      setAgentLogs([
        {
          type: "user",
          values: {
            content:
              "New alert received:\n" + JSON.stringify(alertItem, null, 2),
          },
        },
      ]);
      await callFailureAgent(alertItem, {
        onEvent: (evt) => {
          if (evt.threadId) setAgentThreadId(evt.threadId);
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
      setActiveAlertId(null);
      processingRef.current = false;
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
  }, []);

  const persistAndAutoTriggerAlert = useCallback(
    async (rawAlert, context = {}) => {
      const persisted = await ensureAlertPersisted(rawAlert, {
        temperature: temperatureRef.current,
        vibration: vibrationRef.current,
        thresholds: thresholdsRef.current,
        origin: "predictive-maintenance",
        dataSource,
        ...context,
      });
      await fetchAlertsCallback();
      if (persisted?._id) {
        setSelectedAlertId(String(persisted._id));
      }
      setSensorMessage(
        `Generated ${persisted?.alert?.metric || "anomaly"} alert.`
      );
      runFailureAgentForAlert(persisted.alert);
      return persisted;
    },
    [dataSource, fetchAlertsCallback, runFailureAgentForAlert]
  );

  // Local simulation tick
  const evaluateLocalSample = useCallback(
    (sampleData) => {
      const activeThresholds = thresholdsRef.current;
      const tempExceeded =
        sampleData.temperature.value > activeThresholds.temperature_threshold;
      const vibExceeded =
        sampleData.vibration.value > activeThresholds.vibration_threshold;

      if (tempExceeded && !tempAlertActiveRef.current) {
        tempAlertActiveRef.current = true;
        const newAlert = checkForAlert(
          sampleData,
          [],
          "running",
          activeThresholds
        );
        if (newAlert) {
          persistAndAutoTriggerAlert(newAlert, { dataSource: "local" });
        }
      } else if (!tempExceeded) {
        tempAlertActiveRef.current = false;
      }

      if (vibExceeded && !vibAlertActiveRef.current) {
        vibAlertActiveRef.current = true;
        const vibOnlySample = {
          ...sampleData,
          temperature: {
            ...sampleData.temperature,
            value: Math.min(
              sampleData.temperature.value,
              activeThresholds.temperature_threshold
            ),
          },
        };
        const newAlert = checkForAlert(
          vibOnlySample,
          [],
          "running",
          activeThresholds
        );
        if (newAlert) {
          const enrichedAlert = {
            ...newAlert,
            details: {
              ...newAlert.details,
              temperature: sampleData.temperature.value,
            },
          };
          persistAndAutoTriggerAlert(enrichedAlert, { dataSource: "local" });
        }
      } else if (!vibExceeded) {
        vibAlertActiveRef.current = false;
      }

      setStatus(tempExceeded || vibExceeded ? "alert" : "running");
    },
    [persistAndAutoTriggerAlert]
  );

  const startLocalSimulation = useCallback(() => {
    setIsRunning(true);
    setStatus("running");
    setSourceError("");
    setSensorMessage("");
    tempAlertActiveRef.current = false;
    vibAlertActiveRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setMachineData((prev) => {
        const updated = updateMachineTelemetry(
          prev,
          temperatureRef.current,
          vibrationRef.current,
          thresholdsRef.current
        );
        persistTelemetryCallback(updated);
        evaluateLocalSample(updated);
        return updated;
      });
    }, 1000);
  }, [evaluateLocalSample, persistTelemetryCallback, setSourceError]);

  // Leafy Factory simulation tick
  const runLeafyTick = useCallback(
    async (orderId, signal) => {
      if (document.hidden || signal.aborted) return true;
      if (remoteTickInFlightRef.current) return true;
      remoteTickInFlightRef.current = true;
      try {
        const requestedTemperature = temperatureRef.current;
        const requestedVibration = vibrationRef.current;
        const activeThresholds = thresholdsRef.current;
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
        persistTelemetryCallback(updated);

        const generatedMetrics = Array.isArray(metrics.alerts_generated)
          ? metrics.alerts_generated
          : [];
        if (generatedMetrics.length > 0) {
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
                  ? activeThresholds.temperature_threshold
                  : activeThresholds.vibration_threshold,
              timestamp: new Date().toISOString(),
            };
          const workflowAlert = toWorkflowAlert(
            factoryAlert,
            updated,
            activeThresholds,
            {
              origin: "predictive-maintenance",
              dataSource: "leafy",
            }
          );
          await persistAndAutoTriggerAlert(workflowAlert, {
            orderId,
            dataSource: "leafy",
          });
        }

        const temperatureAlertActive =
          metrics.temperature_alert_active ??
          nextTemperature > activeThresholds.temperature_threshold;
        const vibrationAlertActive =
          metrics.vibration_alert_active ??
          nextVibration > activeThresholds.vibration_threshold;
        setStatus(
          temperatureAlertActive || vibrationAlertActive ? "alert" : "running"
        );
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
        setIsRunning(false);
        setStatus("off");
        reportLeafyUnavailable(
          error.message || "Leafy Factory is unavailable"
        );
        return false;
      } finally {
        remoteTickInFlightRef.current = false;
      }
    },
    [
      persistAndAutoTriggerAlert,
      persistTelemetryCallback,
      reportLeafyUnavailable,
      setSourceError,
    ]
  );

  const startLeafySimulation = useCallback(async () => {
    setIsStarting(true);
    setSourceError("");
    setSensorMessage("");
    tempAlertActiveRef.current = false;
    vibAlertActiveRef.current = false;
    const controller = new AbortController();
    remoteAbortControllerRef.current = controller;
    let order = null;
    try {
      order = await createRemoteOrder(createLeafyPredictiveOrder(), {
        signal: controller.signal,
      });
      remoteOrderIdRef.current = order.order_id;
      await setRemoteThresholds(order.order_id, thresholdsRef.current, {
        signal: controller.signal,
      });
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
      if (order?.order_id && remoteOrderIdRef.current === order.order_id) {
        remoteOrderIdRef.current = null;
        stopRemoteOrder(order.order_id).catch(() => {});
      }
      if (remoteAbortControllerRef.current === controller) {
        remoteAbortControllerRef.current = null;
      }
      setIsRunning(false);
      setStatus("off");
      if (error.name !== "AbortError") {
        reportLeafyUnavailable(
          error.message || "Leafy Factory is unavailable"
        );
      }
    } finally {
      setIsStarting(false);
    }
  }, [reportLeafyUnavailable, runLeafyTick, setSourceError]);

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
    setSensorMessage("");
    tempAlertActiveRef.current = false;
    vibAlertActiveRef.current = false;

    const remoteOrderId = remoteOrderIdRef.current;
    remoteOrderIdRef.current = null;
    if (remoteOrderId) {
      try {
        await stopRemoteOrder(remoteOrderId);
      } catch (error) {
        setSourceError(
          error.message || "Unable to stop the Leafy Factory order"
        );
      }
    }
  }, [setSourceError]);

  const resetToDefaults = useCallback(async () => {
    await handleStop();
    const initial = getInitialMachineData();
    setMachineData(initial);
    setTemperature(DEFAULT_SENSOR_READINGS.temperature);
    setVibration(DEFAULT_SENSOR_READINGS.vibration);
    setThresholds({ ...DEFAULT_THRESHOLDS });
    temperatureRef.current = DEFAULT_SENSOR_READINGS.temperature;
    vibrationRef.current = DEFAULT_SENSOR_READINGS.vibration;
    thresholdsRef.current = { ...DEFAULT_THRESHOLDS };
  }, [handleStop]);

  useEffect(() => {
    return registerBeforeSourceChange(resetToDefaults);
  }, [registerBeforeSourceChange, resetToDefaults]);

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

  const onCommitTemperature = useCallback(
    async (value) => {
      const next = Number(value);
      setSensorMessage("");
      setTemperature(next);
      temperatureRef.current = next;
      setMachineData((prev) => {
        const updated = {
          ...prev,
          temperature: { ...prev.temperature, value: next },
        };
        if (isRunning && dataSource === "local") {
          evaluateLocalSample(updated);
        }
        return updated;
      });
      if (isRunning) {
        const breached = next > thresholdsRef.current.temperature_threshold;
        if (!breached) {
          setSensorMessage("Reading applied. No threshold crossing.");
        }
        if (
          dataSource === "leafy" &&
          remoteOrderIdRef.current &&
          remoteAbortControllerRef.current
        ) {
          await runLeafyTick(
            remoteOrderIdRef.current,
            remoteAbortControllerRef.current.signal
          );
        }
      }
    },
    [dataSource, evaluateLocalSample, isRunning, runLeafyTick]
  );

  const onCommitVibration = useCallback(
    async (value) => {
      const next = Number(value);
      setSensorMessage("");
      setVibration(next);
      vibrationRef.current = next;
      setMachineData((prev) => {
        const updated = {
          ...prev,
          vibration: { ...prev.vibration, value: next },
        };
        if (isRunning && dataSource === "local") {
          evaluateLocalSample(updated);
        }
        return updated;
      });
      if (isRunning) {
        const breached = next > thresholdsRef.current.vibration_threshold;
        if (!breached) {
          setSensorMessage("Reading applied. No threshold crossing.");
        }
        if (
          dataSource === "leafy" &&
          remoteOrderIdRef.current &&
          remoteAbortControllerRef.current
        ) {
          await runLeafyTick(
            remoteOrderIdRef.current,
            remoteAbortControllerRef.current.signal
          );
        }
      }
    },
    [dataSource, evaluateLocalSample, isRunning, runLeafyTick]
  );

  const commitThreshold = useCallback(
    async (key, value) => {
      const numeric = Number(value);
      setSensorMessage("");
      const previous = thresholdsRef.current;
      const next = { ...previous, [key]: numeric };
      setThresholds(next);
      thresholdsRef.current = next;

      if (dataSource === "leafy" && remoteOrderIdRef.current) {
        setIsSensorBusy(true);
        try {
          await setRemoteThresholds(remoteOrderIdRef.current, next);
          setSensorMessage("Threshold saved.");
        } catch (error) {
          setThresholds(previous);
          thresholdsRef.current = previous;
          setSourceError(error.message || "Unable to update threshold");
        } finally {
          setIsSensorBusy(false);
        }
      } else if (isRunning) {
        setSensorMessage("Threshold saved.");
      }
    },
    [dataSource, isRunning, setSourceError]
  );

  const onCommitTemperatureThreshold = useCallback(
    (value) => commitThreshold("temperature_threshold", value),
    [commitThreshold]
  );

  const onCommitVibrationThreshold = useCallback(
    (value) => commitThreshold("vibration_threshold", value),
    [commitThreshold]
  );

  // Incident Reports
  const fetchIncidentReportsCallback = useCallback(async () => {
    const data = await fetchIncidentReports();
    setIncidentReports(data);
  }, []);

  useEffect(() => {
    fetchIncidentReportsCallback();
    setRootCause("");
    setRepairInstructions("");
  }, [fetchIncidentReportsCallback]);

  // Handle deep-link from UNS in Action (`?alertId=...&autorun=1`)
  const queryAlertId = searchParams.get("alertId");
  const autorunRequested = searchParams.get("autorun") === "1";

  useEffect(() => {
    if (!queryAlertId) return;
    let cancelled = false;

    const syncFromQuery = async () => {
      let list = alerts;
      if (list.length === 0) {
        list = await fetchAlertsCallback();
      }
      if (cancelled) return;

      let target = list.find(
        (item) =>
          String(item._id) === queryAlertId ||
          item.uns_alert_key === queryAlertId
      );
      if (!target) {
        const fetched = await fetchAlertById(queryAlertId);
        if (cancelled) return;
        if (fetched) {
          target = fetched;
          setAlerts((prev) =>
            prev.some((item) => String(item._id) === String(fetched._id))
              ? prev
              : [fetched, ...prev]
          );
        }
      }

      if (!target) return;
      const resolvedId = String(target._id || queryAlertId);
      setSelectedAlertId(resolvedId);

      const autorunKey = `${resolvedId}:autorun`;
      if (autorunRequested && handledAutorunKeyRef.current !== autorunKey) {
        handledAutorunKeyRef.current = autorunKey;
        router.replace(
          `/agentic-ai/failure-prediction?alertId=${encodeURIComponent(
            resolvedId
          )}`,
          { scroll: false }
        );
        runFailureAgentForAlert(target);
      }
    };

    syncFromQuery();
    return () => {
      cancelled = true;
    };
  }, [
    alerts,
    autorunRequested,
    fetchAlertsCallback,
    queryAlertId,
    router,
    runFailureAgentForAlert,
  ]);

  const handleOpenContestable = useCallback(
    (incidentItem = null) => {
      setContestableIncident(
        incidentItem ||
          incidentReports[0] || {
            error_code: "E13",
            error_name: "High vibration",
            machine_id: "M1",
            root_cause:
              "Suspected bearing degradation on machine M1 based on elevated vibration.",
            repair_instructions: [
              {
                step: 1,
                description: "Inspect and align shaft bearings on M1.",
              },
            ],
          }
      );
    },
    [incidentReports]
  );

  const handleCloseContestable = useCallback(() => {
    setContestableIncident(null);
  }, []);

  const handleContestableCommitted = useCallback(async () => {
    const data = await fetchIncidentReports();
    setIncidentReports(data);
    if (data && data.length > 0) {
      setRootCause(data[0].root_cause || "");
      setRepairInstructions(
        formatRepairInstructions(data[0].repair_instructions)
      );
      markAgenticProgress("root-cause");
    }
  }, []);

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
      isSensorBusy,
      sensorMessage,
      dataSource,
      onCommitTemperature,
      onCommitVibration,
      onCommitTemperatureThreshold,
      onCommitVibrationThreshold,
      machineData,
      status,
      temperature,
      vibration,
      thresholds,
      alerts,
      alertsLoading,
      selectedAlertId,
      setSelectedAlertId,
      activeAlertId,
      sourceError,
      leafyAvailable,
      isSourceChecking,
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
    handleTriggerRootCause: runFailureAgentForAlert,
    agentLogs,
    agentThreadId,
    showTelemetry,
    setShowTelemetry,
    contestableIncident,
    handleOpenContestable,
    handleCloseContestable,
    handleContestableCommitted,
    refreshIncidentReports: fetchIncidentReportsCallback,
  };
}
