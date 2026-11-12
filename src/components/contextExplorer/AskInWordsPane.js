"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@via-ds/icons";

function InlineMarkdown({ text }) {
  return String(text || "")
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-[#112733]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="rounded bg-white/90 px-1.5 py-0.5 font-mono text-sm text-[#00684A]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
}

function splitTableCells(rowLine) {
  return rowLine
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function AnswerMarkdown({ text }) {
  const lines = String(text || "").split("\n");
  const elements = [];

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    const nextTrimmed = lines[i + 1]?.trim() || "";
    if (!trimmed) continue;

    if (
      trimmed.startsWith("|") &&
      nextTrimmed.startsWith("|") &&
      /^\|?\s*:?-{2,}/.test(nextTrimmed)
    ) {
      const headers = splitTableCells(trimmed);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitTableCells(lines[i]));
        i += 1;
      }
      i -= 1;
      elements.push(
        <div key={`tbl-${i}`} className="my-2 overflow-x-auto rounded-lg border border-[#B8E4D2] bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#D8E3DF] bg-[#F8FAF9]">
                {headers.map((h, hIdx) => (
                  <th
                    key={hIdx}
                    className="px-3 py-2 font-semibold whitespace-nowrap text-[#112733]"
                  >
                    <InlineMarkdown text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, rIdx) => (
                <tr key={rIdx} className="border-b border-[#E8EDEB] last:border-b-0">
                  {r.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-1.5 font-mono text-[#112733]">
                      <InlineMarkdown text={cell} />
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

    if (/^[-*•]\s+/.test(trimmed)) {
      const bullets = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        bullets.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i += 1;
      }
      i -= 1;
      elements.push(
        <ul key={`ul-${i}`} className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-[#112733]">
          {bullets.map((b, bIdx) => (
            <li key={bIdx}>
              <InlineMarkdown text={b} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="text-sm leading-6 text-[#112733]">
        <InlineMarkdown text={trimmed.replace(/^#{1,3}\s+/, "")} />
      </p>
    );
  }

  return <div className="space-y-2">{elements}</div>;
}

function prettyJson(val) {
  if (typeof val === "string") {
    try {
      return JSON.stringify(JSON.parse(val), null, 2);
    } catch {
      return val;
    }
  }
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

export default function AskInWordsPane({ prompts }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [question, setQuestion] = useState(prompts[0]?.question || "");
  const [events, setEvents] = useState([]);
  const [running, setRunning] = useState(false);
  const logEndRef = useRef(null);

  useEffect(() => {
    setQuestion(prompts[selectedIdx]?.question || "");
  }, [prompts, selectedIdx]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [events, running]);

  const handleSelectPrompt = (idx) => {
    if (running) return;
    setSelectedIdx(idx);
    setQuestion(prompts[idx]?.question || "");
    setEvents([]);
  };

  const handleSend = async () => {
    const trimmed = question.trim();
    if (!trimmed || running) return;
    setRunning(true);
    setEvents([]);

    try {
      const res = await fetch("/api/connected-factory/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Agent endpoint returned HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            setEvents((prev) => [...prev, parsed]);
          } catch {
            // ignore malformed chunk
          }
        }
      }

      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          setEvents((prev) => [...prev, parsed]);
        } catch {
          // ignore
        }
      }
    } catch (error) {
      setEvents((prev) => [
        ...prev,
        {
          type: "error",
          text: `Connection lost (${error.message}). Press Send to try again.`,
        },
      ]);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="grid min-h-[460px] flex-1 gap-4 lg:grid-cols-[5fr_6fr]">
      {/* Left pane: prewritten prompts + natural-language question */}
      <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-[#D8E3DF] bg-[#F8FAF9] p-3.5">
          {prompts.map((prompt, idx) => {
            const active = selectedIdx === idx;
            return (
              <button
                key={prompt.id}
                type="button"
                disabled={running}
                onClick={() => handleSelectPrompt(idx)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-[#00684A] bg-[#E3FCF7] font-semibold text-[#00684A]"
                    : "border-[#C1C7C6] bg-white text-[#3D4F58] hover:bg-[#F1F5F3]"
                } disabled:opacity-50`}
              >
                {prompt.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              handleSend();
            }
          }}
          disabled={running}
          spellCheck={false}
          aria-label="Natural language question for Connected Factory"
          placeholder="Ask an operational question across telemetry, alerts, orders, and materials…"
          className="min-h-[240px] flex-1 resize-none border-0 bg-white p-5 text-base leading-7 text-[#112733] outline-none placeholder:text-[#889397] disabled:opacity-70"
        />

        <footer className="flex items-center justify-end border-t border-[#D8E3DF] bg-[#F8FAF9] px-4 py-3">
          <button
            type="button"
            onClick={handleSend}
            disabled={running || !question.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00684A] px-4 text-sm font-semibold text-white transition hover:bg-[#00513A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? (
              <>
                <Icon glyph="Refresh" size={15} className="animate-spin" />
                <span>Working…</span>
              </>
            ) : (
              <>
                <span>Send</span>
                <Icon glyph="ArrowRight" size={15} />
              </>
            )}
          </button>
        </footer>
      </section>

      {/* Right pane: live streaming tool call + MongoDB result + summary */}
      <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm">
        <header className="flex items-center justify-between gap-2 border-b border-[#D8E3DF] bg-[#F8FAF9] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-[#112733]">Agent</span>
            <span className="text-sm text-[#5C6C75]">
              every step on this side runs live against MongoDB
            </span>
          </div>
          {running && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF7DB] px-2.5 py-0.5 text-sm font-medium text-[#944F01]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#DB6C00]" />
              Running pipeline
            </span>
          )}
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto bg-[#FBFDFC] p-4">
          {events.length === 0 && !running ? (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-2 p-6 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E3FCF7] text-[#00684A]">
                <Icon glyph="Wizard" size={22} />
              </span>
              <p className="text-base font-medium text-[#112733]">
                Press <span className="font-semibold text-[#00684A]">Send</span>{" "}
                to watch the agent write and run the aggregation pipeline
              </p>
              <p className="max-w-md text-sm text-[#5C6C75]">
                No write tools exist for the agent, and every tool output is wrapped in untrusted-data prompt-injection guardrails.
              </p>
            </div>
          ) : (
            <>
              {events.map((ev, idx) => {
                if (ev.type === "status") {
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-1 text-sm text-[#5C6C75]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#00A35C]" />
                      {ev.text}
                    </div>
                  );
                }

                if (ev.type === "tool_call") {
                  return (
                    <div
                      key={idx}
                      className="overflow-hidden rounded-xl border border-[#00A35C]/60 bg-[#0B1620] text-[#E6EDF3] shadow-xs"
                    >
                      <div className="flex items-center justify-between border-b border-[#1E3140] bg-[#10202E] px-3.5 py-2 text-sm">
                        <span className="text-[#9FB1BD]">
                          tool call{" "}
                          <strong className="font-mono font-semibold text-[#00ED64]">
                            {ev.name}
                          </strong>
                        </span>
                        <span className="font-mono text-sm text-[#7EE2A8]">
                          read-only
                        </span>
                      </div>
                      <pre className="m-0 max-h-64 overflow-auto p-3.5 font-mono text-sm leading-6 whitespace-pre-wrap break-words text-[#E6EDF3]">
                        {prettyJson(ev.input)}
                      </pre>
                    </div>
                  );
                }

                if (ev.type === "tool_result") {
                  return (
                    <div
                      key={idx}
                      className={`overflow-hidden rounded-xl border ${
                        ev.error
                          ? "border-[#FFCDC7] bg-[#FFEAE5]"
                          : "border-[#D8E3DF] bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-[#E8EDEB] bg-[#F8FAF9] px-3.5 py-2 text-sm text-[#5C6C75]">
                        <span>
                          result{" "}
                          <strong className="font-mono font-semibold text-[#112733]">
                            {ev.name}
                          </strong>
                          {ev.truncated ? " · truncated on screen" : ""}
                        </span>
                      </div>
                      <pre className="m-0 max-h-56 overflow-auto p-3.5 font-mono text-sm leading-6 whitespace-pre-wrap break-words text-[#3D4F58]">
                        {ev.text}
                      </pre>
                    </div>
                  );
                }

                if (ev.type === "text") {
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#00A35C] bg-[#E3FCF7]/65 px-4 py-3.5 shadow-xs"
                    >
                      <AnswerMarkdown text={ev.text} />
                    </div>
                  );
                }

                if (ev.type === "error") {
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-[#FFCDC7] bg-[#FFEAE5] p-3.5 font-mono text-sm text-[#8C210F]"
                    >
                      {ev.text}
                    </div>
                  );
                }

                if (ev.type === "done") {
                  return (
                    <div
                      key={idx}
                      className="px-1 font-mono text-sm text-[#5C6C75]"
                    >
                      done
                    </div>
                  );
                }

                return null;
              })}

              {running && (
                <div className="flex items-center gap-2 px-1 text-sm text-[#5C6C75]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#00A35C]" />
                  Waiting for LLM & MongoDB response…
                </div>
              )}
              <div ref={logEndRef} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
