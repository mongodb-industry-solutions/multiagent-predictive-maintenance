import React from "react";
import Image from "next/image";
import Modal from "@leafygreen-ui/modal";
import Icon from "@leafygreen-ui/icon";
import dynamic from "next/dynamic";
import { useAgentStatus } from "./hooks";
import AgentLogs from "@/components/agentLogs/AgentLogs";

const Spinner = dynamic(
  () => import("@leafygreen-ui/loading-indicator").then((mod) => mod.Spinner),
  { ssr: false }
);

export default function AgentStatus({
  isActive,
  modalContent,
  showModal,
  onCloseModal,
  setShowModal,
  logs = [], // Accept logs as prop
  threadId, // Optional, for AgentLogs if available
  onNewThread, // Optional, for AgentLogs if available
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
    latestToolLog,
    logsDrawerOpen,
    openLogsDrawer,
    closeLogsDrawer,
  } = useAgentStatus({ isActive, showModal, onCloseModal, setShowModal, logs });

  // Height offset for navbar (assume 64px)
  const navbarHeight = 64;

  return (
    <>
      <div className="flex items-center gap-4 mt-1 w-full">
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
        <div className="flex flex-col justify-between h-12 min-w-[140px] w-full">
          <div
            className="flex items-center text-xs text-gray-500 font-medium cursor-pointer select-none"
            onClick={openLogsDrawer}
            role="button"
            tabIndex={0}
            aria-label="See full logs"
            style={{ userSelect: "none" }}
          >
            {logsLabel}
            <span className="ml-1 text-base">{logsArrow}</span>
          </div>
          <div className="text-xs text-gray-400 mt-1 truncate max-w-[180px] w-full flex items-center">
            {latestToolLog ? (
              <>
                <span
                  className="mr-2 flex items-center justify-center"
                  style={{ width: 20, height: 20, minWidth: 20 }}
                >
                  {latestToolLog.isLoading ? (
                    <Spinner
                      displayOption="default-horizontal"
                      description=""
                    />
                  ) : (
                    <Icon
                      glyph="CheckmarkWithCircle"
                      fill="#22c55e"
                      size={16}
                    />
                  )}
                </span>
                <span className="text-gray-700">{latestToolLog.toolName}</span>
              </>
            ) : (
              logsPlaceholder
            )}
          </div>
        </div>
        {/* Modal */}
        <Modal open={showModal} setOpen={onCloseModal} size="small">
          {modalContent}
        </Modal>
      </div>
      {/* Logs Drawer and Overlay */}
      {/* Overlay (always rendered for correct animation layering) */}
      <div
        className={
          "fixed top-0 left-0 z-40 transition-opacity duration-200" +
          (logsDrawerOpen
            ? " opacity-100 pointer-events-auto"
            : " opacity-0 pointer-events-none")
        }
        style={{
          width: "70vw",
          height: `calc(100vh - ${navbarHeight}px)`,
          top: navbarHeight,
          left: 0,
          background: "rgba(0, 30, 43, 0.6)",
          backgroundColor: "rgba(0, 30, 43, 0.6)",
        }}
        onClick={closeLogsDrawer}
        aria-label="Close logs drawer"
      />
      {/* Drawer with slide-in animation (only rendered when open) */}
      {logsDrawerOpen && (
        <div
          className={
            "fixed top-0 right-0 z-50 h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out translate-x-0"
          }
          style={{
            width: "35vw",
            height: `calc(100vh - ${navbarHeight}px)`,
            top: navbarHeight,
            right: 0,
            minWidth: 340,
            maxWidth: 700,
          }}
        >
          {/* Close button (arrow) */}
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white border border-gray-300 rounded-full shadow p-2 flex items-center justify-center z-50"
            style={{ width: 36, height: 36 }}
            onClick={closeLogsDrawer}
            aria-label="Close logs drawer"
          >
            <Icon glyph="ChevronRight" size={24} />
          </button>
          {/* AgentLogs content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AgentLogs
              logs={logs}
              threadId={threadId}
              onNewThread={onNewThread}
            />
          </div>
        </div>
      )}
    </>
  );
}
