import { useCallback } from "react";

export function useAgentStatus({
  isActive,
  showModal,
  onCloseModal,
  setShowModal,
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

  // Logs area
  const logsLabel = "See full logs";
  const logsArrow = "→";
  const logsPlaceholder = "Streaming logs will appear here...";

  return {
    handleBubbleClick,
    agentImgSrc,
    agentTextColor,
    statusBubbleColor,
    statusLabel,
    logsLabel,
    logsArrow,
    logsPlaceholder,
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
