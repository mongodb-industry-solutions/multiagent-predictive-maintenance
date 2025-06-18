"use client";
import { useState, useEffect } from "react";
import { streamAgentEvents } from "@/lib/stream/agent";

export function useAgentOptions() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOptions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/agent/options");
        const data = await res.json();
        setOptions(data.options || []);
      } catch (e) {
        setError("Failed to load agent options");
      } finally {
        setLoading(false);
      }
    }
    fetchOptions();
  }, []);

  return { options, loading, error };
}

export function useChatInput({
  agentId: initialAgentId,
  setAgentId: setAgentIdProp,
}) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [agentId, setAgentId] = useState(initialAgentId || "test");

  useEffect(() => {
    setAgentId(initialAgentId || "test");
  }, [initialAgentId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResponse("");
    setLogs([]); // Clear logs before starting async work
    try {
      const url = threadId ? `/api/chat/${threadId}` : "/api/chat";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, agentId }),
      });
      if (!res.body) throw new Error("No response body");
      let newThreadId = threadId;
      for await (const evt of streamAgentEvents(res.body)) {
        console.log("Event received:", evt);
        if (evt.type === "update") {
          setLogs((prev) => [...prev, evt]);
        } else if (evt.type === "final") {
          setResponse(evt.values?.content || "");
        } else if (evt.type === "error") {
          setError(evt.values?.name || "Error");
        }
        // Set threadId if present in first response
        if (!newThreadId && evt.threadId) {
          newThreadId = evt.threadId;
          setThreadId(newThreadId);
        }
      }
      if (!newThreadId) setThreadId((prev) => prev || Date.now().toString());
    } catch (e) {
      setError("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setThreadId(null);
    setResponse("");
    setLogs([]);
    setInput("");
    setError(null);
  };

  const handleAgentChange = (id) => {
    setAgentId(id);
    resetConversation();
    if (setAgentIdProp) setAgentIdProp(id);
  };

  return {
    input,
    setInput,
    response,
    logs, // expose logs
    loading,
    error,
    sendMessage,
    threadId,
    resetConversation,
    agentId,
    setAgentId: handleAgentChange,
  };
}
