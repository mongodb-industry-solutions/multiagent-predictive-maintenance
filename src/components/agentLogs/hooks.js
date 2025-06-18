import { useState, useCallback } from "react";

// This hook manages the logs and thread state for the AgentLogs component
export function useAgentLogs({ logs, threadId, onNewThread }) {
  // logs: array of events (from chat input logic)
  // threadId: current thread id
  // onNewThread: callback to reset conversation

  // Optionally, you could add filtering, grouping, or formatting logic here

  // Dropdown label logic
  const threadLabel = threadId ? `thread ${threadId}` : "new thread";

  // Handler for new thread (plus button)
  const handleNewThread = useCallback(() => {
    if (onNewThread) onNewThread();
  }, [onNewThread]);

  return {
    logs,
    threadId,
    threadLabel,
    handleNewThread,
  };
}
