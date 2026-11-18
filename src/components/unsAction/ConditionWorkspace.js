"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@via-ds/icons";
import { Body, Description, H2, H3 } from "@via-ds/components";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";
import SensorSlider, {
  SensorLegend,
} from "@/components/sensorSlider/SensorSlider";
import { ensureAlertPersisted } from "@/lib/api/alerts";
import {
  DEFAULT_SENSOR_READINGS,
  DEFAULT_THRESHOLDS,
  FACTORY_SOURCE_STORAGE_KEY,
  LASER_WELDING_MACHINE,
} from "@/lib/factory/constants";
import { isRunningOrder } from "@/lib/factory/sessionOrders";

function severityClass(severity) {
  if (severity === "critical") return "bg-[#FDEDEB] text-[#B1371F]";
  return "bg-[#FFF1E5] text-[#944F01]";
}

function formatMachineLabel(machine) {
  if (!machine || machine === "Laser Tab Welding" || machine === "M1") {
    return LASER_WELDING_MACHINE.title;
  }
  return machine;
}

export default function ConditionWorkspace() {
  const router = useRouter();
  const {
    source,
    snapshot,
    selectedOrderId,
    selectedOrder,
    isOrderLoading,
    orderDataLoading,
    saveThresholds,
    sendMetrics,
    busyAction,
  } = useFactoryData();
  // Readings and thresholds can only be pushed to a running factory runtime.
  const selectedOrderRunning = isRunningOrder(selectedOrder);
  const canControl = !isOrderLoading && selectedOrderRunning;
  const [alertFilter, setAlertFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [launchingKey, setLaunchingKey] = useState(null);

  const [thresholds, setThresholds] = useState(() => ({
    temperature_threshold: Number(
      snapshot.thresholds?.temperature_threshold ??
        DEFAULT_THRESHOLDS.temperature_threshold
    ),
    vibration_threshold: Number(
      snapshot.thresholds?.vibration_threshold ??
        DEFAULT_THRESHOLDS.vibration_threshold
    ),
  }));
  useEffect(() => {
    // A stopped/completed order freezes the controls in their safe defaults,
    // and a new order also starts there until its own thresholds are loaded.
    if (!selectedOrderRunning || !snapshot.thresholds) {
      setThresholds({ ...DEFAULT_THRESHOLDS });
      return;
    }
    // While running, keep the handles aligned with the selected order's
    // actual backend thresholds.
    setThresholds({
      temperature_threshold: Number(
        snapshot.thresholds.temperature_threshold ??
          DEFAULT_THRESHOLDS.temperature_threshold
      ),
      vibration_threshold: Number(
        snapshot.thresholds.vibration_threshold ??
          DEFAULT_THRESHOLDS.vibration_threshold
      ),
    });
  }, [selectedOrderId, selectedOrderRunning, snapshot.thresholds]);
  const readings = useMemo(
    () => ({
      temperature: Number(
        snapshot.sensor?.temperature ?? DEFAULT_SENSOR_READINGS.temperature
      ),
      vibration: Number(
        snapshot.sensor?.vibration ?? DEFAULT_SENSOR_READINGS.vibration
      ),
    }),
    [snapshot.sensor]
  );

  const visibleAlerts = useMemo(
    () =>
      snapshot.alerts.filter(
        (alert) => alertFilter === "all" || alert.severity === alertFilter
      ),
    [alertFilter, snapshot.alerts]
  );

  const commitReading = async (key, value) => {
    setMessage("");
    try {
      const result = await sendMetrics(
        { ...readings, [key]: value },
        thresholds
      );
      setMessage(
        result.alerts_generated?.length
          ? `Generated ${result.alerts_generated.join(" and ")} alert.`
          : "Reading applied. No threshold crossing."
      );
    } catch {
      // Provider displays the detailed error.
    }
  };

  const commitThreshold = async (key, value) => {
    setMessage("");
    const previous = thresholds;
    const next = { ...thresholds, [key]: value };
    // Reflect the change immediately; the backend response remains the source
    // of truth and the optimistic value is rolled back if persistence fails.
    setThresholds(next);
    try {
      await saveThresholds(next);
      setMessage("Threshold saved.");
    } catch {
      setThresholds(previous);
      // Provider displays the detailed error.
    }
  };

  const handleRootCause = async (alert, alertKey) => {
    if (launchingKey) return;
    setLaunchingKey(alertKey);
    try {
      try {
        window.sessionStorage.setItem(FACTORY_SOURCE_STORAGE_KEY, source);
      } catch {
        // Ignore disabled storage.
      }
      const persisted = await ensureAlertPersisted(alert, {
        temperature: readings.temperature,
        vibration: readings.vibration,
        thresholds,
        orderId: alert.order_id || selectedOrderId,
        origin: "uns-in-action",
        dataSource: source,
      });
      router.push(
        `/agentic-ai/failure-prediction?alertId=${encodeURIComponent(
          persisted._id
        )}&autorun=1`
      );
    } finally {
      setLaunchingKey(null);
    }
  };

  const busy = busyAction === "metrics" || busyAction === "thresholds";
  const controlsDisabled =
    !canControl || busy || busyAction === "start-order";

  return (
    <section className="grid gap-5 lg:grid-cols-[7fr_13fr]">
      {/* Sensor controls — 35% */}
      <div className="flex min-w-0 flex-col rounded-2xl border border-[#D8E3DF] bg-white p-5 shadow-sm">
        <H2 className="!text-xl !leading-7 text-[#112733]">Sensors</H2>

        <div className="mt-4 grid gap-3">
          <SensorSlider
            label="Temperature"
            unit="°C"
            min={20}
            max={200}
            value={readings.temperature}
            threshold={thresholds.temperature_threshold}
            disabled={controlsDisabled}
            disabledTitle="Readings and thresholds can only be changed while the selected order is running."
            onCommitValue={(value) => commitReading("temperature", value)}
            onCommitThreshold={(value) =>
              commitThreshold("temperature_threshold", value)
            }
          />
          <SensorSlider
            label="Vibration"
            unit="mm/s"
            min={0}
            max={120}
            value={readings.vibration}
            threshold={thresholds.vibration_threshold}
            disabled={controlsDisabled}
            disabledTitle="Readings and thresholds can only be changed while the selected order is running."
            onCommitValue={(value) => commitReading("vibration", value)}
            onCommitThreshold={(value) =>
              commitThreshold("vibration_threshold", value)
            }
          />
        </div>

        <div className="mt-auto flex min-h-[20px] items-center justify-between gap-2 pt-3 text-sm">
          <SensorLegend />
          <span className="flex min-w-0 items-center gap-1.5 truncate text-right">
            {busy ? (
              <>
                <Icon
                  glyph="Refresh"
                  size={14}
                  className="animate-spin text-[#00684A]"
                />
                <span className="text-[#5C6C75]">Applying…</span>
              </>
            ) : (
              canControl &&
              message && (
                <span className="truncate font-medium text-[#00684A]">
                  {message}
                </span>
              )
            )}
          </span>
        </div>
      </div>

      {/* Alerts — 65% */}
      <div className="min-w-0 rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <H2 className="!text-xl !leading-7 text-[#112733]">Alerts</H2>
          {orderDataLoading.alerts ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5C6C75]">
              <Icon glyph="Refresh" size={14} className="animate-spin" />
              Loading alerts…
            </span>
          ) : (
            <div
              className="inline-flex rounded-lg bg-[#E8EDEB] p-1"
              role="group"
              aria-label="Alert severity filter"
            >
              {["all", "warning", "critical"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAlertFilter(filter)}
                  aria-pressed={alertFilter === filter}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                    alertFilter === filter
                      ? "bg-white text-[#00684A] shadow-sm"
                      : "text-[#5C6C75]"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="cardlist-scrollbar mt-5 grid max-h-[420px] gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {visibleAlerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#C1C7C6] bg-[#F8FAF9] p-8 text-center md:col-span-2 xl:col-span-3">
              <Icon
                glyph={
                  orderDataLoading.alerts ? "Refresh" : "CheckmarkWithCircle"
                }
                size={24}
                className={`mx-auto text-[#00A35C] ${
                  orderDataLoading.alerts ? "animate-spin" : ""
                }`}
              />
              <Body className="mt-2 text-[#5C6C75]">
                {orderDataLoading.alerts
                  ? "Loading alerts for this order…"
                  : !selectedOrderId
                  ? "Select an order to see its alerts."
                  : canControl
                    ? "No alerts match this view. Move a sensor above its threshold to generate one."
                    : "No alerts were recorded for this order."}
              </Body>
            </div>
          ) : (
            visibleAlerts.map((alert, index) => {
              const alertKey = `${alert.order_id || selectedOrderId || "order"}-${alert.timestamp}-${alert.metric}-${index}`;
              const unit = alert.metric === "vibration" ? "mm/s" : "°C";
              const hasNumbers =
                Number.isFinite(Number(alert.value)) &&
                Number.isFinite(Number(alert.threshold));
              return (
                <article
                  key={alertKey}
                  className="flex flex-col rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-sm font-semibold uppercase ${severityClass(
                        alert.severity
                      )}`}
                    >
                      {alert.severity || "warning"}
                    </span>
                    <Description
                      className="shrink-0 whitespace-nowrap text-[11px] tabular-nums"
                      title={
                        alert.timestamp
                          ? new Date(alert.timestamp).toLocaleString()
                          : undefined
                      }
                    >
                      {alert.timestamp
                        ? new Date(alert.timestamp).toLocaleTimeString()
                        : "Now"}
                    </Description>
                  </div>
                  <H3 className="mt-3 !text-base !leading-6 capitalize text-[#112733]">
                    High {alert.metric}
                  </H3>
                  <Description className="mt-1">
                    {formatMachineLabel(alert.machine)}
                  </Description>
                  {hasNumbers && (
                    <Description className="mt-0.5 font-mono text-sm text-[#5C6C75]">
                      {Number(alert.value)} {unit} &gt; {Number(alert.threshold)}{" "}
                      {unit}
                    </Description>
                  )}
                  <div className="mt-auto flex items-center justify-end pt-3">
                    <button
                      type="button"
                      onClick={() => handleRootCause(alert, alertKey)}
                      disabled={Boolean(launchingKey)}
                      aria-label={`Run root cause analysis for high ${alert.metric} alert`}
                      title="Run root cause analysis in Predictive Maintenance"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-[#00684A] hover:bg-white disabled:cursor-wait disabled:opacity-60"
                    >
                      <Icon
                        glyph={launchingKey === alertKey ? "Refresh" : "Sparkle"}
                        size={14}
                        className={launchingKey === alertKey ? "animate-spin" : ""}
                      />
                      Root Cause
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
