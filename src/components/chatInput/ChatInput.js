import React from "react";
import Image from "next/image";
import { useAgentGraph } from "./hooks";

export default function ChatInput({
  agentId,
  setAgentId,
  input,
  setInput,
  loading,
  error,
  sendMessage,
  agentOptions,
  loadingAgents,
}) {
  const { imageUrl, graphLoading, graphError } = useAgentGraph(agentId);

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Agent selector */}
      <div className="p-4 border-b border-gray-100">
        <label className="block text-sm font-medium mb-1">Select Agent</label>
        <select
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          disabled={loading || loadingAgents}
        >
          {agentOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </div>
      {/* Graph and input split 50/50 */}
      <div className="flex-1 flex flex-col">
        {/* Graph (top 50%) */}
        <div className="flex-1 flex items-center justify-center border-b border-gray-100 bg-white relative overflow-hidden">
          {graphLoading && (
            <div className="text-gray-400">Loading graph...</div>
          )}
          {graphError && (
            <div className="text-red-500 text-sm">{graphError}</div>
          )}
          {imageUrl && (
            <div className="relative w-full h-full max-h-full flex items-center justify-center">
              <Image
                src={imageUrl}
                alt="Agent Graph"
                fill
                style={{ objectFit: "contain", width: "100%", height: "100%" }}
                unoptimized
                sizes="100vw"
                priority
              />
            </div>
          )}
        </div>
        {/* Input (bottom 50%) */}
        <div className="flex-1 flex flex-col p-4">
          <textarea
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400 resize-none min-h-[60px] mb-2"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 mb-2"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            {loading ? "Sending..." : "Send"}
          </button>
          {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
}
