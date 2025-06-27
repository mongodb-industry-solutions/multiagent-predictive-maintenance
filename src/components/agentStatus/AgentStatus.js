import React from "react";
import Image from "next/image";
import Modal from "@leafygreen-ui/modal";
import Icon from "@leafygreen-ui/icon";
import dynamic from "next/dynamic";
import { Body } from "@leafygreen-ui/typography";
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
  logs = [],
  threadId,
  onNewThread,
}) {
  const {
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
  } = useAgentStatus({ isActive, showModal, onCloseModal, setShowModal, logs });

  // Height offset for navbar (assume 64px)
  const navbarHeight = 64;

  return (
    <>
      <div className="flex w-full items-stretch gap-4 mt-1">
        {/* Left: Agent Bubble (fixed width) */}
        <div className="flex items-center justify-start h-full">
          <button
            className={`relative flex items-center w-full h-full rounded-full px-3 py-5 shadow-md transition-all duration-200 focus:outline-none group border border-gray-200 bg-white`}
            // Remove onClick, aria-label, tabIndex to disable modal
            type="button"
            disabled
            style={{ height: "96px", width: "100%", cursor: "default" }}
          >
            {/* Pulsing Glow Effect */}
            {showGlow && (
              <span className="absolute inset-0 rounded-full pointer-events-none animate-agent-glow"></span>
            )}
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-white mr-4">
              <Image
                src={agentImgSrc}
                alt="Agent"
                width={80}
                height={80}
                className="w-16 h-16 object-contain"
                draggable={false}
                priority
              />
            </div>
            <div className="flex flex-col justify-center min-w-[80px] text-left">
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
        </div>
        {/* Center: Logs (flexible) */}
        <div
          className="flex flex-col flex-1 justify-center min-w-0"
          style={{ height: "120px", alignItems: "flex-start" }}
        >
          <div
            className="flex flex-col gap-1 overflow-y-auto w-full h-full pr-2 pl-3 agent-logs-scrollbar"
            style={{
              scrollBehavior: "smooth",
              height: "120px",
              alignItems: "flex-start",
            }}
          >
            {agentLogs.map((log, idx) => (
              <div key={log.key || idx} className="flex items-center gap-2">
                <span
                  className="flex items-center justify-center"
                  style={{ width: 22, height: 22, minWidth: 22 }}
                >
                  {log.loading ? (
                    <Spinner
                      displayOption="default-horizontal"
                      description=""
                    />
                  ) : (
                    <Icon
                      glyph="CheckmarkWithCircle"
                      fill="#22c55e"
                      size={20}
                    />
                  )}
                </span>
                <span className="text-gray-700 text-sm font-medium truncate max-w-xs">
                  {log.toolName
                    .replace(/_/g, " ")
                    .replace(/^\w/, (c) => c.toUpperCase())}
                </span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
        {/* Right: See full logs (fixed width) */}
        <div
          className="flex flex-col justify-center items-end pl-4"
          style={{
            width: "180px",
            maxWidth: "130px",
            flex: "0 0 auto",
          }}
        >
          <div
            className="flex items-center cursor-pointer select-none"
            onClick={openLogsDrawer}
            role="button"
            tabIndex={0}
            aria-label="See full logs"
            style={{ userSelect: "none" }}
          >
            <Body
              as="span"
              baseFontSize={16}
              className="text-gray-700 font-medium"
            >
              See full logs
            </Body>
            <span className="ml-2">
              <Icon glyph="ArrowRight" size={18} />
            </span>
          </div>
        </div>
        {/* Modal (disabled) */}
        {/* <Modal open={showModal} setOpen={onCloseModal} size="small">
          {modalContent}
        </Modal> */}
      </div>
      {/* Logs Drawer and Overlay */}
      {/* Overlay (fills entire width, always behind the right drawer) */}
      <div
        className={
          "fixed top-0 left-0 z-40 transition-opacity duration-200" +
          (logsDrawerOpen
            ? " opacity-100 pointer-events-auto"
            : " opacity-0 pointer-events-none")
        }
        style={{
          width: "100vw",
          height: `calc(100vh - ${navbarHeight}px)`,
          top: navbarHeight,
          left: 0,
          background: "rgba(0, 30, 43, 0.6)",
          backgroundColor: "rgba(0, 30, 43, 0.6)",
        }}
        onClick={closeLogsDrawer}
        aria-label="Close logs drawer"
      />
      {logsDrawerOpen && (
        <div
          className={
            "fixed top-0 right-0 z-50 h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out translate-x-0"
          }
          style={{
            width: "40vw",
            height: `calc(100vh - ${navbarHeight}px)`,
            top: navbarHeight,
            right: 0,
            minWidth: 400,
            maxWidth: 800,
          }}
        >
          <button
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white border border-gray-300 rounded-full shadow p-2 flex items-center justify-center z-50"
            style={{ width: 36, height: 36 }}
            onClick={closeLogsDrawer}
            aria-label="Close logs drawer"
          >
            <Icon glyph="ChevronRight" size={24} />
          </button>
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
