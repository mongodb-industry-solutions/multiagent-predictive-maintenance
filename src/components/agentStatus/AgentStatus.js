import React from "react";
import Button from "@leafygreen-ui/button";
import Modal from "@leafygreen-ui/modal";
import { useAgentStatus } from "./hooks";

export default function AgentStatus({
  isActive,
  onInfo,
  onCloseModal,
  showModal,
  modalContent,
  statusText = "Agent",
  infoButtonLabel = "Show agent info",
  infoButtonClass = "ml-2 !bg-black !text-white !rounded-full !p-2 !min-w-0 !h-8 !w-8 flex items-center justify-center",
  activeText = "Active",
  inactiveText = "Inactive",
}) {
  // The hook is here for future extensibility (e.g. local state, animation, etc)
  useAgentStatus();
  return (
    <div className="flex items-center gap-2 mt-1">
      <span
        className={
          isActive
            ? "text-green-600 font-medium animate-pulse"
            : "text-gray-400 font-medium"
        }
      >
        {statusText} {isActive ? activeText : inactiveText}
      </span>
      <Button
        aria-label={infoButtonLabel}
        className={infoButtonClass}
        onClick={onInfo}
        style={{ minWidth: 0 }}
      >
        <span className="material-icons">info</span>
      </Button>
      <Modal open={showModal} setOpen={onCloseModal} size="small">
        {modalContent}
      </Modal>
    </div>
  );
}
