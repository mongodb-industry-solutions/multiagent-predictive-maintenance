"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@via-ds/icons";

const PROJECT_STAGE_START_RE = /^  \{ \$project\b/;
const STAGE_LINE_RE = /^\{?\s*\$[a-zA-Z]+/;

function parseDisplayBlocks(pipelineText, prevPipelineText) {
  const prevTrimmed = new Set(
    (prevPipelineText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  );
  const lines = String(pipelineText || "").split("\n");
  const blocks = [];
  let i = 0;

  const describeLine = (rawLine, lineIdx) => {
    const trimmed = rawLine.trim();
    const isNew =
      Boolean(prevPipelineText) && Boolean(trimmed) && !prevTrimmed.has(trimmed);
    const isStage = STAGE_LINE_RE.test(trimmed);
    const isComment = trimmed.startsWith("//");
    return {
      key: `ln-${lineIdx}`,
      raw: rawLine,
      isNew,
      isStage,
      isComment,
    };
  };

  while (i < lines.length) {
    if (PROJECT_STAGE_START_RE.test(lines[i])) {
      let endIdx = i + 1;
      while (endIdx < lines.length && !/^  \}\}?,?\s*$/.test(lines[endIdx])) {
        endIdx += 1;
      }
      if (endIdx < lines.length) {
        const innerLines = lines
          .slice(i, endIdx + 1)
          .map((line, offset) => describeLine(line, i + offset));
        const anyNew = innerLines.some((l) => l.isNew);
        const fieldCount = lines
          .slice(i + 1, endIdx)
          .filter((l) => l.includes(":")).length;
        const trailingComma = /,\s*$/.test(lines[endIdx]) ? "," : "";

        blocks.push({
          type: "projectFold",
          key: `fold-${i}`,
          anyNew,
          fieldCount,
          trailingComma,
          lines: innerLines,
        });
        i = endIdx + 1;
        continue;
      }
    }

    blocks.push({
      type: "line",
      ...describeLine(lines[i], i),
    });
    i += 1;
  }

  return blocks;
}

export default function PipelinePane({
  collection,
  pipeline,
  onChangePipeline,
  prevPipeline,
  defaultProjectOpen = false,
  onRun,
  isRunning,
  editing,
  setEditing,
  signaturePreview,
  showingSignature,
  onToggleSignature,
  signatureLoading,
}) {
  const textareaRef = useRef(null);
  const [foldOpen, setFoldOpen] = useState(defaultProjectOpen);

  useEffect(() => {
    setFoldOpen(defaultProjectOpen);
  }, [defaultProjectOpen, pipeline]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const hasSignatureMacro = /SIGNATURE_OF\s*\(/.test(pipeline || "");

  const displaySource = useMemo(() => {
    if (!showingSignature || !signaturePreview) return pipeline;
    const compactSig = JSON.stringify(
      (signaturePreview.signature || []).map((val) => Number(val.toFixed(2)))
    );
    return `${signaturePreview.pipeline}\n\n// result, computed live in MongoDB:\n// peak ${signaturePreview.peakTempC} degC\n// ${compactSig}`;
  }, [pipeline, showingSignature, signaturePreview]);

  const blocks = useMemo(
    () =>
      parseDisplayBlocks(
        displaySource,
        showingSignature ? "" : prevPipeline
      ),
    [displaySource, prevPipeline, showingSignature]
  );

  const handleTextareaKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      onRun();
    }
  };

  return (
    <section className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8E3DF] bg-[#F8FAF9] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-base font-semibold text-[#112733]">
            {showingSignature ? "SIGNATURE_OF" : "Pipeline"}
          </span>
          <code className="truncate rounded-md border border-[#D8E3DF] bg-white px-2 py-0.5 font-mono text-sm text-[#3D4F58]">
            {showingSignature
              ? "db.telemetry · 24 bins of 10 s, z-scored"
              : `db.${collection}`}
          </code>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!showingSignature && Boolean(prevPipeline) && (
            <span className="hidden items-center gap-1.5 text-sm text-[#5C6C75] 2xl:inline-flex">
              <span className="inline-block h-3 w-2.5 rounded-[2px] border-l-[3px] border-[#00A35C] bg-[#00A35C]/20" />
              new since previous step
            </span>
          )}

          {hasSignatureMacro && (
            <button
              type="button"
              onClick={onToggleSignature}
              disabled={signatureLoading}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition ${
                showingSignature
                  ? "border-[#00684A] bg-[#E3FCF7] text-[#00684A]"
                  : "border-[#C1C7C6] bg-white text-[#3D4F58] hover:bg-[#F1F5F3]"
              } disabled:opacity-50`}
            >
              <Icon glyph="Chart" size={14} />
              {signatureLoading
                ? "Computing…"
                : showingSignature
                  ? "Back to $vectorSearch"
                  : "How the vector is computed"}
            </button>
          )}

          {!showingSignature && (
            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition ${
                editing
                  ? "border-[#00684A] bg-[#E3FCF7] text-[#00684A]"
                  : "border-[#C1C7C6] bg-white text-[#3D4F58] hover:bg-[#F1F5F3]"
              }`}
              title="Click pipeline or press 'e' to edit, Esc for formatted view"
            >
              <Icon glyph="Edit" size={14} />
              {editing ? "Done" : "Edit"}
            </button>
          )}

          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#00684A] px-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#00513A] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon
              glyph={isRunning ? "Refresh" : "Play"}
              size={14}
              className={isRunning ? "animate-spin" : ""}
            />
            {isRunning ? "Running…" : "Run"}
          </button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-auto bg-[#0B1620] text-[#E6EDF3]">
        {editing && !showingSignature ? (
          <textarea
            ref={textareaRef}
            value={pipeline}
            onChange={(event) => onChangePipeline(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            onBlur={() => setEditing(false)}
            spellCheck={false}
            aria-label="MongoDB aggregation pipeline editor"
            className="h-full min-h-[360px] w-full resize-none border-0 bg-[#0B1620] p-4 font-mono text-sm leading-6 text-[#E6EDF3] outline-none"
          />
        ) : (
          <pre
            onClick={() => {
              if (!showingSignature) setEditing(true);
            }}
            title={
              showingSignature
                ? "Live aggregation pipeline executed on telemetry"
                : "Click anywhere to edit pipeline"
            }
            className={`m-0 min-h-full py-4 pr-4 font-mono text-sm leading-6 ${
              showingSignature ? "cursor-default" : "cursor-text"
            }`}
          >
            {blocks.map((block) => {
              if (block.type === "projectFold") {
                const isOpen = foldOpen || showingSignature;
                if (!isOpen) {
                  return (
                    <span
                      key={block.key}
                      onClick={(event) => {
                        event.stopPropagation();
                        setFoldOpen(true);
                      }}
                      className={`group flex cursor-pointer items-center border-l-[3px] pl-2 pr-3 select-none ${
                        block.anyNew
                          ? "border-[#00ED64] bg-[#00ED64]/10"
                          : "border-transparent"
                      } text-[#9FB1BD] hover:text-[#E6EDF3]`}
                    >
                      <span className="mr-1.5 inline-block w-3 text-center text-sm text-[#7EE2A8]">
                        ▸
                      </span>
                      <span className="text-[#7EE2A8]">
                        {`{ $project: { … ${block.fieldCount} fields } }${block.trailingComma}`}
                      </span>
                    </span>
                  );
                }

                return (
                  <span key={block.key} className="block">
                    {block.lines.map((line, idx) => (
                      <span
                        key={line.key}
                        className={`flex border-l-[3px] pr-3 whitespace-pre ${
                          line.isNew
                            ? "border-[#00ED64] bg-[#00ED64]/10"
                            : "border-transparent"
                        } ${
                          line.isComment
                            ? "text-[#7F96A4]"
                            : line.isStage
                              ? "text-[#7EE2A8]"
                              : "text-[#E6EDF3]"
                        }`}
                      >
                        {idx === 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setFoldOpen(false);
                            }}
                            title="Collapse $project stage"
                            className="ml-1 mr-0.5 inline-flex w-3.5 shrink-0 items-center justify-center text-sm text-[#7EE2A8] hover:text-[#00ED64]"
                          >
                            ▾
                          </button>
                        ) : (
                          <span className="inline-block w-5 shrink-0" />
                        )}
                        <span>{idx === 0 ? line.raw.replace(/^  /, "") : line.raw || " "}</span>
                      </span>
                    ))}
                  </span>
                );
              }

              return (
                <span
                  key={block.key}
                  className={`block border-l-[3px] pl-5 pr-3 whitespace-pre ${
                    block.isNew
                      ? "border-[#00ED64] bg-[#00ED64]/10"
                      : "border-transparent"
                  } ${
                    block.isComment
                      ? "text-[#7F96A4]"
                      : block.isStage
                        ? "text-[#7EE2A8]"
                        : "text-[#E6EDF3]"
                  }`}
                >
                  {block.raw || " "}
                </span>
              );
            })}
          </pre>
        )}
      </div>
    </section>
  );
}
