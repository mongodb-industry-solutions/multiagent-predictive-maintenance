"use client";
import ChatInput from "@/components/chatInput/ChatInput";
import AgentLogs from "@/components/agentLogs/AgentLogs";
import { useAgentSandbox } from "./hooks";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";

export default function Home() {
  const {
    agentId,
    setAgentId,
    input,
    setInput,
    logs,
    loading,
    error,
    sendMessage,
    threadId,
    resetConversation,
    agentOptions,
    loadingAgents,
  } = useAgentSandbox();

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <div>
        <main className="min-h-screen flex flex-row items-stretch mt-3 w-full overflow-hidden">
          <div
            className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden"
            style={{ flexBasis: "50%", maxWidth: "50%" }}
          >
            <ChatInput
              agentId={agentId}
              setAgentId={setAgentId}
              input={input}
              setInput={setInput}
              loading={loading}
              error={error}
              sendMessage={sendMessage}
              agentOptions={agentOptions}
              loadingAgents={loadingAgents}
            />
          </div>
          <div
            className="flex-1 min-w-0 h-screen flex flex-col overflow-hidden border-l border-gray-200"
            style={{ flexBasis: "50%", maxWidth: "50%" }}
          >
            <AgentLogs
              logs={logs}
              threadId={threadId}
              onNewThread={resetConversation}
            />
          </div>
        </main>
      </div>
    </LeafyGreenProvider>
  );
}
