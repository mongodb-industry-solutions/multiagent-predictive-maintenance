"use client";
import ChatInput from "../components/chatInput/ChatInput";
import AgentGraph from "../components/agentGraph/AgentGraph";
import { useState } from "react";

export default function Home() {
  const [agentId, setAgentId] = useState("test");

  return (
    <main className="min-h-screen bg-gray-50 flex flex-row items-stretch">
      <div className="w-1/2 h-screen">
        <AgentGraph agentId={agentId} />
      </div>
      <div className="w-1/2 h-screen flex items-center justify-center">
        <ChatInput agentId={agentId} setAgentId={setAgentId} />
      </div>
    </main>
  );
}
