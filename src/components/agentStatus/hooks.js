import { useCallback, useMemo, useState, useRef, useEffect } from "react";

// Process logs for display: chronological, tool_start shows loading, tool_end shows check, only reset on new agent call
function processAgentLogs(logs = []) {
  const result = [];
  logs.forEach((log) => {
    if (log.name === "tool_start") {
      const tool = {
        toolName: log.values?.name || log.values?.kwargs?.name || "Tool",
        loading: true,
        key: log.ts || Math.random(),
      };
      result.push(tool);
    } else if (log.name === "tool_end") {
      // Extract tool name from tool_end event
      const toolName = log.values?.name || log.values?.kwargs?.name || "Tool";
      // Find the most recent tool with this name that's still loading
      for (let i = result.length - 1; i >= 0; i--) {
        if (result[i].toolName === toolName && result[i].loading) {
          result[i].loading = false;
          break;
        }
      }
    }
  });
  return result;
}

export function useAgentStatus({
  isActive,
  showModal,
  onCloseModal,
  setShowModal,
  logs = [],
}) {
  // Always use color agent icon and text
  const agentImgSrc = "/img/agent-color.png";
  const agentTextColor = "text-black";
  // Status bubble and label
  const statusBubbleColor = isActive ? "bg-green-400" : "bg-gray-300";
  const statusLabel = isActive ? "Active" : "Idle";
  // Glow only if active
  const showGlow = isActive;

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

  // Logs for display
  const agentLogs = useMemo(() => processAgentLogs(logs), [logs]);
  // Ref for scrolling to last log
  const logsEndRef = useRef(null);
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [agentLogs.length]);

  // Logs Drawer State
  const [logsDrawerOpen, setLogsDrawerOpen] = useState(false);
  const openLogsDrawer = useCallback(() => setLogsDrawerOpen(true), []);
  const closeLogsDrawer = useCallback(() => setLogsDrawerOpen(false), []);

  return {
    handleBubbleClick,
    agentImgSrc,
    agentTextColor,
    statusBubbleColor,
    statusLabel,
    showGlow,
    agentLogs,
    logsEndRef,
    logsDrawerOpen,
    openLogsDrawer,
    closeLogsDrawer,
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
