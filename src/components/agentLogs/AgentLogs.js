import React, { useRef } from "react";
import {
  Avatar,
  Body,
  Button,
  CodeBlock,
  CodeSnippet,
  CopyButton,
  Disclosure,
  DisclosureHeader,
  DisclosurePanel,
  Logo,
  ProgressCircle,
  Select,
  SelectItem,
} from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import { useAgentLogs } from "./hooks";

export default function AgentLogs({
  logs,
  threadId,
  onNewThread,
  allowNewThread = true,
}) {
  const { threadLabel, handleNewThread, uiLogs, logsEndRef } = useAgentLogs({
    logs,
    threadId,
    onNewThread,
  });
  const mockThreadId = useRef(`thread-${Date.now()}`);
  const lockedThreadId = threadId || mockThreadId.current;

  return (
    <div className="flex flex-col h-full w-full max-w-full">
      {/* Header: Thread dropdown and new thread button */}
      <div className="flex items-center gap-2 p-3 shrink-0">
        <Select
          label="Thread"
          placeholder={allowNewThread ? "New thread" : lockedThreadId}
          name="thread-select"
          selectedKey={allowNewThread ? threadId || "new" : lockedThreadId}
          isDisabled
          style={{ minWidth: 220, width: 260 }}
        >
          {allowNewThread ? (
            <>
              <SelectItem id="new">New thread</SelectItem>
              {threadId && (
                <SelectItem id={threadId}>{threadLabel}</SelectItem>
              )}
            </>
          ) : (
            <SelectItem id={lockedThreadId}>{lockedThreadId}</SelectItem>
          )}
        </Select>
        {allowNewThread && (
          <Button
            aria-label="Start new thread"
            onPress={handleNewThread}
            className="mt-5"
            variant="tertiary"
          >
            <Icon glyph="Plus" />
          </Button>
        )}
      </div>
      {/* Logs display */}
      <div
        className="min-h-0 flex-1 overflow-y-auto px-2 py-4"
        style={{ maxHeight: "calc(100vh - 200px)" }}
      >
        {uiLogs && uiLogs.length > 0 ? (
          <>
            {uiLogs.map((log, i) => {
              if (log.type === "user") {
                return (
                  <div key={i} className="mb-4 flex items-start justify-end gap-2">
                    <div className="agent-log-bubble agent-log-bubble-user">
                      <p className="text-base leading-6 text-[#112733]">
                        {log.content}
                      </p>
                    </div>
                    <span className="agent-log-mark bg-[#E8EDEB]">
                      <Avatar size={20} aria-label="User" />
                    </span>
                  </div>
                );
              }
              if (log.type === "ai") {
                return (
                  <div key={i} className="mb-4 flex items-start justify-start gap-2">
                    <span className="agent-log-mark border border-[#D8E3DF] bg-white">
                      <Logo
                        logo="MongoDBLogoMark"
                        size={20}
                        hasColor
                        aria-label="AI"
                      />
                    </span>
                    <div className="agent-log-bubble agent-log-bubble-agent">
                      <p className="text-base leading-6 text-[#112733]">
                        {log.content}
                      </p>
                    </div>
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
                  <div key={i} className="mb-4 flex items-start justify-start gap-2">
                    <span className="agent-log-mark bg-[#E8EDEB] text-[#5C6C75]">
                      <Icon glyph="Wrench" size={20} aria-label="Tool" />
                    </span>
                    <Disclosure defaultExpanded={false} className="agent-log-tool agent-log-bubble">
                      <DisclosureHeader>
                        <span className="flex items-center gap-2">
                          {formattedToolName}
                          {log.loading && (
                            <>
                              <ProgressCircle
                                size="small"
                                aria-label="Running"
                              />
                              <span>Running...</span>
                            </>
                          )}
                        </span>
                      </DisclosureHeader>
                      <DisclosurePanel>
                        {log.query && (
                          <div className="mb-2">
                            <Body className="font-semibold">Query:</Body>
                            <CodeBlock language="none">
                              <CodeSnippet>
                                {typeof log.query === "string"
                                  ? log.query
                                  : JSON.stringify(log.query, null, 2)}
                              </CodeSnippet>
                              <CopyButton
                                copyText={
                                  typeof log.query === "string"
                                    ? log.query
                                    : JSON.stringify(log.query, null, 2)
                                }
                              >
                                <Button aria-label="Copy code">
                                  <Icon glyph="Copy" />
                                </Button>
                              </CopyButton>
                            </CodeBlock>
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
                                : Object.keys(doc).length > 0),
                          ) && (
                            <div className="max-h-64 overflow-y-auto space-y-2">
                              <Body className="font-semibold mb-1 block">
                                Result:
                              </Body>
                              {log.documents.map((doc, idx) => {
                                const documentText =
                                  typeof doc === "string"
                                    ? doc
                                    : JSON.stringify(doc, null, 2);
                                return (
                                  <CodeBlock key={idx} language="json">
                                    <CodeSnippet>{documentText}</CodeSnippet>
                                    <CopyButton copyText={documentText}>
                                      <Button aria-label="Copy code">
                                        <Icon glyph="Copy" />
                                      </Button>
                                    </CopyButton>
                                  </CodeBlock>
                                );
                              })}
                            </div>
                          )}
                      </DisclosurePanel>
                    </Disclosure>
                  </div>
                );
              }
              if (log.type === "error") {
                return (
                  <div key={i} className="mb-4 flex items-start justify-start gap-2">
                    <span className="agent-log-mark bg-[#FFEAE5] text-[#B1371F]">
                      <Icon glyph="XWithCircle" size={20} aria-label="Error" />
                    </span>
                    <div className="agent-log-bubble agent-log-bubble-error">
                      <p className="text-sm leading-5 text-[#112733]">
                        {log.content}
                      </p>
                    </div>
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
