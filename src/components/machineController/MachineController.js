"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@via-ds/icons";
import SensorSlider from "@/components/sensorSlider/SensorSlider";
import {
  DEFAULT_THRESHOLDS,
  LASER_WELDING_MACHINE,
} from "@/lib/factory/constants";
import { useMachineController } from "./hooks";

export default function MachineController({
  status = "off",
  isRunning = false,
  isStarting = false,
  busy = false,
  message = "",
  temperature,
  vibration,
  thresholds = DEFAULT_THRESHOLDS,
  onCommitTemperature,
  onCommitVibration,
  onCommitTemperatureThreshold,
  onCommitVibrationThreshold,
  onStart,
  onStop,
  telemetryButton = null,
}) {
  useMachineController();
  const [infoOpen, setInfoOpen] = useState(false);
  const infoRef = useRef(null);

  useEffect(() => {
    if (!infoOpen) return undefined;
    const handleClose = (event) => {
      if (event.key === "Escape") setInfoOpen(false);
      if (
        event.type === "mousedown" &&
        !infoRef.current?.contains(event.target)
      ) {
        setInfoOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClose);
    window.addEventListener("keydown", handleClose);
    return () => {
      document.removeEventListener("mousedown", handleClose);
      window.removeEventListener("keydown", handleClose);
    };
  }, [infoOpen]);

  const controlsDisabled = !isRunning || isStarting || busy;
  const statusConfig =
    status === "alert"
      ? {
          label: "Alert",
          dotClass: "animate-pulse bg-[#DB3030]",
          textClass: "text-[#B1371F]",
        }
      : isRunning
        ? {
            label: "Running",
            dotClass: "animate-pulse bg-[#00A35C]",
            textClass: "text-[#00684A]",
          }
        : {
            label: "Stopped",
            dotClass: "bg-[#889397]",
            textClass: "text-[#5C6C75]",
          };

  return (
    <div className="grid w-full grid-cols-1 items-stretch gap-6 md:grid-cols-2">
      {/* Left 50%: Machine image + name/status (no card), Start simulation & View telemetry left-aligned below */}
      <div className="flex min-w-0 flex-col justify-between gap-2.5">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden bg-white">
            <Image
              src={LASER_WELDING_MACHINE.image}
              alt={LASER_WELDING_MACHINE.title}
              fill
              sizes="96px"
              className="object-contain"
              priority
            />
            {status === "alert" && (
              <span
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm"
                title="Threshold exceeded"
              >
                <Icon glyph="Warning" fill="#DB3030" size={14} />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div ref={infoRef} className="relative flex items-center gap-1.5">
              <h2 className="truncate text-base font-semibold leading-6 text-[#112733]">
                {LASER_WELDING_MACHINE.title}
              </h2>
              <button
                type="button"
                onClick={() => setInfoOpen((open) => !open)}
                aria-expanded={infoOpen}
                aria-label="Machine and production line info"
                title="Machine & production line info"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#5C6C75] transition hover:bg-[#E3FCF7] hover:text-[#00684A]"
              >
                <Icon glyph="InfoWithCircle" size={16} />
              </button>

              {infoOpen && (
                <div
                  role="dialog"
                  aria-label="Machine and production line details"
                  className="absolute left-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl border border-[#D8E3DF] bg-white p-4 text-sm text-[#112733] shadow-lg"
                >
                  <p className="font-semibold text-[#112733]">
                    {LASER_WELDING_MACHINE.title} ({LASER_WELDING_MACHINE.id})
                  </p>
                  <p className="mt-0.5 font-medium text-[#00684A]">
                    Leafy Factory · EV Module Assembly Line
                  </p>
                  <p className="mt-2 leading-5 text-[#3D4F58]">
                    {LASER_WELDING_MACHINE.description}
                  </p>
                  <p className="mt-2 text-[#5C6C75]">
                    Nominal: 55–75 °C, 15–40 mm/s
                  </p>
                  <Link
                    href="/unified-namespace/leafy-factory"
                    onClick={() => setInfoOpen(false)}
                    className="mt-3 inline-flex items-center gap-1.5 font-semibold text-[#00684A] hover:underline"
                  >
                    <span>Explore Leafy Factory overview</span>
                    <Icon glyph="ArrowRight" size={14} />
                  </Link>
                </div>
              )}
            </div>
            <span
              className={`mt-1 inline-flex items-center gap-1.5 text-sm font-semibold ${statusConfig.textClass}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${statusConfig.dotClass}`}
              />
              {statusConfig.label}
            </span>
            {(busy || (isRunning && message)) && (
              <p className="mt-1 flex items-center gap-1 truncate text-sm text-[#00684A]">
                {busy && (
                  <Icon
                    glyph="Refresh"
                    size={12}
                    className="shrink-0 animate-spin"
                  />
                )}
                <span className="truncate">
                  {busy ? "Applying…" : message}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-lg border border-[#F6D3CD] bg-[#FDEDEB] px-4 text-sm font-medium text-[#B1371F] transition hover:bg-[#FADBD7]"
            >
              Stop simulation
            </button>
          ) : (
            <button
              type="button"
              onClick={onStart}
              disabled={isStarting}
              className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-lg bg-[#00684A] px-4 text-sm font-medium text-white transition hover:bg-[#00543D] disabled:cursor-wait disabled:opacity-60"
            >
              {isStarting ? (
                <>
                  <Icon glyph="Refresh" size={16} className="animate-spin" />
                  Starting factory…
                </>
              ) : (
                <>
                  <Icon glyph="Play" size={16} />
                  Start simulation
                </>
              )}
            </button>
          )}
          {telemetryButton}
        </div>
      </div>

      {/* Right 50%: Dual-handle sliders */}
      <div className="flex min-w-0 flex-col justify-center">
        <div className="grid gap-1.5">
          <SensorSlider
            label="Temperature"
            unit="°C"
            min={20}
            max={200}
            value={temperature}
            threshold={thresholds.temperature_threshold}
            disabled={controlsDisabled}
            disabledTitle="Start the simulation to adjust readings and thresholds."
            onCommitValue={onCommitTemperature}
            onCommitThreshold={onCommitTemperatureThreshold}
          />
          <SensorSlider
            label="Vibration"
            unit="mm/s"
            min={0}
            max={120}
            value={vibration}
            threshold={thresholds.vibration_threshold}
            disabled={controlsDisabled}
            disabledTitle="Start the simulation to adjust readings and thresholds."
            onCommitValue={onCommitVibration}
            onCommitThreshold={onCommitVibrationThreshold}
          />
        </div>
      </div>
    </div>
  );
}
