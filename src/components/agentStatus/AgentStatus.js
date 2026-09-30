import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Body, ProgressCircle } from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import { useAgentStatus } from "./hooks";
import AgentLogs from "@/components/agentLogs/AgentLogs";

export default function AgentStatus({
  isActive,
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

  const [navbarHeight, setNavbarHeight] = useState(64);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const nav = document.querySelector("nav");
    if (!nav) return undefined;
    const measure = () => {
      setNavbarHeight(nav.getBoundingClientRect().height);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="flex w-full items-stretch gap-4 mt-1">
        {/* Left: Agent Bubble (fixed width) */}
        <div className="flex items-center justify-start h-full">
          <button
            className={`relative flex items-center w-full h-full rounded-full px-3 py-2 shadow-md transition-all duration-200 focus:outline-none group border border-gray-200 bg-white`}
            // Remove onClick, aria-label, tabIndex to disable modal
            type="button"
            disabled
            style={{ height: "76px", width: "100%", cursor: "default" }}
          >
            {/* Pulsing Glow Effect */}
            {showGlow && (
              <span className="absolute inset-0 rounded-full pointer-events-none animate-agent-glow"></span>
            )}
            <div className="mr-3 flex h-16 w-16 items-center justify-center rounded-full bg-white">
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
                <span className={`text-sm font-medium ${agentTextColor}`}>
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
                    <ProgressCircle size="small" aria-label="Loading" />
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
            <Body elementType="span" className="text-gray-700 font-medium">
              See full logs
            </Body>
            <span className="ml-2">
              <Icon glyph="ArrowRight" size={18} />
            </span>
          </div>
        </div>
      </div>
      {/* Logs Drawer and Overlay, portaled so they sit flush under the navbar. */}
      {mounted &&
        createPortal(
          <>
            <div
              className={
                "fixed left-0 z-40 transition-opacity duration-200" +
                (logsDrawerOpen
                  ? " opacity-100 pointer-events-auto"
                  : " opacity-0 pointer-events-none")
              }
              style={{
                top: navbarHeight,
                left: 0,
                width: "100vw",
                height: `calc(100dvh - ${navbarHeight}px)`,
                background: "rgba(0, 30, 43, 0.6)",
              }}
              onClick={closeLogsDrawer}
              aria-label="Close logs drawer"
            />
            {logsDrawerOpen && (
              <div
                className="fixed right-0 z-50 flex flex-col bg-white shadow-[-16px_0_32px_rgba(0,30,43,0.18)]"
                style={{
                  top: navbarHeight,
                  right: 0,
                  width: "40vw",
                  height: `calc(100dvh - ${navbarHeight}px)`,
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
              allowNewThread={false}
            />
          </div>
              </div>
            )}
          </>,
          document.body
        )}
    </>
  );
}
