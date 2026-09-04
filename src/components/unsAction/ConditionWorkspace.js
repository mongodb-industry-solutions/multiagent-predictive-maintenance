"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { H2, H3, Body, Description } from "@leafygreen-ui/typography";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";
import { isRunningOrder } from "@/lib/factory/sessionOrders";

function severityClass(severity) {
  if (severity === "critical") return "bg-[#FDEDEB] text-[#B1371F]";
  return "bg-[#FFF1E5] text-[#944F01]";
}

const COLORS = {
  normal: "#00A35C",
  warning: "#DB6C00",
  critical: "#DB3030",
};

function severityFor(value, threshold) {
  const ratio = value / Math.max(1, threshold);
  if (ratio >= 1.5) return "critical";
  if (ratio > 1) return "warning";
  return "normal";
}

/**
 * Range-input state that only commits when the interaction ends: on pointer
 * release after a drag, on a plain click (press + release on a new value), or
 * on key release. The returned `draft` follows the thumb live.
 */
function useCommitOnRelease(value, onCommit) {
  const [draft, setDraft] = useState(value);
  const dragging = useRef(false);
  const draftRef = useRef(value);
  const lastCommitted = useRef(value);

  useEffect(() => {
    if (!dragging.current) {
      setDraft(value);
      draftRef.current = value;
      lastCommitted.current = value;
    }
  }, [value]);

  const commit = (next) => {
    const numeric = Number(next);
    if (numeric === lastCommitted.current) return;
    lastCommitted.current = numeric;
    onCommit(numeric);
  };

  // Fallback for a pointer released outside the slider while dragging.
  useEffect(() => {
    const release = () => {
      if (!dragging.current) return;
      dragging.current = false;
      commit(draftRef.current);
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCommit]);

  const handlers = {
    onPointerDown: () => {
      dragging.current = true;
    },
    onPointerUp: (event) => {
      dragging.current = false;
      commit(event.currentTarget.value);
    },
    onKeyUp: (event) => commit(event.currentTarget.value),
    onChange: (event) => {
      const next = Number(event.target.value);
      draftRef.current = next;
      setDraft(next);
    },
  };

  return [draft, handlers];
}

/**
 * One track, two handles: a round thumb for the injected reading and an
 * orange flag for the alert threshold. The track is tinted green below the
 * threshold and red above it, and the filled reading bar takes the current
 * severity colour, so the relationship between the two is visible at a glance.
 */
function SensorSlider({
  label,
  unit,
  min,
  max,
  value,
  threshold,
  onCommitValue,
  onCommitThreshold,
  disabled = false,
}) {
  const [draftValue, valueHandlers] = useCommitOnRelease(value, onCommitValue);
  const [draftThreshold, thresholdHandlers] = useCommitOnRelease(
    threshold,
    onCommitThreshold
  );
  const percent = (number) =>
    Math.min(100, Math.max(0, ((number - min) / (max - min)) * 100));
  const valuePct = percent(draftValue);
  const thresholdPct = percent(draftThreshold);
  const severity = severityFor(draftValue, draftThreshold);
  const color = COLORS[severity];

  return (
    <div className={`grid gap-1 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Body weight="medium" className="text-sm text-[#3D4F58]">
          {label}
        </Body>
        <span className="flex items-baseline gap-3 font-mono text-xs">
          <span className="text-[#944F01]" title="Alert threshold">
            ▮ {draftThreshold} {unit}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: severity === "normal" ? "#112733" : color }}
            title="Current reading"
          >
            ● {draftValue} {unit}
          </span>
        </span>
      </div>

      <div
        className={`relative h-8 ${disabled ? "cursor-not-allowed" : ""}`}
        style={{ "--sensor-value-color": color }}
        title={
          disabled
            ? "Readings and thresholds can only be changed while the selected order is running."
            : undefined
        }
      >
        {/* Track: safe zone up to the threshold, alert zone beyond it. */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full"
          style={{
            background: `linear-gradient(to right, #C0E9DA ${thresholdPct}%, #F6D3CD ${thresholdPct}%)`,
          }}
        >
          <div
            className="h-full rounded-full transition-[width] duration-100"
            style={{ width: `${valuePct}%`, backgroundColor: color }}
          />
        </div>
        <input
          type="range"
          aria-label={`${label} alert threshold`}
          min={min}
          max={max}
          value={draftThreshold}
          disabled={disabled}
          className="sensor-range sensor-range--threshold"
          {...thresholdHandlers}
        />
        <input
          type="range"
          aria-label={`${label} reading`}
          min={min}
          max={max}
          value={draftValue}
          disabled={disabled}
          className="sensor-range sensor-range--value"
          {...valueHandlers}
        />
      </div>
    </div>
  );
}

export default function ConditionWorkspace() {
  const {
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
  const canControl = !isOrderLoading && isRunningOrder(selectedOrder);
  const [alertFilter, setAlertFilter] = useState("all");
  const [message, setMessage] = useState("");

  // Thresholds are a slider setting, not a per-order reading: keep whatever
  // the user last set (or the first value loaded) and never reset it when a
  // different order is selected. Switching orders only enables/disables the
  // sliders via `canControl`; it does not move the threshold handle.
  const [thresholds, setThresholds] = useState(() => ({
    temperature_threshold: Number(
      snapshot.thresholds?.temperature_threshold ?? 80
    ),
    vibration_threshold: Number(
      snapshot.thresholds?.vibration_threshold ?? 50
    ),
  }));
  const thresholdsInitialized = useRef(
    snapshot.thresholds?.temperature_threshold != null ||
      snapshot.thresholds?.vibration_threshold != null
  );
  useEffect(() => {
    // Pick up the first real thresholds fetched from the backend (they load
    // asynchronously after mount), but only once — later order switches or
    // refreshes must not override the user's current slider positions.
    if (thresholdsInitialized.current || !snapshot.thresholds) return;
    thresholdsInitialized.current = true;
    setThresholds({
      temperature_threshold: Number(
        snapshot.thresholds.temperature_threshold ?? 80
      ),
      vibration_threshold: Number(
        snapshot.thresholds.vibration_threshold ?? 50
      ),
    });
  }, [snapshot.thresholds]);
  const readings = useMemo(
    () => ({
      temperature: Number(snapshot.sensor?.temperature ?? 68),
      vibration: Number(snapshot.sensor?.vibration ?? 24),
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
      const result = await sendMetrics({ ...readings, [key]: value });
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
    const next = { ...thresholds, [key]: value };
    // Reflect the change immediately and keep it regardless of order
    // switches; only a further user edit or the very first load moves it.
    setThresholds(next);
    try {
      await saveThresholds(next);
      setMessage("Threshold saved.");
    } catch {
      // Provider displays the detailed error.
    }
  };

  const busy = busyAction === "metrics" || busyAction === "thresholds";

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
            disabled={!canControl}
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
            disabled={!canControl}
            onCommitValue={(value) => commitReading("vibration", value)}
            onCommitThreshold={(value) =>
              commitThreshold("vibration_threshold", value)
            }
          />
        </div>

        <div className="mt-auto flex min-h-[20px] items-center justify-between gap-2 pt-3 text-xs">
          <span className="flex items-center gap-3 text-[#5C6C75]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-[#00A35C] bg-white" />
              Reading
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3.5 w-1 rounded-sm bg-[#DB6C00]" />
              Threshold
            </span>
          </span>
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
            visibleAlerts.map((alert, index) => (
              <article
                key={`${alert.timestamp}-${alert.metric}-${index}`}
                className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${severityClass(
                      alert.severity
                    )}`}
                  >
                    {alert.severity}
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
                  {alert.machine || "Laser Tab Welding"}
                </Description>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
