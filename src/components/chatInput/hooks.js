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
    setLogs((prev) => [...prev, { type: "user", values: { content: input } }]);
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
        if (evt.type === "update") {
          setLogs((prev) => [...prev, evt]);
        } else if (evt.type === "final") {
          setResponse(evt.values?.content || "");
          setLogs((prev) => [...prev, { ...evt, type: "final" }]);
        } else if (evt.type === "error") {
          setError(evt.values?.name || "Error");
          setLogs((prev) => [...prev, evt]);
        }
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
      setInput(""); // Clear input after sending
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

export function useMergedChatInput({
  agentId: initialAgentId,
  setAgentId: setAgentIdProp,
}) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [agentId, setAgentId] = useState(initialAgentId || "test");
  const { options: agentOptions, loading: loadingAgents } = useAgentOptions();

  useEffect(() => {
    setAgentId(initialAgentId || "test");
  }, [initialAgentId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResponse("");
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
        if (evt.type === "final") {
          setResponse(evt.values?.content || "");
        } else if (evt.type === "error") {
          setError(evt.values?.name || "Error");
        }
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

  const handleAgentChange = (id) => {
    setAgentId(id);
    setThreadId(null);
    setResponse("");
    setInput("");
    setError(null);
    if (setAgentIdProp) setAgentIdProp(id);
  };

  return {
    input,
    setInput,
    response,
    loading: loading || loadingAgents,
    error,
    sendMessage,
    threadId,
    agentOptions,
    selectedAgentId: agentId,
    handleAgentChange,
  };
}

export function useAgentGraph(agentId) {
  const [imageUrl, setImageUrl] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState(null);

  useEffect(() => {
    if (!agentId) {
      setImageUrl(null);
      setGraphError(null);
      return;
    }
    setGraphLoading(true);
    setGraphError(null);
    setImageUrl(null);
    fetch("/api/agent/visualize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load graph image");
        }
        const blob = await res.blob();
        setImageUrl(URL.createObjectURL(blob));
      })
      .catch((e) => setGraphError(e.message))
      .finally(() => setGraphLoading(false));
  }, [agentId]);

  return { imageUrl, graphLoading, graphError };
}
