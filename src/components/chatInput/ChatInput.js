import React from "react";
import { useAgentGraph } from "./hooks";
import { Button, Select, SelectItem, TextArea } from "@via-ds/components";

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
          selectedKey={agentId || null}
          onSelectionChange={(key) => setAgentId(String(key))}
          isDisabled={loading || loadingAgents}
          style={{ width: "100%" }}
        >
          {agentOptions.map((opt) => (
            <SelectItem key={opt.id} id={opt.id} textValue={opt.name}>
              {opt.name}
            </SelectItem>
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
              <img
                src={imageUrl}
                alt="Agent Graph"
                style={{
                  objectFit: "contain",
                  width: "80%",
                  height: "80%",
                  padding: 20,
                }}
              />
            </div>
          )}
        </div>
        {/* Input (bottom 50%) */}
        <div className="flex-1 flex flex-col p-4">
          <TextArea
            className="mb-2"
            aria-label="Chat input"
            placeholder="Type your message..."
            value={input}
            onChange={setInput}
            isDisabled={loading}
            style={{ minHeight: 100 }}
          />
          <Button
            className="w-full mb-2"
            onPress={sendMessage}
            isDisabled={loading || !input.trim()}
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
