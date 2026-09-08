"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { Avatar } from "@leafygreen-ui/avatar";
import FactoryChart from "./FactoryChart";
import useFactoryChat, { formatToolName } from "./useFactoryChat";

const LOCAL_QUESTIONS = [
  {
    label: "Order progress",
    prompt: "Which orders are active, and how far along are they?",
    glyph: "Database",
  },
  {
    label: "Defects by station",
    prompt:
      "Chart defects by station and explain which process needs attention.",
    glyph: "Warning",
  },
  {
    label: "Yield and cycle time",
    prompt:
      "Show first-pass yield and the cycle-time trend for the active order.",
    glyph: "Charts",
  },
  {
    label: "Alerts and limits",
    prompt:
      "Summarize active quality alerts and compare readings with welding thresholds.",
    glyph: "Warning",
  },
  {
    label: "Unit traceability",
    prompt:
      "Trace the latest completed unit through its stations and highlight exceptions.",
    glyph: "Diagram",
  },
  {
    label: "Cell grades",
    prompt:
      "Show the cell-grade distribution for the active order as a chart.",
    glyph: "Charts",
  },
  {
    label: "Current station",
    prompt:
      "What station and batch is the active order currently processing?",
    glyph: "Diagram",
  },
];

const LEAFY_QUESTIONS = [
  {
    label: "Live order progress",
    prompt: "Which orders are active, and how far along are they right now?",
    glyph: "Database",
  },
  {
    label: "Live line status",
    prompt:
      "Which batch is in flight, what is its current stage, and what are the latest station results?",
    glyph: "Diagram",
  },
  {
    label: "Latest unit trace",
    prompt:
      "Trace the latest completed unit and summarize its measurements and quality checks.",
    glyph: "Diagram",
  },
  {
    label: "Recent quality checks",
    prompt:
      "Summarize pass/fail outcomes across the latest completed units and flag any exceptions.",
    glyph: "Warning",
  },
  {
    label: "Cycle-time trend",
    prompt:
      "Chart cycle times for the latest completed units and explain the variation.",
    glyph: "Charts",
  },
  {
    label: "Alerts and thresholds",
    prompt:
      "What alerts are active and which laser-welding thresholds are configured?",
    glyph: "Warning",
  },
  {
    label: "Live cell-grade mix",
    prompt:
      "Chart the live cell-grade mix from recent Cell Screening events, including in-process cells.",
    glyph: "Charts",
  },
];

function ChatAvatar({ role, large = false }) {
  const isUser = role === "user";
  if (!isUser) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center ${
          large ? "h-10 w-10" : "h-9 w-9"
        }`}
        aria-label="Factory Chat"
      >
        <Avatar
          name="Factory Chat"
          format="mongodb"
          size={large ? "large" : "default"}
        />
      </span>
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#112733] text-white ${
        large ? "h-10 w-10" : "h-9 w-9"
      }`}
      aria-label="You"
    >
      <Icon glyph="Person" size={large ? 18 : 15} />
    </span>
  );
}

function resultPreview(result) {
  if (!result) return "";
  const value = result.kind === "factory_data" ? result.data : result.data;
  try {
    const json = JSON.stringify(value, null, 2);
    return json.length > 14000
      ? `${json.slice(0, 14000)}\n… output truncated in the UI`
      : json;
  } catch {
    return String(value || "");
  }
}

function inputValue(value) {
  if (value && typeof value === "object") {
    const json = JSON.stringify(value);
    return json.length > 180 ? `${json.slice(0, 180)}…` : json;
  }
  return String(value);
}

function InlineText({ children }) {
  return String(children)
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="rounded bg-[#F1F5F3] px-1 py-0.5 text-xs text-[#112733]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
}

