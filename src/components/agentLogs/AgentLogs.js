import React from "react";
import { Body } from "@leafygreen-ui/typography";
import Card from "@leafygreen-ui/card";
import ExpandableCard from "@leafygreen-ui/expandable-card";
import { Avatar } from "@leafygreen-ui/avatar";
import dynamic from "next/dynamic";
import Code from "@leafygreen-ui/code";
import { useAgentLogs } from "./hooks";
import { Option, Select } from "@leafygreen-ui/select";
import Icon from "@leafygreen-ui/icon";
import IconButton from "@leafygreen-ui/icon-button";

const Spinner = dynamic(
  () => import("@leafygreen-ui/loading-indicator").then((mod) => mod.Spinner),
  { ssr: false }
);

export default function AgentLogs({ logs, threadId, onNewThread }) {
  const { threadLabel, handleNewThread, uiLogs, logsEndRef } = useAgentLogs({
    logs,
    threadId,
    onNewThread,
  });

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Header: Thread dropdown and new thread button */}
      <div className="flex items-center gap-2 p-3 shrink-0">
        <Select
          label="Thread"
          placeholder="New thread"
          name="thread-select"
          value={threadId || "new"}
          dropdownWidthBasis="option"
          disabled
          style={{ minWidth: 220, width: 260 }}
        >
          <Option value="new">New thread</Option>
          {threadId && <Option value={threadId}>{threadLabel}</Option>}
        </Select>
        <IconButton
          aria-label="Start new thread"
          onClick={handleNewThread}
          className="mt-5"
        >
          <Icon glyph="Plus" />
        </IconButton>
      </div>
      {/* Logs display */}
      <div
        className="flex-1 min-h-0 overflow-y-auto p-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {uiLogs && uiLogs.length > 0 ? (
          <>
            {uiLogs.map((log, i) => {
              if (log.type === "user") {
                return (
                  <div key={i} className="flex justify-end mb-4">
                    <Card className="bg-[#E3FCF7] max-w-lg w-fit mr-2 p-4 shadow-md">
                      <Body>{log.content}</Body>
                    </Card>
                    <div className="flex flex-col justify-end">
                      <Avatar name="User" size="large" glyph="Person" />
                    </div>
                  </div>
                );
              }
              if (log.type === "ai") {
                return (
                  <div key={i} className="flex justify-start mb-4">
                    <div className="flex flex-col justify-end mr-2">
                      <Avatar name="AI" format="mongodb" size="large" />
                    </div>
                    <Card className="bg-white max-w-lg w-fit p-4 shadow-md">
                      <Body>{log.content}</Body>
                    </Card>
                  </div>
                );
              }
              if (log.type === "tool") {
                // Format tool name: replace _ with space and capitalize first letter
                const formattedToolName = log.toolName
                  ? log.toolName
                      .replace(/_/g, " ")
                      .replace(/^\w/, (c) => c.toUpperCase())
                  : "";
                return (
                  <div key={i} className="flex justify-start mb-4">
                    <div className="flex flex-col justify-end mr-2">
                      <Avatar name="Tool" glyph="Wrench" size="large" />
                    </div>
                    <ExpandableCard
                      className="w-full"
                      title={
                        <span className="flex items-center gap-2">
                          {formattedToolName}
                          {log.loading && (
                            <Spinner
                              displayOption="default-horizontal"
                              description="Running..."
                            />
                          )}
                        </span>
                      }
                    >
                      <>
                        {log.query && (
                          <div className="mb-2">
                            <Body className="font-semibold">Query:</Body>
                            <Code language={"none"}>{log.query}</Code>
                          </div>
                        )}
                        {log.documents &&
                          Array.isArray(log.documents) &&
                          log.documents.length > 0 &&
                          log.documents.some(
                            (doc) =>
                              doc &&
                              (typeof doc === "string"
                                ? doc.trim() !== ""
                                : Object.keys(doc).length > 0)
                          ) && (
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              <Body className="font-semibold mb-1 block">
                                Result:
                              </Body>
                              {log.documents.map((doc, idx) => (
                                <Code key={idx} language="json">
                                  {typeof doc === "string"
                                    ? doc
                                    : JSON.stringify(doc, null, 2)}
                                </Code>
                              ))}
                            </div>
                          )}
                      </>
                    </ExpandableCard>
                  </div>
                );
              }
              if (log.type === "error") {
                return (
                  <div key={i} className="flex justify-start mb-4">
                    <div className="flex flex-col justify-end mr-2">
                      <Avatar name="Error" glyph="Error" size="large" />
                    </div>
                    <Card className="bg-[#FFEAE5] w-fit p-4 shadow-md">
                      <Body>{log.content}</Body>
                    </Card>
                  </div>
                );
              }
              return null;
            })}
            <div ref={logsEndRef} />
          </>
        ) : (
          <span className="text-gray-300">No logs yet</span>
        )}
      </div>
    </div>
  );
}
