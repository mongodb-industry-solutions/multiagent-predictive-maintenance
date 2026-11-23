"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Select, SelectItem } from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import InfoWizard from "@/components/infoWizard/InfoWizard";
import { KNOWLEDGE_GRAPH_TALK_TRACK } from "@/lib/const/talkTrack";
import GraphCanvas from "./GraphCanvas";
import GraphInspectorPane from "./GraphInspectorPane";
import {
  HIERARCHY_LEVELS,
  LAYERS,
  LENS_DEFAULTS,
  LENSES,
  directNeighbors,
  expandedView,
  lensNodeIds,
  neighborhoodIds,
  nodesWithinDepth,
} from "./graphModel";

export default function KnowledgeGraphWorkspace() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lens, setLens] = useState("process");
  const [enabledLayers, setEnabledLayers] = useState(
    () => new Set(LENS_DEFAULTS.process.layers)
  );
  const [search, setSearch] = useState("");
  const [layout, setLayout] = useState("network");
  const [depth, setDepth] = useState(LENS_DEFAULTS.process.depth);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [focusMode, setFocusMode] = useState(false);
  const [focusIds, setFocusIds] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [highlight, setHighlight] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [tab, setTab] = useState("query");
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/knowledge-graph/graph");
        const json = await response.json();
        if (!response.ok || json.error) {
          throw new Error(json.error || `HTTP ${response.status}`);
        }
        if (!cancelled) setStatus(json);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load the knowledge graph");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const nodes = useMemo(() => status?.nodes || [], [status]);
  const edges = useMemo(() => status?.edges || [], [status]);
  const nodesById = useMemo(
    () => new Map(nodes.map((node) => [node._id, node])),
    [nodes]
  );

  const visibleNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (query) {
      const allowed = lensNodeIds(lens, nodes, edges);
      const hits = nodes.filter((node) => {
        if (!allowed.has(node._id)) return false;
        return [node.label, node.code, node._id, node.node_type]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
      const ids = new Set(hits.map((node) => node._id));
      for (const hit of hits) {
        let current = hit;
        const guard = new Set();
        while (current?.parent_id && !guard.has(current._id)) {
          guard.add(current._id);
          ids.add(current.parent_id);
          current = nodesById.get(current.parent_id);
        }
      }
      return nodes.filter((node) => ids.has(node._id));
    }
    if (focusMode && focusIds) {
      const ids = new Set(focusIds);
      if (expandedIds.size > 0) {
        for (const id of expandedView(nodes, edges, expandedIds)) ids.add(id);
      }
      return nodes.filter((node) => ids.has(node._id));
    }
    const allowed = lensNodeIds(lens, nodes, edges);
    const inScope = nodes.filter(
      (node) => allowed.has(node._id) && enabledLayers.has(node.layer)
    );
    const depthIds = nodesWithinDepth(inScope, edges, depth, expandedIds);
    const layered = inScope.filter((node) => depthIds.has(node._id));
    const highlighted = new Set([
      ...(highlight?.rootIds || []),
      ...Object.keys(highlight?.hopByNodeId || {}),
    ]);
    if (expandedIds.size > 0 || highlighted.size === 0) return layered;
    const merged = new Map(layered.map((node) => [node._id, node]));
    for (const node of nodes) {
      if (highlighted.has(node._id)) merged.set(node._id, node);
    }
    return [...merged.values()];
  }, [depth, edges, enabledLayers, expandedIds, focusIds, focusMode, highlight, lens, nodes, nodesById, search]);

  const expandableIds = useMemo(() => {
    const visible = new Set(visibleNodes.map((node) => node._id));
    const ids = new Set();
    for (const node of visibleNodes) {
      const hasHidden = directNeighbors(node._id, nodes, edges).some(
        (neighborId) => !visible.has(neighborId)
      );
      if (hasHidden) ids.add(node._id);
    }
    return ids;
  }, [edges, nodes, visibleNodes]);

  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((node) => node._id));
    return edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
  }, [edges, visibleNodes]);

  const layerCounts = useMemo(() => {
    const counts = {};
    for (const layer of LAYERS) counts[layer.id] = 0;
    for (const node of nodes) {
      if (counts[node.layer] != null) counts[node.layer] += 1;
    }
    return counts;
  }, [nodes]);

  function toggleLayer(layerId) {
    setEnabledLayers((current) => {
      const next = new Set(current);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }

  function selectNode(nodeId) {
    if (!nodeId && focusMode) return;
    setSelectedId(nodeId);
    if (!nodeId) return;
    setTab("document");
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }

  const selectedNode = nodesById.get(selectedId) || null;
  const spotlight = selectedId ? neighborhoodIds(selectedId, edges) : null;
  const emphasizedIds = useMemo(() => {
    const rootIds = highlight?.rootIds || [];
    const hopIds = Object.keys(highlight?.hopByNodeId || {});
    if (rootIds.length > 0 || hopIds.length > 0) {
      return new Set([...rootIds, ...hopIds]);
    }
    return spotlight;
  }, [highlight, spotlight]);

  function selectLens(lensId) {
    const defaults = LENS_DEFAULTS[lensId] || LENS_DEFAULTS.process;
    setLens(lensId);
    setEnabledLayers(new Set(defaults.layers));
    setDepth(defaults.depth);
    setExpandedIds(new Set());
    setFocusMode(false);
  }

  function enterFocus() {
    if (!emphasizedIds || emphasizedIds.size === 0) return;
    setFocusIds(new Set(emphasizedIds));
    setFocusMode(true);
  }

  function exitFocus() {
    setFocusMode(false);
  }

  function handleHighlight(nextHighlight) {
    setHighlight(nextHighlight);
    const traversalIds = new Set([
      ...(nextHighlight?.rootIds || []),
      ...Object.keys(nextHighlight?.hopByNodeId || {}),
    ]);
    if (traversalIds.size > 0) {
      setFocusIds(traversalIds);
      setFocusMode(true);
      setExpandedIds(new Set());
      setSelectedId("");
    } else {
      setFocusMode(false);
      setFocusIds(null);
    }
  }

  function resetVisualization() {
    setLens("process");
    setEnabledLayers(new Set(LENS_DEFAULTS.process.layers));
    setSearch("");
    setLayout("network");
    setDepth(LENS_DEFAULTS.process.depth);
    setExpandedIds(new Set());
    setFocusMode(false);
    setFocusIds(null);
    setSelectedId("");
    setHighlight(null);
    setResetSignal((current) => current + 1);
  }

  function applyExampleView(view) {
    if (!view) return;
    setEnabledLayers(new Set(view.layers));
    setDepth(view.depth);
    setExpandedIds(new Set());
    setSearch("");
  }

  return (
    <main className="flex h-full min-h-0 w-full flex-col gap-3 pb-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#112733]">
            Knowledge Graph
          </h1>
          <Link
            href="/unified-namespace"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
          >
            <Icon glyph="ArrowLeft" size={16} />
            Back to overview
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status?.seeded && (
            <span className="rounded-full border border-[#B8E4D2] bg-[#E3FCF7] px-3 py-1 font-mono text-sm text-[#00684A]">
              knowledge_graph · {status.stats.nodes} nodes · {status.stats.edges} edges
            </span>
          )}
          <InfoWizard
            open={infoOpen}
            setOpen={setInfoOpen}
            sections={KNOWLEDGE_GRAPH_TALK_TRACK}
            iconOnly
            iconGlyph="InfoWithCircle"
            tooltipText="Knowledge graph talk track"
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Sample graph"
            size="small"
            selectedKey={lens}
            onSelectionChange={(key) => {
              if (key != null) selectLens(String(key));
            }}
            className="w-fit shrink-0"
          >
            {LENSES.map((item) => (
              <SelectItem key={item.id} id={item.id} textValue={item.label}>
                {item.label}
              </SelectItem>
            ))}
          </Select>
          {LAYERS.map((layer) => {
            const active = enabledLayers.has(layer.id);
            return (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  active ? "text-[#112733]" : "border-[#E8EDEB] text-[#889397]"
                }`}
                style={
                  active
                    ? { borderColor: layer.border, backgroundColor: layer.tint, color: layer.color }
                    : undefined
                }
              >
                {layer.label} {layerCounts[layer.id] || 0}
              </button>
            );
          })}
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search LTW-04, E12, P-001, MAT-CU-020"
            aria-label="Search the knowledge graph"
            className="h-9 min-w-[220px] flex-1 rounded-lg border border-[#C1C7C6] bg-white px-3 text-sm text-[#112733] outline-none focus:border-[#00684A]"
          />
          <div className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#C1C7C6] bg-white px-1">
            <button
              type="button"
              aria-label="Show one level less"
              disabled={depth <= 1}
              onClick={() => setDepth((current) => Math.max(1, current - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold text-[#112733] disabled:text-[#889397]"
            >
              −
            </button>
            <span className="px-1 text-center text-sm font-medium whitespace-nowrap text-[#112733]">
              Level {depth}
            </span>
            <button
              type="button"
              aria-label="Show the next level"
              disabled={depth >= HIERARCHY_LEVELS.length}
              onClick={() =>
                setDepth((current) => Math.min(HIERARCHY_LEVELS.length, current + 1))
              }
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-sm font-semibold text-[#112733] disabled:text-[#889397]"
            >
              +
            </button>
          </div>
          <div className="inline-flex rounded-lg border border-[#C1C7C6] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setLayout("network")}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                layout === "network" ? "bg-[#E3FCF7] font-semibold text-[#00684A]" : "text-[#5C6C75]"
              }`}
            >
              Network
            </button>
            <button
              type="button"
              onClick={() => setLayout("hierarchy")}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                layout === "hierarchy" ? "bg-[#E3FCF7] font-semibold text-[#00684A]" : "text-[#5C6C75]"
              }`}
            >
              Hierarchy
            </button>
            <button
              type="button"
              onClick={() => setLayout("flow")}
              className={`rounded-md px-2.5 py-1 text-sm font-medium ${
                layout === "flow" ? "bg-[#E3FCF7] font-semibold text-[#00684A]" : "text-[#5C6C75]"
              }`}
            >
              Flow
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <section className="flex flex-1 items-center justify-center rounded-2xl border border-[#D8E3DF] bg-white text-sm text-[#5C6C75]">
          Preparing the Leafy Factory knowledge graph in MongoDB…
        </section>
      )}
      {!loading && error && (
        <section className="flex flex-1 items-center justify-center rounded-2xl border border-[#FFCDC7] bg-[#FFEAE5] p-6 text-sm text-[#8C210F]">
          {error}
        </section>
      )}
      {!loading && !error && (
        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.95fr)]">
          <GraphCanvas
            nodes={visibleNodes}
            edges={visibleEdges}
            layout={layout}
            selectedId={
              focusMode || spotlight?.has(selectedId) ? selectedId : ""
            }
            onSelect={selectNode}
            highlight={highlight}
            isolate={focusMode || expandedIds.size > 0}
            expandableIds={expandableIds}
            focusMode={focusMode}
            onFocus={enterFocus}
            onExitFocus={exitFocus}
            onReset={resetVisualization}
          />
          <GraphInspectorPane
            tab={tab}
            onTab={setTab}
            selectedNode={selectedNode}
            indexes={status?.indexes || []}
            nodesById={nodesById}
            onHighlight={handleHighlight}
            onView={applyExampleView}
            resetSignal={resetSignal}
          />
        </div>
      )}
    </main>
  );
}
