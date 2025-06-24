import React from "react";
import Image from "next/image";
import Modal from "@leafygreen-ui/modal";
import { useAgentStatus } from "./hooks";

export default function AgentStatus({
  isActive,
  modalContent,
  showModal,
  onCloseModal,
  setShowModal,
}) {
  const {
    handleBubbleClick,
    agentImgSrc,
    agentTextColor,
    statusBubbleColor,
    statusLabel,
    logsLabel,
    logsArrow,
    logsPlaceholder,
  } = useAgentStatus({ isActive, showModal, onCloseModal, setShowModal });

  return (
    <div className="flex items-center gap-4 mt-1">
      {/* Agent Bubble (acts as button) */}
      <button
        className={`relative flex items-center rounded-full px-4 py-2 shadow-md transition-all duration-200 focus:outline-none cursor-pointer group border border-gray-200 bg-white ${
          isActive ? "" : "hover:shadow-lg"
        }`}
        onClick={handleBubbleClick}
        type="button"
        aria-label="Show agent info"
        tabIndex={0}
      >
        {/* Pulsing Glow Effect */}
        {isActive && (
          <span className="absolute inset-0 rounded-full pointer-events-none animate-agent-glow"></span>
        )}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white mr-5">
          <Image
            src={agentImgSrc}
            alt="Agent"
            width={56}
            height={56}
            className="w-14 h-14 object-contain"
            draggable={false}
            priority
          />
        </div>
        <div className="flex flex-col justify-center min-w-[100px] text-left">
          <span
            className={`text-base font-semibold ${agentTextColor} text-left`}
          >
            Leafy Agent
          </span>
          <div className="flex items-center mt-1 text-left">
            <span
              className={`w-3 h-3 rounded-full mr-2 ${statusBubbleColor} border border-gray-300`}
            ></span>
            <span className={`text-xs font-medium ${agentTextColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </button>
      {/* Right Area: Logs and Placeholder */}
      <div className="flex flex-col justify-between h-12 min-w-[140px]">
        <div className="flex items-center text-xs text-gray-500 font-medium cursor-pointer select-none">
          {logsLabel}
          <span className="ml-1 text-base">{logsArrow}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1 truncate max-w-[120px]">
          {logsPlaceholder}
        </div>
      </div>
      {/* Modal */}
      <Modal open={showModal} setOpen={onCloseModal} size="small">
        {modalContent}
      </Modal>
    </div>
  );
}
