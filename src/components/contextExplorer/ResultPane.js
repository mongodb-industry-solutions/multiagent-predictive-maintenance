"use client";

import { useState } from "react";
import { Icon } from "@via-ds/icons";
import { CONTEXT_HIGHLIGHT_KEYS } from "@/lib/connectedFactory/steps";

const HIGHLIGHT_SET = new Set(CONTEXT_HIGHLIGHT_KEYS);

export function Sparkline({ values, high = true, large = false }) {
  if (
    !Array.isArray(values) ||
    values.length < 8 ||
    !values.every((x) => typeof x === "number")
  ) {
    return null;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = large ? 220 : 124;
  const height = large ? 44 : 28;
  const padY = large ? 4 : 3;

  const points = values
    .map((val, idx) => {
      const x = ((idx / (values.length - 1)) * width).toFixed(1);
      const y = (
        height -
        padY -
        ((val - min) / range) * (height - padY * 2)
      ).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-label="Temperature excursion signature curve"
      className={large ? "h-11 w-52 shrink-0" : "h-7 w-28 shrink-0"}
    >
      <polyline
        fill="none"
        stroke={high ? "#00A35C" : "#889397"}
        strokeWidth={large ? "2.4" : "1.8"}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function HighlightedJson({ value, compact = false }) {
  const serialized = JSON.stringify(value, null, 2) || "";
  const lines = serialized.split("\n");

  return (
    <pre
      className={`m-0 overflow-auto font-mono text-sm leading-6 text-[#112733] ${
        compact ? "p-3.5" : "p-5"
      }`}
    >
      {lines.map((line, idx) => {
        const keyMatch = /^(\s*)"([^"]+)":(.*)$/.exec(line);
        if (!keyMatch) {
          return (
            <div key={idx} className="whitespace-pre-wrap break-words">
              {line}
            </div>
          );
        }
        const [, indent, key, rest] = keyMatch;
        const isHighlighted = HIGHLIGHT_SET.has(key);
        return (
          <div key={idx} className="whitespace-pre-wrap break-words">
            <span>{indent}</span>
            <span
              className={
                isHighlighted
                  ? "rounded bg-[#E3FCF7] px-1 py-0.5 font-semibold text-[#00684A]"
                  : "text-[#5C6C75]"
              }
            >
              {`"${key}"`}
            </span>
            <span>:</span>
            <span
              className={
                isHighlighted ? "font-semibold text-[#00684A]" : "text-[#112733]"
              }
            >
              {rest}
            </span>
          </div>
        );
      })}
    </pre>
  );
}

function formatTableTimestamp(value) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
    return `${value.slice(0, 10)} ${value.slice(11, 16)}`;
  }
  return null;
}

function SearchBreakdownPanel({ result }) {
  if (!result?.search) return null;
  const s = result.search;
  const hop = Math.max((result.ms || 0) - s.total, 0);
  const network = Math.max((result.roundTripMs || 0) - (result.ms || 0), 0);

  return (
    <div className="border-b border-[#D8E3DF] bg-[#F8FAF9] px-5 py-3.5 text-sm">
      <p className="mb-2 font-semibold uppercase tracking-[0.08em] text-[#00684A]">
        On the Atlas Search Node (mongot)
      </p>
      <div className="grid gap-1.5 sm:grid-cols-[180px_90px_1fr]">
        <span className="font-medium text-[#112733]">pre-filter</span>
        <span className="font-mono font-semibold text-[#00684A]">
          {s.filter.toFixed(2)} ms
        </span>
        <span className="text-[#5C6C75]">
          Lucene term queries on indexed filter fields, applied before similarity
        </span>

        <span className="font-medium text-[#112733]">kNN graph walk</span>
        <span className="font-mono font-semibold text-[#00684A]">
          {s.knn.toFixed(2)} ms
        </span>
        <span className="text-[#5C6C75]">
          HNSW traversal restricted to documents passing the pre-filter
        </span>

        <span className="font-medium text-[#112733]">score & top-k</span>
        <span className="font-mono font-semibold text-[#00684A]">
          {s.score.toFixed(2)} ms
        </span>
        <span className="text-[#5C6C75]">
          Cosine scoring across 100 candidates, sorted to top 6
        </span>

        <span className="border-t border-[#D8E3DF] pt-1 font-semibold text-[#112733]">
          search node total
        </span>
        <span className="border-t border-[#D8E3DF] pt-1 font-mono font-semibold text-[#00684A]">
          {s.total.toFixed(2)} ms
        </span>
        <span className="border-t border-[#D8E3DF] pt-1 text-[#5C6C75]">
          Total search execution inside Atlas Vector Search
        </span>
      </div>

      <div className="mt-2.5 grid gap-1 border-t border-dashed border-[#D8E3DF] pt-2 text-[#5C6C75] sm:grid-cols-[180px_90px_1fr]">
        <span>mongod ↔ mongot hop</span>
        <span className="font-mono">{hop.toFixed(2)} ms</span>
        <span>Internal coordinator hop, independent of collection size</span>

        <span>app ↔ Atlas round-trip</span>
        <span className="font-mono">{network.toFixed(2)} ms</span>
        <span>Network transport</span>
      </div>
    </div>
  );
}

