import { useCallback, useMemo } from "react";

export function useAgentStatus({
  isActive,
  showModal,
  onCloseModal,
  setShowModal,
  logs = [], // Accept logs as a prop
}) {
  // Image source based on agent status
  const agentImgSrc = isActive ? "/img/agent-color.png" : "/img/agent-gray.png";

  // Text color for agent name and status
  const agentTextColor = isActive ? "text-black" : "text-gray-400";

  // Status bubble color
  const statusBubbleColor = isActive ? "bg-green-400" : "bg-gray-300";

  // Status label
  const statusLabel = isActive ? "Active" : "Inactive";

  // Handler for bubble click (open modal)
  const handleBubbleClick = useCallback(
    (e) => {
      e.preventDefault();
      if (typeof setShowModal === "function") {
        setShowModal(true);
        return;
      }
      if (typeof window !== "undefined") {
        const event = new CustomEvent("agent-bubble-click");
        window.dispatchEvent(event);
      }
    },
    [setShowModal]
  );

  // Streaming logs logic
  const latestToolLog = useMemo(() => {
    if (!isActive) return null;
    if (!logs || !Array.isArray(logs) || logs.length === 0) return null;
    // Find the last tool_start or tool_end event
    let lastToolEvent = null;
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      if (log.name === "tool_start" || log.name === "tool_end") {
        lastToolEvent = log;
        break;
      }
      // If another event, treat last start_tool as done
      if (
        lastToolEvent &&
        log.name !== "tool_start" &&
        log.name !== "tool_end"
      ) {
        lastToolEvent = { ...lastToolEvent, name: "tool_end" };
        break;
      }
    }
    if (!lastToolEvent) return null;
    // Tool name formatting
    let toolName =
      lastToolEvent.values?.name ||
      lastToolEvent.values?.kwargs?.name ||
      "Tool";
    toolName = toolName
      .replace(/_/g, " ")
      .replace(/^\w/, (c) => c.toUpperCase());
    // Status: loading if tool_start, done if tool_end
    const isLoading = lastToolEvent.name === "tool_start";
    return { toolName, isLoading };
  }, [logs, isActive]);

  // Logs area
  const logsLabel = "See full logs";
  const logsArrow = "→";
  const logsPlaceholder = "";

  return {
    handleBubbleClick,
    agentImgSrc,
    agentTextColor,
    statusBubbleColor,
    statusLabel,
    logsLabel,
    logsArrow,
    logsPlaceholder,
    latestToolLog,
  };
}

// Tailwind animation for agent-glow (add to your global CSS or tailwind config):
// .animate-agent-glow {
//   animation: agent-glow-fade 1.2s infinite alternate;
// }
// @keyframes agent-glow-fade {
//   0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
//   100% { box-shadow: 0 0 16px 8px rgba(34,197,94,0.25); }
// }
