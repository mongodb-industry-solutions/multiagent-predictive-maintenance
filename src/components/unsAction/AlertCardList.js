"use client";

import { useMemo, useState } from "react";
import { Icon } from "@via-ds/icons";
import { Body, Description, H3 } from "@via-ds/components";
import {
  computeAlertSeverity,
  normalizeAlertTimestamp,
} from "@/lib/api/alerts";
import {
  DEFAULT_THRESHOLDS,
  LASER_WELDING_MACHINE,
} from "@/lib/factory/constants";

function severityClass(severity) {
  if (severity === "critical") return "bg-[#FDEDEB] text-[#B1371F]";
  return "bg-[#FFF1E5] text-[#944F01]";
}

function resolveAlertDisplay(alert) {
  const isVibration = alert.metric
    ? alert.metric === "vibration"
    : alert.err_code === "E13";
  const metric = isVibration ? "vibration" : "temperature";
  const errCode = alert.err_code || (isVibration ? "E13" : "E12");
  const unit = isVibration ? "mm/s" : "°C";
  const rawValue =
    alert.value ??
    (isVibration ? alert.details?.vibration : alert.details?.temperature);
  const rawThreshold =
    alert.threshold ??
    alert.details?.threshold ??
    (isVibration
      ? DEFAULT_THRESHOLDS.vibration_threshold
      : DEFAULT_THRESHOLDS.temperature_threshold);
  const severity =
    alert.severity === "critical" || alert.severity === "warning"
      ? alert.severity
      : computeAlertSeverity(rawValue, rawThreshold);
  const isoTs = normalizeAlertTimestamp(alert.ts || alert.timestamp);
  const parsedDate = new Date(isoTs);
  const machineLabel =
    !alert.machine ||
    alert.machine === "Laser Tab Welding" ||
    alert.machine === "M1"
      ? LASER_WELDING_MACHINE.title
      : alert.machine;

  return {
    metric,
    errCode,
    title: alert.err_name || `High ${metric}`,
    unit,
    value: Number.isFinite(Number(rawValue)) ? Number(rawValue) : null,
    threshold: Number.isFinite(Number(rawThreshold))
      ? Number(rawThreshold)
      : null,
    severity,
    dateLabel: !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleTimeString()
      : "Now",
    fullDateLabel: !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleString()
      : undefined,
    machineLabel,
  };
}

export default function AlertCardList({
  items = [],
  isLoading = false,
  selectedId = null,
  activeAlertId = null,
  agentActive = false,
  compact = false,
  onSelect,
  onTriggerRootCause,
  onInspectDocument,
}) {
  const [alertFilter, setAlertFilter] = useState("all");

  const enrichedItems = useMemo(
    () =>
      items.map((item) => ({
        item,
        id: String(item._id || item.uns_alert_key || ""),
        display: resolveAlertDisplay(item),
      })),
    [items]
  );

  const visibleItems = useMemo(
    () =>
      enrichedItems.filter(
        ({ display }) =>
          alertFilter === "all" || display.severity === alertFilter
      ),
    [alertFilter, enrichedItems]
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 pb-3">
        <div>
          <h3 className="text-base font-semibold leading-6 text-[#112733]">
            Alerts
          </h3>
          <Description className="text-sm text-[#5C6C75]">
            Live alerts trigger analysis automatically. Select any existing
            alert to run Root Cause manually.
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
              className={`rounded-md px-2.5 py-1 text-sm font-medium capitalize ${
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

      <div
        className={`cardlist-scrollbar grid min-h-0 flex-1 content-start gap-3 overflow-y-auto pr-1 ${
          compact ? "grid-cols-1" : "grid-cols-1 xl:grid-cols-2"
        }`}
      >
        {isLoading && items.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed border-[#C1C7C6] bg-[#F8FAF9] p-6 text-center ${
              compact ? "" : "xl:col-span-2"
            }`}
          >
            <Icon
              glyph="Refresh"
              size={22}
              className="mx-auto animate-spin text-[#00684A]"
            />
            <Body className="mt-2 text-sm text-[#5C6C75]">
              Loading alerts…
            </Body>
          </div>
        ) : visibleItems.length === 0 ? (
          <div
            className={`rounded-xl border border-dashed border-[#C1C7C6] bg-[#F8FAF9] p-6 text-center ${
              compact ? "" : "xl:col-span-2"
            }`}
          >
            <Icon
              glyph="CheckmarkWithCircle"
              size={22}
              className="mx-auto text-[#00A35C]"
            />
            <Body className="mt-2 text-sm text-[#5C6C75]">
              No alerts match this view. Start the simulation and raise a sensor
              above its threshold, or create one in UNS in Action.
            </Body>
          </div>
        ) : (
          visibleItems.map(({ item, id, display }, index) => {
            const isSelected = Boolean(id && selectedId === id);
            const isRunningThisAlert =
              agentActive && Boolean(id && activeAlertId === id);
            return (
              <article
                key={id || `${display.metric}-${index}`}
                onClick={() => id && onSelect?.(id)}
                className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition ${
                  isSelected
                    ? "border-[#00A35C] bg-[#E3FCF7]"
                    : "border-[#D8E3DF] bg-[#F8FAF9] hover:border-[#B8E4D2]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-sm font-semibold uppercase ${severityClass(
                        display.severity
                      )}`}
                    >
                      {display.severity}
                    </span>
                    <span className="rounded-full border border-[#D8E3DF] bg-white px-2 py-0.5 font-mono text-[11px] font-semibold text-[#3D4F58]">
                      {display.errCode}
                    </span>
                  </div>
                  <Description
                    className="shrink-0 whitespace-nowrap text-[11px] tabular-nums"
                    title={display.fullDateLabel}
                  >
                    {display.dateLabel}
                  </Description>
                </div>

                <H3 className="mt-2.5 !text-base !leading-6 capitalize text-[#112733]">
                  {display.title}
                </H3>
                <Description className="mt-0.5 text-sm">
                  {display.machineLabel}
                  {item.order_id ? ` · ${item.order_id}` : ""}
                </Description>
                {display.value !== null && display.threshold !== null && (
                  <Description className="mt-0.5 font-mono text-sm text-[#5C6C75]">
                    {display.value} {display.unit} &gt; {display.threshold}{" "}
                    {display.unit}
                  </Description>
                )}

                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onInspectDocument?.(item, display);
                    }}
                    aria-label={`View alert ${display.errCode} MongoDB document`}
                    title="View MongoDB alert document"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border font-mono text-sm font-semibold text-[#00684A] transition ${
                      isSelected
                        ? "border-[#00A35C] bg-white hover:bg-[#F8FAF9]"
                        : "border-[#C1C7C6] bg-white hover:bg-[#E3FCF7]"
                    }`}
                  >
                    {"{}"}
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (id) onSelect?.(id);
                      onTriggerRootCause?.(item);
                    }}
                    disabled={agentActive}
                    aria-label={`Run root cause analysis for ${display.errCode} ${display.title}`}
                    title="Run Root Cause Analysis for this alert"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-[#00684A] transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                  >
                    <Icon
                      glyph={isRunningThisAlert ? "Refresh" : "Sparkle"}
                      size={14}
                      className={isRunningThisAlert ? "animate-spin" : ""}
                    />
                    {isRunningThisAlert ? "Analyzing…" : "Root Cause"}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
