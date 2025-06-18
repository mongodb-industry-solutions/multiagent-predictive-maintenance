import React from "react";
import { useAgentLogs } from "./hooks";

export default function AgentLogs({ logs, threadId, onNewThread }) {
  const { threadLabel, handleNewThread } = useAgentLogs({
    logs,
    threadId,
    onNewThread,
  });

  return (
    <div className="flex flex-col h-full w-full max-w-full border-l border-gray-200">
      {/* Header: Thread dropdown and new thread button */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100">
        <select
          className="text-sm font-medium bg-gray-50 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring"
          value={threadId || "new"}
          readOnly
        >
          <option value="new">new thread</option>
          {threadId && <option value={threadId}>{threadLabel}</option>}
        </select>
        <button
          className="ml-1 px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-lg font-bold"
          title="Start new thread"
          onClick={handleNewThread}
        >
          +
        </button>
      </div>
      {/* Logs display */}
      <div className="flex-1 overflow-auto p-4 text-xs text-gray-800">
        {logs && logs.length > 0 ? (
          logs.map((log, i) => {
            if (log.type === "user") {
              return (
                <div key={i} className="mb-2 text-blue-700">
                  <span className="font-semibold">You:</span>{" "}
                  {log.values?.content || log.values?.name}
                </div>
              );
            }
            if (log.type === "final") {
              return (
                <div key={i} className="mb-2 text-green-700">
                  <span className="font-semibold">Agent:</span>{" "}
                  {log.values?.content || log.values?.name}
                </div>
              );
            }
            if (log.type === "tool_start") {
              return (
                <div key={i} className="mb-2 text-purple-700">
                  <span className="font-semibold">Tool Start:</span> {log.name}{" "}
                  {log.values?.name && (
                    <span className="text-gray-600">({log.values.name})</span>
                  )}
                </div>
              );
            }
            if (log.type === "tool_end") {
              return (
                <div key={i} className="mb-2 text-purple-500">
                  <span className="font-semibold">Tool End:</span> {log.name}{" "}
                  {log.values?.name && (
                    <span className="text-gray-600">({log.values.name})</span>
                  )}
                </div>
              );
            }
            if (log.type === "update") {
              // Show all update events (streamed logs, tool calls, etc)
              return (
                <div key={i} className="mb-2 text-gray-700">
                  <span className="font-mono">[{log.name}]</span>{" "}
                  {log.values?.name ||
                    log.values?.content ||
                    JSON.stringify(log.values)}
                </div>
              );
            }
            if (log.type === "error") {
              return (
                <div key={i} className="mb-2 text-red-500">
                  <span className="font-semibold">Error:</span>{" "}
                  {log.values?.name || "Error"}
                </div>
              );
            }
            return null;
          })
        ) : (
          <span className="text-gray-300">No logs yet</span>
        )}
      </div>
    </div>
  );
}
