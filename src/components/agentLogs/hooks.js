import { useState, useCallback, useMemo, useRef, useEffect } from "react";

function extractToolInput(values) {
  if (!values || typeof values !== "object") return null;
  if (values.query != null) return values.query;
  if (values.kwargs?.query != null) return values.kwargs.query;
  const source =
    values.kwargs && typeof values.kwargs === "object" ? values.kwargs : values;
  const args = Object.fromEntries(
    Object.entries(source).filter(
      ([key, value]) =>
        key !== "name" &&
        key !== "kwargs" &&
        value !== undefined &&
        value !== null
    )
  );
  return Object.keys(args).length > 0 ? args : null;
}

// Helper to group tool_start/tool_end and extract tool info
function processLogs(logs) {
  if (!logs) return [];
  const uiLogs = [];
  const toolStates = {};

  logs.forEach((log, idx) => {
    if (log.type === "user") {
      uiLogs.push({
        type: "user",
        content: log.values?.content || log.values?.name || "",
      });
    } else if (log.type === "final") {
      uiLogs.push({
        type: "ai",
        content: log.values?.content || log.values?.name || "",
      });
    } else if (log.type === "update") {
      // Tool calls
      if (log.name === "tool_start") {
        const toolName = log.values?.name || log.values?.kwargs?.name || "Tool";
        const query = extractToolInput(log.values);
        const toolLog = {
          type: "tool",
          toolName,
          query,
          loading: true,
          documents: [],
          idx,
        };
        toolStates[toolName] = toolLog;
        uiLogs.push(toolLog);
      } else if (log.name === "tool_end") {
        const toolName = log.values?.name || log.values?.kwargs?.name || "Tool";
        // Find the last tool card for this tool
        const toolLog = [...uiLogs]
          .reverse()
          .find(
            (l) => l.type === "tool" && l.toolName === toolName && l.loading
          );
        if (toolLog) {
          toolLog.loading = false;
          // Try to extract documents/content from the tool_end
          let docs = [];
          if (log.values?.kwargs?.content) {
            try {
              const parsed = JSON.parse(log.values.kwargs.content);
              if (Array.isArray(parsed)) docs = parsed;
              else docs = [parsed];
            } catch {
              docs = [log.values.kwargs.content];
            }
          } else if (log.values?.result) {
            try {
              const parsed = JSON.parse(log.values.result);
              if (Array.isArray(parsed)) docs = parsed;
              else docs = [parsed];
            } catch {
              docs = [log.values.result];
            }
          } else if (log.values?.content) {
            docs = [log.values.content];
          }
          toolLog.documents = docs;
        }
      } else if (log.name === "error") {
        uiLogs.push({
          type: "error",
          content:
            log.values?.message || log.values?.content || "Error occurred",
        });
      }
    }
  });

  return uiLogs;
}

export function useAgentLogs({ logs, threadId, onNewThread }) {
  const threadLabel = threadId ? `thread ${threadId}` : "new thread";
  const handleNewThread = useCallback(() => {
    if (onNewThread) onNewThread();
  }, [onNewThread]);

  const uiLogs = useMemo(() => processLogs(logs), [logs]);

  // Scroll to bottom logic
  const logsEndRef = useRef(null);
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [uiLogs]);

  return {
    threadLabel,
    handleNewThread,
    uiLogs,
    logsEndRef,
  };
}
