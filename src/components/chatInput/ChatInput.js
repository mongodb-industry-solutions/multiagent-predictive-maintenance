import React from "react";
import Image from "next/image";
import { useAgentGraph } from "./hooks";
import { Option, Select } from "@leafygreen-ui/select";
import TextArea from "@leafygreen-ui/text-area";
import Button from "@leafygreen-ui/button";

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
      <div className="p-4">
        <Select
          label="Agent"
          placeholder="Choose agent"
          name="agent-select"
          value={agentId}
          onChange={setAgentId}
          disabled={loading || loadingAgents}
          style={{ width: "100%" }}
        >
          {agentOptions.map((opt) => (
            <Option key={opt.id} value={opt.id}>
              {opt.name}
            </Option>
          ))}
        </Select>
      </div>
      {/* Graph and input split 50/50 */}
      <div className="flex-1 flex flex-col">
        {/* Graph (top 50%) */}
        <div className="flex-1 flex items-center justify-center bg-white relative overflow-hidden m-5">
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
                className="p-5"
              />
            </div>
          )}
        </div>
        {/* Input (bottom 50%) */}
        <div className="flex-1 flex flex-col p-4">
          <TextArea
            className="mb-2"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            resize="none"
            style={{ minHeight: 100 }}
          />
          <Button
            className="w-full mb-2"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            variant="primary"
          >
            {loading ? "Sending..." : "Send"}
          </Button>
          {error && <div className="mt-2 text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  );
}
