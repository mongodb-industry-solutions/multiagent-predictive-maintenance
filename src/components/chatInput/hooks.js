"use client";
import { useState, useEffect } from "react";

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
    try {
      const url = threadId ? `/api/chat/${threadId}` : "/api/chat";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, agentId }),
      });
      const data = await res.json();

      if (data.response) {
        setResponse(data.response);
        if (data.threadId) setThreadId(data.threadId);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (e) {
      setError("Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const resetConversation = () => {
    setThreadId(null);
    setResponse("");
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
    loading,
    error,
    sendMessage,
    threadId,
    resetConversation,
    agentId,
    setAgentId: handleAgentChange,
  };
}
