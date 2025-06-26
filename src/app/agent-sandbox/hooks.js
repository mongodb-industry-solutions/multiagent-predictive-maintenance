import { useEffect, useState, useCallback } from "react";
import { sendChatMessage, fetchAgentOptions } from "@/lib/api/agent";

export function useAgentSandbox({ initialAgentId = "test" } = {}) {
  const [agentId, setAgentId] = useState(initialAgentId);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState([]); // All logs for AgentLogs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [agentOptions, setAgentOptions] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  // Fetch agent options on mount
  useEffect(() => {
    async function fetchOptions() {
      setLoadingAgents(true);
      setError(null);
      try {
        const data = await fetchAgentOptions();
        setAgentOptions(data.options || []);
      } catch (e) {
        setError("Failed to load agent options");
      } finally {
        setLoadingAgents(false);
      }
    }
    fetchOptions();
  }, []);

  // Handle agent change (reset conversation)
  const handleAgentChange = useCallback((id) => {
    setAgentId(id);
    setThreadId(null);
    setLogs([]);
    setInput("");
    setError(null);
  }, []);

  // Send message to agent
  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    // Add user message to logs immediately
    setLogs((prev) => [...prev, { type: "user", values: { content: input } }]);
    try {
      await sendChatMessage({
        message: input,
        agentId,
        threadId,
        setLogs,
        setThreadId,
        setError,
      });
    } catch (e) {
      setError("Failed to send message");
    } finally {
      setLoading(false);
      setInput("");
    }
  }, [input, agentId, threadId]);

  // Reset conversation (new thread)
  const resetConversation = useCallback(() => {
    setThreadId(null);
    setLogs([]);
    setInput("");
    setError(null);
  }, []);

  return {
    agentId,
    setAgentId: handleAgentChange,
    input,
    setInput,
    logs,
    loading,
    error,
    sendMessage,
    threadId,
    resetConversation,
    agentOptions,
    loadingAgents,
  };
}
