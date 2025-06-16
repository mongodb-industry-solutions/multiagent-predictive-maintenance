import React from "react";
import { useChatInput, useAgentOptions } from "./hooks";

export default function ChatInput({ agentId, setAgentId }) {
  const {
    input,
    setInput,
    response,
    logs,
    loading,
    error,
    sendMessage,
    threadId,
    resetConversation,
    agentId: selectedAgentId,
    setAgentId: handleAgentChange,
  } = useChatInput({ agentId, setAgentId });
  const { options: agentOptions, loading: loadingAgents } = useAgentOptions();

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="p-4 bg-white rounded shadow">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Select Agent</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
            value={selectedAgentId}
            onChange={(e) => {
              handleAgentChange(e.target.value);
              setAgentId(e.target.value);
            }}
            disabled={loading || loadingAgents}
          >
            {agentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
        </div>
        <input
          type="text"
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
          disabled={loading}
        />
        <div className="flex gap-2 mt-2">
          <button
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
          {threadId && (
            <button
              className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300"
              onClick={resetConversation}
              disabled={loading}
            >
              Reset Conversation
            </button>
          )}
        </div>
        {/* Response output below buttons, scrollable if long */}
        <div className="mt-4 bg-gray-100 rounded p-3 text-gray-800 whitespace-pre-line min-h-[3rem] max-h-48 overflow-auto border border-gray-200">
          {response}
        </div>
        {error && <div className="mt-2 text-red-600">{error}</div>}
        {threadId && (
          <>
            <div className="mt-2 text-xs text-gray-400">
              Thread ID: {threadId}
            </div>
            {/* Logs under thread ID */}
            <div className="mt-2 bg-gray-50 rounded p-2 text-xs text-gray-600 max-h-24 overflow-auto border border-gray-200">
              <div className="font-semibold text-gray-500 mb-1">Agent Logs</div>
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <div key={i}>
                    <span className="font-mono text-gray-700">
                      [{log.name}]
                    </span>{" "}
                    <span>{log.values?.name}</span>
                    {log.type === "error" && (
                      <span className="text-red-500 ml-2">(error)</span>
                    )}
                  </div>
                ))
              ) : (
                <span className="text-gray-300">No logs yet</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
