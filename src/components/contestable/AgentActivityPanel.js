"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ProgressCircle } from "@via-ds/components";
import { Icon } from "@via-ds/icons";

const STEP_TOOL_AGENTS = {
  evidence: ["root_cause"],
  debate: ["vibration_pattern_agent", "maintenance_history_agent"],
  review: [],
  report: ["refiner"],
};

const COLLAPSED_TOOL_LIMIT = 4;

export function formatToolName(name = "Tool") {
  const text = String(name).replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function collapsedToolRows(activityByActor, step) {
  const actorIds = STEP_TOOL_AGENTS[step] || [];
  const rows = [];
  const byRun = new Map();
  for (const actorId of actorIds) {
    for (const event of activityByActor?.[actorId] || []) {
      if (event?.type === "update" && event.name === "tool_start") {
        const row = {
          key: `${actorId}:${event.runId}`,
          runId: event.runId,
          toolName: event.values?.name || "Tool",
          at: event.at || "",
          loading: true,
          error: false,
        };
        byRun.set(row.key, row);
        rows.push(row);
      } else if (event?.type === "update" && event.name === "tool_end") {
        const row = byRun.get(`${actorId}:${event.runId}`);
        if (!row) continue;
        row.loading = false;
        row.at = event.at || row.at;
      } else if (
        event?.type === "status" &&
        event.status === "error" &&
        event.runId
      ) {
        const row = byRun.get(`${actorId}:${event.runId}`);
        if (!row) continue;
        row.loading = false;
        row.error = true;
        row.at = event.at || row.at;
      }
    }
  }
  return rows
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, COLLAPSED_TOOL_LIMIT);
}

function processActorActivity(events = []) {
  const tools = new Map();
  const items = [];
  for (const event of events) {
    if (event?.type === "update" && event.name === "tool_start") {
      const tool = {
        kind: "tool",
        runId: event.runId,
        name: event.values?.name || "tool",
        input: event.values?.input,
        output: null,
        loading: true,
        error: false,
        errorMessage: "",
      };
      tools.set(event.runId, tool);
      items.push(tool);
    } else if (event?.type === "update" && event.name === "tool_end") {
      const tool = tools.get(event.runId);
      if (!tool) continue;
      tool.loading = false;
      tool.output = event.values?.output ?? null;
    } else if (
      event?.type === "status" &&
      event.status === "error" &&
      event.runId &&
      tools.has(event.runId)
    ) {
      const tool = tools.get(event.runId);
      tool.loading = false;
      tool.error = true;
      tool.errorMessage = event.content || "Tool failed";
    } else if (event?.type === "message") {
      items.push({
        kind: "message",
        role: event.role || "assistant",
        content: event.content || "",
        at: event.at,
      });
    } else if (event?.type === "status") {
      items.push({
        kind: "status",
        status: event.status || "status",
        content: event.content || "",
        at: event.at,
      });
    }
  }
  return items;
}

function ToolStatusIcon({ loading, error }) {
  if (loading) {
    return <ProgressCircle size="small" aria-label="Tool running" />;
  }
  if (error) {
    return <Icon glyph="XWithCircle" size={16} aria-label="Tool failed" />;
  }
  return (
    <Icon
      glyph="CheckmarkWithCircle"
      fill="#00684A"
      size={16}
      aria-label="Tool completed"
    />
  );
}

