"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { H2, H3, Body, Description } from "@leafygreen-ui/typography";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";

function severityClass(severity) {
  if (severity === "critical") return "bg-[#FDEDEB] text-[#B1371F]";
  return "bg-[#FFF1E5] text-[#944F01]";
}

export default function ConditionWorkspace() {
  const {
    snapshot,
    selectedOrderId,
    selectOrder,
    saveThresholds,
    sendMetrics,
    busyAction,
  } = useFactoryData();
  const [thresholds, setThresholds] = useState({
    temperature_threshold: 80,
    vibration_threshold: 50,
  });
  const [readings, setReadings] = useState({
    temperature: 68,
    vibration: 24,
  });
  const [alertFilter, setAlertFilter] = useState("all");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (snapshot.thresholds) {
      setThresholds({
        temperature_threshold: Number(
          snapshot.thresholds.temperature_threshold ?? 80
        ),
        vibration_threshold: Number(
          snapshot.thresholds.vibration_threshold ?? 50
        ),
      });
    }
  }, [snapshot.thresholds]);

  useEffect(() => {
    if (snapshot.sensor) {
      setReadings({
        temperature: Number(snapshot.sensor.temperature ?? 68),
        vibration: Number(snapshot.sensor.vibration ?? 24),
      });
    }
  }, [snapshot.sensor]);

  const visibleAlerts = useMemo(
    () =>
      snapshot.alerts.filter(
        (alert) => alertFilter === "all" || alert.severity === alertFilter
      ),
    [alertFilter, snapshot.alerts]
  );

  const tempRatio =
    readings.temperature / Math.max(1, thresholds.temperature_threshold);
  const vibrationRatio =
    readings.vibration / Math.max(1, thresholds.vibration_threshold);

  const applyThresholds = async () => {
    setMessage("");
    try {
      await saveThresholds(thresholds);
      setMessage("Thresholds saved for the selected order.");
    } catch {
      // Provider displays the detailed error.
    }
  };

  const applyReadings = async () => {
    setMessage("");
    try {
      const result = await sendMetrics(readings);
      setMessage(
        result.alerts_generated?.length
          ? `Generated ${result.alerts_generated.join(" and ")} alert.`
          : "Readings applied. No new threshold crossing."
      );
    } catch {
      // Provider displays the detailed error.
    }
  };

  if (!selectedOrderId) {
    return (
      <section className="rounded-2xl border border-dashed border-[#00A35C] bg-white p-10 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E3FCF7] text-[#00684A]">
          <Icon glyph="Warning" size={24} />
        </span>
        <H2 className="mt-4 !text-xl !leading-7 text-[#112733]">
          Select or start an active order
        </H2>
        <Description className="mx-auto mt-2 max-w-lg leading-6">
          Thresholds and injected sensor readings are scoped to a production
          order, matching the Leafy Factory API contract.
        </Description>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-[#D8E3DF] bg-white p-4 shadow-sm">
        <div>
          <Body weight="medium" className="text-[#00684A]">
            Condition-monitoring scope
          </Body>
          <Description className="mt-1">
            Thresholds and alerts are isolated by production order.
          </Description>
        </div>
        <label className="grid min-w-[260px] gap-1 text-sm font-medium text-[#3D4F58]">
          Active order
          <select
            value={selectedOrderId}
            onChange={(event) => selectOrder(event.target.value)}
            className="h-10 rounded-lg border border-[#C1C7C6] bg-white px-3 text-[#112733]"
          >
            {snapshot.activeOrders.map((order) => (
              <option key={order.order_id} value={order.order_id}>
                {order.order_id} · {order.customer || "Factory order"}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3FCF7] text-[#00684A]">
              <Icon glyph="Wrench" size={20} />
            </span>
            <div>
              <H2 className="!text-xl !leading-7 text-[#112733]">
                Alert thresholds
              </H2>
              <Description className="mt-1">
                Laser Tab Welding · {selectedOrderId}
              </Description>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="flex items-center justify-between gap-3">
                <Body weight="medium" className="text-sm text-[#3D4F58]">
                  Temperature threshold
                </Body>
                <span className="font-mono text-sm font-semibold text-[#112733]">
                  {thresholds.temperature_threshold} °C
                </span>
              </span>
              <input
                type="range"
                min="40"
                max="160"
                value={thresholds.temperature_threshold}
                onChange={(event) =>
                  setThresholds((current) => ({
                    ...current,
                    temperature_threshold: Number(event.target.value),
                  }))
                }
                className="accent-[#00A35C]"
              />
            </label>
            <label className="grid gap-2">
              <span className="flex items-center justify-between gap-3">
                <Body weight="medium" className="text-sm text-[#3D4F58]">
                  Vibration threshold
                </Body>
                <span className="font-mono text-sm font-semibold text-[#112733]">
                  {thresholds.vibration_threshold} mm/s
                </span>
              </span>
              <input
                type="range"
                min="10"
                max="100"
                value={thresholds.vibration_threshold}
                onChange={(event) =>
                  setThresholds((current) => ({
                    ...current,
                    vibration_threshold: Number(event.target.value),
                  }))
                }
                className="accent-[#00A35C]"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={applyThresholds}
            disabled={busyAction === "thresholds"}
            className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#00684A] font-medium text-[#00684A] hover:bg-[#E3FCF7] disabled:opacity-50"
          >
            {busyAction === "thresholds" && (
              <Icon glyph="Refresh" size={16} className="animate-spin" />
            )}
            Save thresholds
          </button>
        </div>

        <div className="rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3FCF7] text-[#00684A]">
              <Icon glyph="Warning" size={20} />
            </span>
            <div>
              <H2 className="!text-xl !leading-7 text-[#112733]">
                Sensor test bench
              </H2>
              <Description className="mt-1">
                Move values across a threshold to generate an alert.
              </Description>
            </div>
          </div>

          <div className="mt-6 grid gap-5">
            {[
              {
                key: "temperature",
                label: "Temperature",
                unit: "°C",
                min: 20,
                max: 200,
                ratio: tempRatio,
              },
              {
                key: "vibration",
                label: "Vibration",
                unit: "mm/s",
                min: 0,
                max: 120,
                ratio: vibrationRatio,
              },
            ].map((sensor) => {
              const severity =
                sensor.ratio >= 1.5
                  ? "critical"
                  : sensor.ratio > 1
                    ? "warning"
                    : "normal";
              return (
                <label key={sensor.key} className="grid gap-2">
                  <span className="flex items-center justify-between gap-3">
                    <Body weight="medium" className="text-sm text-[#3D4F58]">
                      {sensor.label}
                    </Body>
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          severity === "critical"
                            ? "bg-[#DB3030]"
                            : severity === "warning"
                              ? "bg-[#DB6C00]"
                              : "bg-[#00A35C]"
                        }`}
                      />
                      <span className="font-mono text-sm font-semibold text-[#112733]">
                        {readings[sensor.key]} {sensor.unit}
                      </span>
                    </span>
                  </span>
                  <input
                    type="range"
                    min={sensor.min}
                    max={sensor.max}
                    value={readings[sensor.key]}
                    onChange={(event) =>
                      setReadings((current) => ({
                        ...current,
                        [sensor.key]: Number(event.target.value),
                      }))
                    }
                    className="accent-[#00A35C]"
                  />
                </label>
              );
            })}
          </div>

          <button
            type="button"
            onClick={applyReadings}
            disabled={busyAction === "metrics"}
            className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#00684A] font-medium text-white hover:bg-[#00543D] disabled:opacity-50"
          >
            {busyAction === "metrics" ? (
              <Icon glyph="Refresh" size={16} className="animate-spin" />
            ) : (
              <Icon glyph="Play" size={16} />
            )}
            Apply sensor readings
          </button>
        </div>
      </section>

      {message && (
        <div className="rounded-lg border border-[#B8E4D8] bg-[#E3FCF7] px-4 py-3 text-sm font-medium text-[#00684A]">
          {message}
        </div>
      )}

      <section className="rounded-2xl border border-[#D8E3DF] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <H2 className="!text-xl !leading-7 text-[#112733]">Alerts</H2>
            <Description className="mt-1">
              Threshold crossings recorded for the selected order.
            </Description>
          </div>
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
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleAlerts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#C1C7C6] bg-[#F8FAF9] p-8 text-center md:col-span-2 xl:col-span-3">
              <Icon
                glyph="CheckmarkWithCircle"
                size={24}
                className="mx-auto text-[#00A35C]"
              />
              <Body className="mt-2 text-[#5C6C75]">
                No alerts match this view.
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
                  <Description className="text-[11px]">
                    {alert.timestamp
                      ? new Date(alert.timestamp).toLocaleString()
                      : "Now"}
                  </Description>
                </div>
                <H3 className="mt-3 !text-base !leading-6 capitalize text-[#112733]">
                  High {alert.metric}
                </H3>
                <Description className="mt-1">
                  {alert.machine || "Laser Tab Welding"}
                </Description>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <p className="text-2xl font-semibold text-[#112733]">
                    {alert.value}
                  </p>
                  <Body className="text-xs text-[#5C6C75]">
                    Threshold {alert.threshold}
                  </Body>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
