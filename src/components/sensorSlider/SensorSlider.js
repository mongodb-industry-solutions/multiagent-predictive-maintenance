"use client";

import { useEffect, useRef, useState } from "react";
import { Body } from "@via-ds/components";

export const SENSOR_COLORS = {
  normal: "#00A35C",
  warning: "#DB6C00",
  critical: "#DB3030",
};

export function severityFor(value, threshold) {
  const ratio = Number(value) / Math.max(1, Number(threshold));
  if (ratio >= 1.5) return "critical";
  if (ratio > 1) return "warning";
  return "normal";
}

/**
 * Range-input state that only commits when the interaction ends: on pointer
 * release after a drag, on a plain click (press + release on a new value), or
 * on key release. The returned `draft` follows the thumb live.
 */
export function useCommitOnRelease(value, onCommit) {
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

export function SensorLegend() {
  return (
    <span className="flex items-center gap-3 text-sm text-[#5C6C75]">
      <span className="flex items-center gap-1">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-[#00A35C] bg-white" />
        Reading
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-3.5 w-1 rounded-sm bg-[#DB6C00]" />
        Threshold
      </span>
    </span>
  );
}

/**
 * One track, two handles: a round thumb for the injected reading and an
 * orange flag for the alert threshold. The track is tinted green below the
 * threshold and red above it, and the filled reading bar takes the current
 * severity colour, so the relationship between the two is visible at a glance.
 */
export default function SensorSlider({
  label,
  unit,
  min,
  max,
  step = 1,
  value,
  threshold,
  onCommitValue,
  onCommitThreshold,
  disabled = false,
  disabledTitle = "Readings and thresholds can only be changed while the simulation is running.",
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
  const color = SENSOR_COLORS[severity];

  return (
    <div className={`grid gap-1 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Body className="text-sm font-medium text-[#3D4F58]">{label}</Body>
        <span className="flex items-baseline gap-3 font-mono text-sm">
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
        title={disabled ? disabledTitle : undefined}
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
          step={step}
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
          step={step}
          value={draftValue}
          disabled={disabled}
          className="sensor-range sensor-range--value"
          {...valueHandlers}
        />
      </div>
    </div>
  );
}