function MessageEntry({ role, content }) {
  const [expanded, setExpanded] = useState(false);
  const lines = String(content || "").split("\n");
  const long = content.length > 320 || lines.length > 6;
  const visible =
    long && !expanded ? lines.slice(0, 6).join("\n") : content;
  const label =
    role === "system" ? "System" : role === "user" ? "User" : "Agent";
  return (
    <article className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6C75]">
        {label}
      </div>
      <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-xs leading-5 text-[#112733]">
        {visible}
        {long && !expanded ? "…" : ""}
      </pre>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-1 text-xs font-semibold text-[#00684A] hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </article>
  );
}

function ToolEntry({ tool }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="rounded-lg border border-[#E8EDEB] bg-white">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
        aria-expanded={expanded}
      >
        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <ToolStatusIcon loading={tool.loading} error={tool.error} />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-[#112733]">
          {formatToolName(tool.name)}
        </span>
        <Icon glyph={expanded ? "ChevronUp" : "ChevronDown"} size={14} />
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-[#E8EDEB] px-2.5 py-2">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6C75]">
              Input
            </div>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#F8FAF9] p-2 font-mono text-[11px] leading-4 text-[#112733]">
              {JSON.stringify(tool.input ?? {}, null, 2)}
            </pre>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5C6C75]">
              {tool.error ? "Error" : "Result"}
            </div>
            <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[#F8FAF9] p-2 font-mono text-[11px] leading-4 text-[#112733]">
              {tool.loading
                ? "Running…"
                : tool.error
                  ? tool.errorMessage
                  : JSON.stringify(tool.output ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </article>
  );
}

export default function AgentActivityPanel({
  open,
  onToggle,
  actors,
  selectedActorId,
  onSelectActor,
  activityByActor,
  step,
  isActorWorking,
  isActorCurrent,
  showContinue,
  onContinue,
}) {
  const logEndRef = useRef(null);
  const events = activityByActor?.[selectedActorId] || [];
  const items = useMemo(() => processActorActivity(events), [events]);
  const toolRows = useMemo(
    () => collapsedToolRows(activityByActor, step),
    [activityByActor, step]
  );
  const selectedActor = actors.find((actor) => actor.id === selectedActorId);

  useEffect(() => {
    if (!open) return;
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, items.length, selectedActorId]);

  return (
    <div
      className={`relative flex min-h-0 shrink-0 ${
        open ? "w-[30%] min-w-[16rem]" : "w-[8.5rem]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse agents overview" : "Expand agents overview"}
        aria-expanded={open}
        className="absolute left-0 top-1/2 z-20 flex h-7 w-7 -translate-x-1/4 -translate-y-1/2 items-center justify-center rounded-full border border-[#D8E3DF] bg-white text-[#00684A] shadow-sm hover:bg-[#E3FCF7]"
      >
        <Icon glyph={open ? "ChevronRight" : "ChevronLeft"} size={14} />
      </button>
      <aside className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white">
      <div
        className={`flex shrink-0 items-center ${
          open ? "px-3 py-2" : "justify-center px-1 py-2"
        }`}
      >
        <h2
          className={`font-semibold uppercase tracking-wider text-[#5C6C75] ${
            open ? "text-xs" : "text-center text-[10px] leading-tight"
          }`}
        >
          Agents overview
        </h2>
      </div>

      {open ? (
        <>
          <div
            role="tablist"
            aria-label="Agents"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#E8EDEB] px-2 py-2"
          >
            {actors.map((actor) => {
              const selected = actor.id === selectedActorId;
              const working = isActorWorking(actor);
              return (
                <button
                  key={actor.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => onSelectActor(actor.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    selected
                      ? "border-[#00684A] bg-[#E3FCF7] text-[#00684A]"
                      : "border-[#E8EDEB] bg-white text-[#5C6C75] hover:bg-[#F8FAF9]"
                  } ${working ? "animate-contestable-agent" : ""}`}
                >
                  <Icon glyph={actor.icon} size={12} />
                  {actor.short}
                </button>
              );
            })}
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
            <p className="text-sm font-semibold text-[#112733]">
              {selectedActor?.label || "Agent"}
            </p>
            {items.length === 0 ? (
              <p className="text-sm text-[#5C6C75]">
                {selectedActor?.kind === "human"
                  ? "No review actions yet."
                  : "This agent has not run yet."}
              </p>
            ) : (
              items.map((item, index) => {
                if (item.kind === "tool") {
                  return <ToolEntry key={item.runId || index} tool={item} />;
                }
                if (item.kind === "status") {
                  return (
                    <p
                      key={`${item.at}-${index}`}
                      className={`rounded-lg px-2.5 py-2 text-xs ${
                        item.status === "error" || item.status === "fallback"
                          ? "bg-[#FFEAE5] text-[#B1371F]"
                          : "bg-[#F8FAF9] text-[#5C6C75]"
                      }`}
                    >
                      {item.content}
                    </p>
                  );
                }
                return (
                  <MessageEntry
                    key={`${item.role}-${item.at}-${index}`}
                    role={item.role}
                    content={item.content}
                  />
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-y-auto px-1 py-2">
          {actors.map((actor) => {
            const working = isActorWorking(actor);
            const current = isActorCurrent(actor);
            const isHuman = actor.kind === "human";
            const quiet = !working && !current;
            let bubble =
              "flex h-11 w-11 items-center justify-center rounded-full border ";
            let label =
              "max-w-[4.5rem] text-center text-[11px] font-medium leading-tight ";
            if (quiet) {
              bubble += "border-[#E8EDEB] bg-[#F4F6F5] text-[#889397]";
              label += "text-[#889397]";
            } else if (isHuman) {
              bubble += "border-[#944F01] bg-[#FEF7DB] text-[#944F01]";
              label += "text-[#944F01]";
            } else {
              bubble += "border-[#00684A] bg-white text-[#00684A]";
              label += "text-[#00684A]";
              if (working) bubble += " animate-contestable-agent";
            }
            return (
              <div
                key={actor.id}
                className="flex flex-col items-center gap-1.5"
              >
                <div className={bubble} title={actor.label}>
                  <Icon glyph={actor.icon} size={16} />
                </div>
                <span className={label}>{actor.short}</span>
              </div>
            );
          })}
          <div className="w-full border-t border-[#E8EDEB] pt-2">
            <h3 className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[#5C6C75]">
              Tools
            </h3>
            {toolRows.length === 0 ? (
              <p className="text-center text-[10px] leading-tight text-[#889397]">
                No tool calls
              </p>
            ) : (
              <ul className="space-y-1.5">
                {toolRows.map((row) => (
                  <li key={row.key} className="flex items-start gap-1">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      <ToolStatusIcon loading={row.loading} error={row.error} />
                    </span>
                    <span className="min-w-0 text-[11px] font-medium leading-tight text-[#112733]">
                      {formatToolName(row.toolName)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="mx-1 mb-1 mt-auto flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#00573E] bg-[#00684A] px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#00573E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00A35C]"
        >
          Continue
          <Icon glyph="ArrowRight" size={14} />
        </button>
      )}
      </aside>
    </div>
  );
}
