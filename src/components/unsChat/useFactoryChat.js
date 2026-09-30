"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";
import {
  fetchChatThread,
  fetchRecentChatThreads,
  sendChatMessage,
} from "@/lib/api/agent";
import { buildFactoryChatContext } from "@/lib/factory/chatContext";

function toolNameFrom(values) {
  return (
    values?.name ||
    values?.kwargs?.name ||
    values?.lc_kwargs?.name ||
    "factory_tool"
  );
}

function toolContentFrom(values) {
  return (
    values?.kwargs?.content ||
    values?.lc_kwargs?.content ||
    values?.content ||
    values?.result ||
    null
  );
}

function parseToolContent(values) {
  const content = toolContentFrom(values);
  if (content && typeof content === "object") return content;
  if (typeof content !== "string") return null;
  try {
    return JSON.parse(content);
  } catch {
    return { kind: "text", data: content };
  }
}

function processLogs(logs) {
  const entries = [];
  const openTools = new Map();

  logs.forEach((log, index) => {
    if (log.type === "user") {
      entries.push({
        id: `user-${index}`,
        type: "user",
        content: log.values?.content || "",
      });
      return;
    }
    if (log.type === "final") {
      entries.push({
        id: `answer-${index}`,
        type: "assistant",
        content: log.values?.content || "",
      });
      return;
    }
    if (log.type === "error") {
      entries.push({
        id: `error-${index}`,
        type: "error",
        content:
          log.values?.name ||
          log.values?.message ||
          log.message ||
          "Factory Chat encountered an error.",
      });
      return;
    }
    if (log.type !== "update") return;

    if (log.name === "tool_start") {
      const toolName = toolNameFrom(log.values);
      const entry = {
        id: `tool-${log.runId || index}`,
        type: "tool",
        toolName,
        input: Object.fromEntries(
          Object.entries(log.values || {}).filter(([key]) => key !== "name")
        ),
        loading: true,
        result: null,
      };
      entries.push(entry);
      openTools.set(log.runId || `${toolName}-${index}`, entry);
      return;
    }

    if (log.name === "tool_end") {
      const toolName = toolNameFrom(log.values);
      let entry = log.runId ? openTools.get(log.runId) : null;
      if (!entry) {
        entry = [...entries]
          .reverse()
          .find(
            (item) =>
              item.type === "tool" &&
              item.loading &&
              item.toolName === toolName
          );
      }
      if (entry) {
        entry.loading = false;
        entry.result = parseToolContent(log.values);
      }
    }
  });

  return entries;
}

export function formatToolName(name) {
  return String(name || "Factory tool")
    .replace(/^read_/, "")
    .replace(/^inspect_/, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function useFactoryChat() {
  const { snapshot, source } = useFactoryData();
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState([]);
  const [threadId, setThreadId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentThreads, setRecentThreads] = useState([]);

  const refreshRecentThreads = useCallback(async () => {
    try {
      setRecentThreads(await fetchRecentChatThreads("uns-chat"));
    } catch {
      setRecentThreads([]);
    }
  }, []);

  useEffect(() => {
    refreshRecentThreads();
  }, [refreshRecentThreads]);

  const sendMessage = useCallback(
    async (prompt) => {
      const message = (prompt ?? input).trim();
      if (!message || loading) return;
      setInput("");
      setError(null);
      setLoading(true);
      setLogs((current) => [
        ...current,
        { type: "user", values: { content: message } },
      ]);
      try {
        await sendChatMessage({
          message,
          agentId: "uns-chat",
          threadId,
          context: buildFactoryChatContext(snapshot, source),
          setLogs,
          setThreadId,
          setError,
        });
        void refreshRecentThreads();
      } catch (sendError) {
        const messageText =
          sendError?.message || "Unable to reach Factory Chat.";
        setError(messageText);
        setLogs((current) => [
          ...current,
          {
            type: "error",
            values: { name: messageText },
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [
      input,
      loading,
      refreshRecentThreads,
      snapshot,
      source,
      threadId,
    ]
  );

  const resetConversation = useCallback(() => {
    setInput("");
    setLogs([]);
    setThreadId(null);
    setError(null);
  }, []);

  const openConversation = useCallback(async (nextThreadId) => {
    setHistoryLoading(true);
    setError(null);
    try {
      const thread = await fetchChatThread(nextThreadId, "uns-chat");
      setLogs(
        (thread.messages || []).flatMap((message, index) => {
          if (message.role === "user") {
            return [{ type: "user", values: { content: message.content } }];
          }
          if (message.role === "assistant") {
            return [{ type: "final", values: { content: message.content } }];
          }
          if (message.role === "tool") {
            const runId = `history-tool-${index}`;
            return [
              {
                type: "update",
                name: "tool_start",
                runId,
                values: { name: message.name, ...(message.input || {}) },
              },
              {
                type: "update",
                name: "tool_end",
                runId,
                values: { name: message.name, content: message.content },
              },
            ];
          }
          return [];
        })
      );
      setThreadId(thread.threadId);
      setInput("");
    } catch (loadError) {
      setError(loadError?.message || "Unable to load conversation");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const entries = useMemo(() => processLogs(logs), [logs]);
  const activeTool = [...entries]
    .reverse()
    .find((entry) => entry.type === "tool" && entry.loading);
  const processingLabel = loading
    ? activeTool
      ? `Checking ${formatToolName(activeTool.toolName).toLowerCase()}`
      : "Reasoning with factory context"
    : "Ready for a question";

  return {
    input,
    setInput,
    entries,
    loading,
    historyLoading,
    error,
    threadId,
    recentThreads,
    source,
    processingLabel,
    sendMessage,
    resetConversation,
    openConversation,
  };
}