export default function ResultPane({
  result,
  error,
  view,
  onChangeView,
  isRunning,
  querySignature,
  signatureWindow,
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const rows = result?.rows || [];
  const hasRun = Boolean(result) || Boolean(error);
  const hasSearchStats = Boolean(result?.search);

  const metaSummary = (() => {
    if (isRunning) return "running against MongoDB…";
    if (error) return "query error";
    if (!result) return "";
    const rowLabel = `${result.count} ${result.count === 1 ? "row" : "rows"}`;
    if (result.search) {
      return `${rowLabel} · ${result.search.total.toFixed(2)} ms in Vector Search`;
    }
    if (typeof result.ms === "number") {
      return `${rowLabel} · ${result.ms} ms in MongoDB`;
    }
    return `${rowLabel} · ${result.roundTripMs} ms`;
  })();

  const allColumns = [];
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!allColumns.includes(key)) allColumns.push(key);
    });
  });
  const hasSimilarity = allColumns.includes("similarity");

  return (
    <section className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D8E3DF] bg-[#F8FAF9] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-base font-semibold text-[#112733]">Result</span>
          {metaSummary &&
            (hasSearchStats ? (
              <button
                type="button"
                onClick={() => setShowBreakdown((prev) => !prev)}
                title="Click to inspect Atlas Vector Search timing breakdown"
                className="inline-flex items-center gap-1 rounded-full border border-[#B8E4D2] bg-[#E3FCF7] px-2.5 py-0.5 font-mono text-sm font-medium text-[#00684A] hover:border-[#00684A]"
              >
                {metaSummary}
                <Icon
                  glyph={showBreakdown ? "ChevronUp" : "ChevronDown"}
                  size={12}
                />
              </button>
            ) : (
              <span
                title={
                  result?.roundTripMs
                    ? `Total round-trip to Atlas: ${result.roundTripMs} ms`
                    : undefined
                }
                className="font-mono text-sm text-[#5C6C75]"
              >
                {metaSummary}
              </span>
            ))}
        </div>

        <div className="inline-flex rounded-lg border border-[#C1C7C6] bg-white p-0.5">
          <button
            type="button"
            onClick={() => onChangeView("json")}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
              view === "json"
                ? "bg-[#E3FCF7] font-semibold text-[#00684A]"
                : "text-[#5C6C75] hover:text-[#112733]"
            }`}
          >
            Document
          </button>
          <button
            type="button"
            onClick={() => onChangeView("table")}
            className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
              view === "table"
                ? "bg-[#E3FCF7] font-semibold text-[#00684A]"
                : "text-[#5C6C75] hover:text-[#112733]"
            }`}
          >
            Table
          </button>
        </div>
      </header>

      {showBreakdown && hasSearchStats && (
        <SearchBreakdownPanel result={result} />
      )}

      <div className="min-h-0 flex-1 overflow-auto bg-white">
        {error ? (
          <div className="m-5 rounded-xl border border-[#FFCDC7] bg-[#FFEAE5] p-4 font-mono text-sm leading-6 text-[#8C210F]">
            {error}
          </div>
        ) : !hasRun ? (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 p-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E3FCF7] text-[#00684A]">
              <Icon glyph="Play" size={20} />
            </span>
            <p className="text-base font-medium text-[#112733]">
              Click <span className="font-semibold text-[#00684A]">Run</span>{" "}
              (or press <code className="rounded bg-[#F1F5F3] px-1.5 py-0.5 text-sm">⌘↵</code>) to execute this pipeline against MongoDB Atlas
            </p>
            <p className="max-w-md text-sm text-[#5C6C75]">
              Every stage runs live against the seeded EV Battery Pack Assembly collections. You can also click into the pipeline to modify it.
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-sm text-[#5C6C75]">
            Query returned 0 documents. Ensure the Connected Factory collections and vector index are ready.
          </div>
        ) : view === "json" ? (
          <HighlightedJson value={rows.length === 1 ? rows[0] : rows} />
        ) : (
          <div>
            {hasSimilarity && querySignature?.signature && (
              <div className="flex flex-wrap items-center gap-4 border-b border-[#D8E3DF] bg-[#F8FAF9] px-5 py-3.5">
                <div className="rounded-xl border border-[#B8E4D2] bg-white px-3 py-2">
                  <Sparkline values={querySignature.signature} high large />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-[#112733]">
                    The four minutes around the 08:14 weld-zone alarm
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-[#5C6C75]">
                    {`${signatureWindow?.machineId || "LTW-04"} · 08:12:30 to 08:16:30 · peak ${querySignature.peakTempC} degC · 24 z-scored bins computed in MongoDB`}
                  </p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[#D8E3DF] bg-[#F8FAF9]">
                    {allColumns.map((col) => (
                      <th
                        key={col}
                        className="px-3.5 py-2.5 font-mono text-sm font-semibold whitespace-nowrap text-[#5C6C75]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIdx) => {
                    const isLowSimilarity =
                      hasSimilarity &&
                      typeof row.similarity === "number" &&
                      row.similarity < 0.88;
                    return (
                      <tr
                        key={rowIdx}
                        className={`border-b border-[#E8EDEB] transition-colors hover:bg-[#F8FAF9] ${
                          isLowSimilarity ? "opacity-65" : ""
                        }`}
                      >
                        {allColumns.map((col) => {
                          const val = row[col];

                          if (val === null || val === undefined) {
                            const isOpenCase =
                              col === "rootCause" || col === "fix";
                            return (
                              <td
                                key={col}
                                className="px-3.5 py-2.5 whitespace-nowrap"
                              >
                                <span
                                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-medium ${
                                    isOpenCase
                                      ? "border-[#EBCB9B] bg-[#FEF7DB] text-[#944F01]"
                                      : "border-[#FFCDC7] bg-[#FFEAE5] text-[#8C210F]"
                                  }`}
                                >
                                  {isOpenCase ? "open case" : "no order"}
                                </span>
                              </td>
                            );
                          }

                          if (col === "similarity" && typeof val === "number") {
                            const high = val >= 0.88;
                            return (
                              <td
                                key={col}
                                className="px-3.5 py-2.5 font-mono text-sm whitespace-nowrap"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="inline-block h-2 w-20 overflow-hidden rounded-full bg-[#E8EDEB]">
                                    <span
                                      className={`block h-full rounded-full ${
                                        high ? "bg-[#00A35C]" : "bg-[#889397]"
                                      }`}
                                      style={{
                                        width: `${Math.round(
                                          Math.max(0, Math.min(1, val)) * 100
                                        )}%`,
                                      }}
                                    />
                                  </span>
                                  <span
                                    className={
                                      high
                                        ? "font-semibold text-[#00684A]"
                                        : "text-[#5C6C75]"
                                    }
                                  >
                                    {val.toFixed(3)}
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          if (Array.isArray(val) && val.length >= 8) {
                            return (
                              <td
                                key={col}
                                className="px-3.5 py-2 whitespace-nowrap"
                              >
                                <Sparkline
                                  values={val}
                                  high={!isLowSimilarity}
                                />
                              </td>
                            );
                          }

                          if (col === "status") {
                            const isOpen = val === "open";
                            return (
                              <td
                                key={col}
                                className="px-3.5 py-2.5 font-mono text-sm whitespace-nowrap"
                              >
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-semibold ${
                                    isOpen
                                      ? "bg-[#FEF7DB] text-[#944F01]"
                                      : "bg-[#E3FCF7] text-[#00684A]"
                                  }`}
                                >
                                  {String(val)}
                                </span>
                              </td>
                            );
                          }

                          const formattedTs = formatTableTimestamp(val);
                          if (formattedTs) {
                            return (
                              <td
                                key={col}
                                className="px-3.5 py-2.5 font-mono text-sm whitespace-nowrap text-[#5C6C75]"
                              >
                                {formattedTs}
                              </td>
                            );
                          }

                          if (typeof val === "object") {
                            return (
                              <td
                                key={col}
                                className="px-3.5 py-2.5 font-mono text-sm whitespace-nowrap text-[#3D4F58]"
                              >
                                {JSON.stringify(val)}
                              </td>
                            );
                          }

                          const isCtx = HIGHLIGHT_SET.has(col) && !isLowSimilarity;
                          return (
                            <td
                              key={col}
                              className={`px-3.5 py-2.5 font-mono text-sm whitespace-nowrap ${
                                isCtx
                                  ? "font-semibold text-[#00684A]"
                                  : "text-[#112733]"
                              }`}
                            >
                              {String(val)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
