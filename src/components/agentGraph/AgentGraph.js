import React from "react";
import { useAgentGraph } from "./hooks";

export default function AgentGraph({ agentId, compiled }) {
  const { imageUrl, loading, error } = useAgentGraph(agentId, compiled);

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 border-r border-gray-200">
      {loading && <div className="text-gray-400">Loading graph...</div>}
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Agent Graph"
          className="max-w-full max-h-[80vh] object-contain"
        />
      )}
    </div>
  );
}