function tableCells(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function MessageContent({ content }) {
  const lines = String(content || "").split("\n");
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const next = lines[index + 1]?.trim() || "";

    if (
      line.startsWith("|") &&
      next.startsWith("|") &&
      /^(\|\s*:?-+:?\s*)+\|$/.test(next)
    ) {
      const headers = tableCells(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        rows.push(tableCells(lines[index].trim()));
        index += 1;
      }
      index -= 1;
      blocks.push(
        <div key={`table-${index}`} className="my-3 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-xs">
            <thead>
              <tr>
                {headers.map((header, cellIndex) => (
                  <th
                    key={`${header}-${cellIndex}`}
                    className="border-b border-[#C1C7C6] bg-[#F8FAF9] px-2.5 py-2 font-semibold text-[#112733]"
                  >
                    <InlineText>{header}</InlineText>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${cell}-${cellIndex}`}
                      className="border-b border-[#E8EDEB] px-2.5 py-2 align-top"
                    >
                      <InlineText>{cell}</InlineText>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      let cursor = index;
      while (cursor < lines.length && /^[-*]\s+/.test(lines[cursor].trim())) {
        items.push(lines[cursor].trim().replace(/^[-*]\s+/, ""));
        cursor += 1;
      }
      blocks.push(
        <ul key={`list-${index}`} className="my-2 list-disc space-y-1 pl-5">
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>
              <InlineText>{item}</InlineText>
            </li>
          ))}
        </ul>
      );
      index = cursor - 1;
      continue;
    }

    if (!line) {
      blocks.push(<div key={`space-${index}`} className="h-2" />);
      continue;
    }

    blocks.push(
      <p key={`line-${index}`}>
        <InlineText>{line.replace(/^#{1,3}\s+/, "")}</InlineText>
      </p>
    );
  }

  return <div className="grid gap-1">{blocks}</div>;
}

function EvidenceCard({ entry }) {
  const isChart = entry.result?.kind === "chart";
  const sourceLabel =
    entry.result?.source === "local"
      ? "Local simulation snapshot"
      : entry.result?.source === "leafy"
        ? "UNS"
        : isChart
          ? "Derived visualization"
          : "Factory source";

  return (
    <div className="ml-11 max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-[#D8E3DF] bg-[#F8FAF9]">
        <div className="flex flex-wrap items-center gap-2 px-3.5 py-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#00684A] shadow-sm">
            <Icon glyph={isChart ? "Charts" : "Wrench"} size={15} />
          </span>
          <span className="min-w-0 flex-1 text-sm font-medium text-[#112733]">
            {formatToolName(entry.toolName)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-[#5C6C75]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                entry.loading ? "animate-pulse bg-[#DB6C00]" : "bg-[#00A35C]"
              }`}
            />
            {entry.loading ? "Checking" : sourceLabel}
          </span>
        </div>
        {Object.keys(entry.input || {}).length > 0 && (
          <div className="border-t border-[#E8EDEB] px-3.5 py-2 text-xs text-[#5C6C75]">
            {Object.entries(entry.input)
              .map(
                ([key, value]) =>
                  `${key.replaceAll("_", " ")}: ${inputValue(value)}`
              )
              .join(" · ")}
          </div>
        )}
        {!entry.loading && entry.result && !isChart && (
          <details className="border-t border-[#E8EDEB]">
            <summary className="cursor-pointer px-3.5 py-2.5 text-xs font-medium text-[#00684A] hover:bg-white">
              Inspect JSON evidence
            </summary>
            <pre className="max-h-64 overflow-auto border-t border-[#E8EDEB] bg-white p-3.5 text-[11px] leading-5 text-[#263238]">
              {resultPreview(entry.result)}
            </pre>
          </details>
        )}
      </div>
      {!entry.loading && isChart && (
        <FactoryChart chart={entry.result.chart} />
      )}
    </div>
  );
}

function EmptyState({ onAsk, questions }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-5 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3FCF7] text-[#00684A]">
        <Icon glyph="Wizard" size={28} />
      </span>
      <h2 className="mt-5 text-2xl font-semibold text-[#112733]">
        Talk to the factory
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#5C6C75]">
        Ask about active production, quality, process measurements, alerts, or
        traceability. Factory Chat checks the current UNS source before it
        answers.
      </p>
      <div className="mt-7 grid w-full gap-2 sm:grid-cols-2">
        {questions.slice(0, 4).map((question) => (
          <button
            key={question.label}
            type="button"
            onClick={() => onAsk(question.prompt)}
            className="rounded-xl border border-[#D8E3DF] bg-white p-3 text-left text-sm leading-5 text-[#3D4F58] transition hover:border-[#00A35C] hover:bg-[#F8FAF9]"
          >
            {question.prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatThreadDate(value, threadId) {
  const timestamp = String(threadId || "").split(":").at(-1);
  const date = value ? new Date(value) : new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConversationPicker({
  threads,
  currentThreadId,
  loading,
  onNew,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (
        event.type === "mousedown" &&
        pickerRef.current?.contains(event.target)
      ) {
        return;
      }
      if (event.type === "keydown" && event.key !== "Escape") return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={pickerRef} className="relative z-40">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={loading}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#C1C7C6] px-3 text-xs font-medium text-[#3D4F58] hover:bg-[#F1F5F3] disabled:opacity-50"
      >
        <Icon glyph="Clock" size={14} />
        Conversations
        <Icon glyph={open ? "ChevronUp" : "ChevronDown"} size={12} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#D8E3DF] bg-white shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onNew();
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 border-b border-[#E8EDEB] px-4 py-3 text-left text-sm font-medium text-[#00684A] hover:bg-[#F1F5F3]"
          >
            <Icon glyph="Plus" size={15} />
            Start a new session
          </button>
          <div className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5C6C75]">
            Recent conversations
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {threads.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-[#889397]">
                {loading ? "Loading conversations…" : "No saved sessions yet"}
              </p>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.threadId}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    onSelect(thread.threadId);
                    setOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2.5 text-left hover:bg-[#F1F5F3] ${
                    currentThreadId === thread.threadId ? "bg-[#E3FCF7]" : ""
                  }`}
                >
                  <span className="block truncate text-sm font-medium text-[#112733]">
                    {thread.title}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-3 text-[11px] text-[#889397]">
                    <span>{thread.messageCount} messages</span>
                    <span>
                      {formatThreadDate(thread.updatedAt, thread.threadId)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FactoryChat() {
  const {
    input,
    setInput,
    entries,
    loading,
    historyLoading,
    error,
    threadId,
    recentThreads,
    source,
    processingLabel,
    sendMessage,
    resetConversation,
    openConversation,
  } = useFactoryChat();
  const endRef = useRef(null);
  const questions = source === "local" ? LOCAL_QUESTIONS : LEAFY_QUESTIONS;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [entries, loading]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <div className="grid h-full min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm">
          <header className="flex flex-wrap items-center gap-3 border-b border-[#E8EDEB] px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <ChatAvatar role="assistant" large />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#112733]">
                  UNS Factory Chat
                </p>
                <p
                  className="flex items-center gap-1.5 truncate text-xs text-[#5C6C75]"
                  aria-live="polite"
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      loading
                        ? "animate-pulse bg-[#DB6C00]"
                        : "bg-[#00A35C]"
                    }`}
                  />
                  {processingLabel}
                </p>
              </div>
            </div>
            <ConversationPicker
              threads={recentThreads}
              currentThreadId={threadId}
              loading={loading || historyLoading}
              onNew={resetConversation}
              onSelect={openConversation}
            />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#FBFDFC] p-4 sm:p-5">
            {entries.length === 0 ? (
              <EmptyState onAsk={sendMessage} questions={questions} />
            ) : (
              <div className="mx-auto grid max-w-4xl gap-4">
                {entries.map((entry) => {
                  if (entry.type === "tool") {
                    return <EvidenceCard key={entry.id} entry={entry} />;
                  }
                  if (entry.type === "user") {
                    return (
                      <div
                        key={entry.id}
                        className="flex justify-end gap-2.5"
                      >
                        <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[#00684A] px-4 py-3 text-sm leading-6 text-white">
                          {entry.content}
                        </div>
                        <ChatAvatar role="user" />
                      </div>
                    );
                  }
                  if (entry.type === "assistant") {
                    return (
                      <div
                        key={entry.id}
                        className="flex items-start gap-2.5"
                      >
                        <ChatAvatar role="assistant" />
                        <div className="max-w-[86%] whitespace-pre-wrap rounded-2xl rounded-tl-md border border-[#D8E3DF] bg-white px-4 py-3 text-sm leading-6 text-[#263238] shadow-sm">
                          <MessageContent content={entry.content} />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={entry.id}
                      className="ml-11 rounded-xl border border-[#FFCDC7] bg-[#FFEAE5] px-4 py-3 text-sm text-[#8C210F]"
                    >
                      {entry.content}
                    </div>
                  );
                })}
                {loading && !entries.some((entry) => entry.loading) && (
                  <div className="ml-11 flex items-center gap-2 text-xs text-[#5C6C75]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#00A35C]" />
                    {processingLabel}
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="border-t border-[#E8EDEB] bg-white p-3 sm:p-4">
            <div className="mx-auto max-w-4xl">
              <div className="flex items-end gap-2 rounded-2xl border border-[#C1C7C6] bg-white p-2 shadow-sm focus-within:border-[#00A35C] focus-within:ring-2 focus-within:ring-[#E3FCF7]">
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={2}
                  aria-label="Ask Factory Chat"
                  placeholder="Ask about production, quality, alerts, or traceability…"
                  className="max-h-32 min-h-[48px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm leading-5 text-[#112733] outline-none placeholder:text-[#889397] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00684A] text-white hover:bg-[#00513A] disabled:cursor-not-allowed disabled:bg-[#C1C7C6]"
                >
                  <Icon glyph="ArrowRight" size={18} />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] text-[#889397]">
                <span>Enter to send · Shift + Enter for a new line</span>
                {threadId && <span>Session checkpointed</span>}
              </div>
              {error && (
                <p className="mt-2 text-xs text-[#8C210F]">{error}</p>
              )}
            </div>
          </div>
        </section>

        <aside className="grid h-full min-h-0 overflow-hidden">
          <section className="h-full rounded-2xl border border-[#D8E3DF] bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#00684A]">
              Try asking
            </p>
            <div className="mt-2 grid gap-0.5">
              {questions.map((question) => (
                <button
                  key={question.label}
                  type="button"
                  onClick={() => sendMessage(question.prompt)}
                  disabled={loading}
                  className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left hover:border-[#D8E3DF] hover:bg-[#F8FAF9] disabled:opacity-50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#E3FCF7] text-[#00684A]">
                    <Icon glyph={question.glyph} size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[#112733]">
                      {question.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-4 text-[#5C6C75]">
                      {question.prompt}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
