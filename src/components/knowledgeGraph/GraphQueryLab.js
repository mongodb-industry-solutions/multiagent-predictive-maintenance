"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@via-ds/icons";
import PipelinePane from "@/components/contextExplorer/PipelinePane";
import { HighlightedJson } from "@/components/contextExplorer/ResultPane";
import { QUERY_PRESETS } from "@/lib/knowledgeGraph/queries";

function formatPipeline(pipeline) {
  return JSON.stringify(pipeline, null, 2);
}

function PathSummary({ result, nodesById }) {
  const groups = [];
  const push = (key, id) => {
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, nodes: [] };
      groups.push(group);
    }
    const node = nodesById.get(id);
    if (node) group.nodes.push(node);
  };
  for (const id of result.highlight?.rootIds || []) push("start", id);
  const hops = Object.entries(result.highlight?.hopByNodeId || {}).sort(
    (a, b) => a[1] - b[1]
  );
  for (const [id, hop] of hops) push(`hop ${hop}`, id);

  const stock = (result.rows || []).flatMap((row) => row.stock || []);
  const guidance = (result.rows || []).flatMap((row) => row.guidance || []);

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.key}>
          <p className="mb-1.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[#00684A]">
            {group.key}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.nodes.map((node) => (
              <span
                key={`${group.key}-${node._id}`}
                className="rounded-full border border-[#D8E3DF] bg-white px-2.5 py-1 text-sm text-[#112733]"
              >
                {node.label}
              </span>
            ))}
          </div>
        </div>
      ))}
      {stock.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[#00684A]">
            Live inventory
          </p>
          <div className="grid gap-2">
            {stock.map((item) => (
              <div
                key={item.part_id}
                className="rounded-xl border border-[#D8E3DF] bg-white px-3 py-2 text-sm"
              >
                <p className="font-semibold text-[#112733]">
                  {item.part_id} · {item.name}
                </p>
                <p className="text-[#5C6C75]">
                  {item.quantity_available} on hand · {item.location} · lead time {item.lead_time_days} days
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      {guidance.length > 0 && (
        <div>
          <p className="mb-1.5 font-mono text-sm font-semibold uppercase tracking-[0.08em] text-[#00684A]">
            Manual guidance
          </p>
          <div className="grid gap-2">
            {guidance.map((doc) => (
              <div
                key={`${doc.pages}-${doc.section}`}
                className="rounded-xl border border-[#D8E3DF] bg-white px-3 py-2 text-sm text-[#112733]"
              >
                Page {doc.pages} · {doc.section}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GraphQueryLab({
  active = true,
  nodesById,
  onHighlight,
  onView,
  resetSignal = 0,
}) {
  const [presetId, setPresetId] = useState(QUERY_PRESETS[0].id);
  const [pipelineText, setPipelineText] = useState(
    formatPipeline(QUERY_PRESETS[0].pipeline)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!resetSignal) return;
    setResult(null);
    setError("");
    setShowJson(false);
  }, [resetSignal]);

  const preset =
    QUERY_PRESETS.find((item) => item.id === presetId) || QUERY_PRESETS[0];

  function selectPreset(next) {
    setPresetId(next.id);
    setPipelineText(formatPipeline(next.pipeline));
    setResult(null);
    setError("");
    setShowJson(false);
    onHighlight(null);
  }

  const runQuery = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setError("");
    try {
      const response = await fetch("/api/knowledge-graph/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: "knowledge_graph",
          pipeline: pipelineText,
        }),
      });
      const json = await response.json();
      if (!response.ok || json.error) {
        throw new Error(json.error || `HTTP ${response.status}`);
      }
      setResult(json);
      onHighlight(json.highlight || null);
      if (preset.view) onView?.(preset.view);
    } catch (err) {
      setResult(null);
      onHighlight(null);
      setError(err.message || "Query failed");
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, onHighlight, onView, pipelineText, preset]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      event.preventDefault();
      runQuery();
    };
    if (!active) return undefined;
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, runQuery]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="min-h-0">
        <PipelinePane
          collection="knowledge_graph"
          pipeline={pipelineText}
          onChangePipeline={setPipelineText}
          prevPipeline=""
          onRun={runQuery}
          isRunning={isRunning}
          editing
          setEditing={() => {}}
          signaturePreview={null}
          showingSignature={false}
          onToggleSignature={() => {}}
          signatureLoading={false}
          alwaysEditing
          collapsible
          showHeading={false}
          headerControl={
            <select
              aria-label="Sample graph traversal"
              value={preset.id}
              onChange={(event) => {
                const next = QUERY_PRESETS.find((item) => item.id === event.target.value);
                if (next) selectPreset(next);
              }}
              className="h-8 max-w-[220px] rounded-md border border-[#D8E3DF] bg-white px-2 text-sm text-[#112733] outline-none focus:border-[#00684A]"
            >
              {QUERY_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.num}. {item.title}
                </option>
              ))}
            </select>
          }
        />
      </div>
      <section className="rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#112733]">Traversal</p>
          {result && (
            <span className="font-mono text-sm text-[#00684A]">
              {result.count} {result.count === 1 ? "row" : "rows"} · {result.roundTripMs} ms
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowJson((value) => !value)}
            className="text-sm font-medium text-[#00684A]"
          >
            {showJson ? "Show path" : "Show JSON"}
          </button>
        </div>
        {error && (
          <p className="rounded-xl bg-[#FFEAE5] px-3 py-2 font-mono text-sm text-[#8C210F]">
            {error}
          </p>
        )}
        {!error && !result && (
          <p className="flex items-center gap-2 text-sm text-[#5C6C75]">
            <Icon glyph="Play" size={14} />
            Run the pipeline. Reached entities light up on the graph in hop order.
          </p>
        )}
        {result && !showJson && (
          <PathSummary result={result} nodesById={nodesById} />
        )}
        {result && showJson && <HighlightedJson value={result.rows} compact />}
      </section>
    </div>
  );
}
