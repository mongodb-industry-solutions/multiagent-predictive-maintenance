"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@via-ds/icons";
import {
  CARD_H,
  CARD_W,
  edgeGeometry,
  edgeRole,
  fitTransform,
  layerStyle,
  lineLayout,
  networkEdgeGeometry,
  networkLayout,
  NODE_TYPES,
} from "./graphModel";

const GLYPH_BY_TYPE = Object.fromEntries(
  NODE_TYPES.map((type) => [type.id, type.glyph])
);

function hopLabel(nodeId, highlight) {
  if (!highlight) return "";
  if (highlight.rootIds?.includes(nodeId)) return "start";
  const hop = highlight.hopByNodeId?.[nodeId];
  if (hop == null) return "";
  return `hop ${hop}`;
}

export default function GraphCanvas({
  nodes,
  edges,
  layout,
  selectedId,
  onSelect,
  highlight,
  isolate = false,
  expandableIds,
  canFocus = false,
  focusMode = false,
  onFocus,
  onExitFocus,
}) {
  const frameRef = useRef(null);
  const sizeRef = useRef({ w: 800, h: 640 });
  const dragRef = useRef(null);
  const transformRef = useRef({ x: 24, y: 24, k: 0.8 });
  const modelRef = useRef({ nodes, edges, layout, selectedId });
  modelRef.current = { nodes, edges, layout, selectedId };
  const [size, setSize] = useState({ w: 800, h: 640 });
  const [positions, setPositions] = useState({});
  const [transform, setTransform] = useState({ x: 24, y: 24, k: 0.8 });
  transformRef.current = transform;
  const [legendOpen, setLegendOpen] = useState(true);
  const [edgeTip, setEdgeTip] = useState(null);

  const signature = useMemo(
    () => `${layout}:${nodes.map((node) => node._id).join("|")}:${edges.length}`,
    [edges.length, layout, nodes]
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = {
        w: entry.contentRect.width,
        h: entry.contentRect.height,
      };
      sizeRef.current = next;
      setSize(next);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const model = modelRef.current;
    const nextPositions =
      model.layout === "network" ? networkLayout(model.nodes) : lineLayout(model.nodes);
    setPositions(nextPositions);
    setTransform(fitTransform(nextPositions, sizeRef.current));
  }, [signature]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      setTransform((current) => {
        const k = Math.min(2.5, Math.max(0.22, current.k * factor));
        const scale = k / current.k;
        return {
          k,
          x: mx - scale * (mx - current.x),
          y: my - scale * (my - current.y),
        };
      });
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, []);

  const highlightActive = Boolean(
    highlight &&
      ((highlight.rootIds || []).length > 0 ||
        Object.keys(highlight.hopByNodeId || {}).length > 0)
  );

  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node._id, node])),
    [nodes]
  );

  function nodeOpacity(nodeId) {
    if (isolate) return 1;
    if (highlightActive) {
      const labeled = hopLabel(nodeId, highlight);
      return labeled ? 1 : 0.14;
    }
    return 1;
  }

  function beginDrag(drag) {
    dragRef.current = drag;
    const move = (event) => {
      const active = dragRef.current;
      if (!active) return;
      const dx = event.clientX - active.x;
      const dy = event.clientY - active.y;
      if (Math.hypot(dx, dy) > 4) active.moved = true;
      if (active.kind === "pan") {
        setTransform({
          ...active.origin,
          x: active.origin.x + dx,
          y: active.origin.y + dy,
        });
        return;
      }
      const scale = transformRef.current.k || 1;
      setPositions((current) => ({
        ...current,
        [active.id]: {
          x: active.origin.x + dx / scale,
          y: active.origin.y + dy / scale,
        },
      }));
    };
    const end = () => {
      const active = dragRef.current;
      if (active?.kind === "node" && !active.moved) onSelect(active.id);
      if (active?.kind === "pan" && !active.moved) onSelect("");
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  }

  function onPointerDown(event) {
    if (event.target?.closest?.("[data-node]")) return;
    beginDrag({
      kind: "pan",
      x: event.clientX,
      y: event.clientY,
      origin: transformRef.current,
      moved: false,
    });
  }

  function onNodePointerDown(event, nodeId) {
    event.stopPropagation();
    beginDrag({
      kind: "node",
      id: nodeId,
      x: event.clientX,
      y: event.clientY,
      origin: positions[nodeId] || { x: 0, y: 0 },
      moved: false,
    });
  }

  const legendTypes = NODE_TYPES.filter((type) =>
    nodes.some((node) => node.node_type === type.id)
  );

  return (
    <section className="relative flex min-h-[520px] min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-[#F7FBFA] shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-end p-3">
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTransform((current) => ({ ...current, k: Math.min(2.5, current.k * 1.15) }))}
            className="inline-flex h-8 items-center rounded-lg border border-[#C1C7C6] bg-white px-2.5 text-sm font-semibold text-[#112733]"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setTransform((current) => ({ ...current, k: Math.max(0.22, current.k / 1.15) }))}
            className="inline-flex h-8 items-center rounded-lg border border-[#C1C7C6] bg-white px-2.5 text-sm font-semibold text-[#112733]"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setTransform(fitTransform(positions, size))}
            className="inline-flex h-8 items-center rounded-lg border border-[#C1C7C6] bg-white px-2.5 text-sm font-semibold text-[#112733]"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={focusMode ? onExitFocus : onFocus}
            disabled={!focusMode && !canFocus}
            className={`inline-flex h-8 items-center rounded-lg border px-2.5 text-sm font-semibold disabled:text-[#889397] ${
              focusMode
                ? "border-[#00684A] bg-[#E3FCF7] text-[#00684A]"
                : "border-[#C1C7C6] bg-white text-[#112733]"
            }`}
          >
            {focusMode ? "Back" : "Focus"}
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
      <svg
        ref={frameRef}
        className="h-full w-full touch-none"
        onPointerDown={onPointerDown}
        role="img"
        aria-label="Leafy Factory knowledge graph"
      >
        <defs>
          <marker
            id="kg-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#B7C9C2" />
          </marker>
          <marker
            id="kg-arrow-hot"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#1F8F62" />
          </marker>
        </defs>
        <rect width={size.w} height={size.h} fill="transparent" />
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
          {edges.map((edge) => {
            const source = positions[edge.source];
            const target = positions[edge.target];
            if (!source || !target) return null;
            const highlightIds = highlightActive
              ? new Set([
                  ...(highlight.rootIds || []),
                  ...Object.keys(highlight.hopByNodeId || {}),
                ])
              : null;
            const role = edgeRole(edge, nodeById, highlightIds);
            const hot = role === "hot";
            const geometry =
              layout === "network"
                ? networkEdgeGeometry(source, target)
                : edgeGeometry(source, target);
            const quiet = !isolate && highlightActive && !hot;
            return (
              <path
                key={`${edge.source}-${edge.rel}-${edge.target}`}
                d={geometry.path}
                fill="none"
                stroke={hot ? "#1F8F62" : "#C5D5CF"}
                strokeWidth={hot ? 1.15 : 1}
                markerEnd={hot ? "url(#kg-arrow-hot)" : "url(#kg-arrow)"}
                opacity={quiet ? 0.28 : 0.95}
                onMouseEnter={() =>
                  setEdgeTip({ ...geometry, rel: edge.rel, detail: edge.label })
                }
                onMouseLeave={() => setEdgeTip(null)}
              />
            );
          })}

          {edgeTip && (
            <g transform={`translate(${edgeTip.labelX} ${edgeTip.labelY})`}>
              <rect
                x={-70}
                y={-16}
                width={140}
                height={22}
                rx={11}
                fill="#112733"
                opacity="0.92"
              />
              <text
                textAnchor="middle"
                y={0}
                fill="#E3FCF7"
                fontSize="12"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              >
                {edgeTip.rel}
              </text>
            </g>
          )}

          {nodes.map((node) => {
            const point = positions[node._id];
            if (!point) return null;
            const style = layerStyle(node.layer);
            const badge = hopLabel(node._id, highlight);
            const selected = node._id === selectedId;
            const opacity = nodeOpacity(node._id);
            return (
              <g
                key={node._id}
                data-node="true"
                transform={`translate(${point.x} ${point.y})`}
                opacity={opacity}
                onPointerDown={(event) => onNodePointerDown(event, node._id)}
                className="cursor-pointer"
              >
                <rect
                  width={CARD_W}
                  height={CARD_H}
                  rx={14}
                  fill={selected ? style.tint : "#ffffff"}
                  stroke={selected || badge ? style.color : style.border}
                  strokeWidth={selected || badge ? 1.5 : 1}
                />
                <foreignObject width={CARD_W} height={CARD_H}>
                  <div
                    xmlns="http://www.w3.org/1999/xhtml"
                    className="relative flex h-full items-center gap-2 px-2.5"
                    onPointerDown={(event) => onNodePointerDown(event, node._id)}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: style.tint, color: style.color }}
                    >
                      <Icon glyph={GLYPH_BY_TYPE[node.node_type] || "Diagram"} size={16} />
                    </span>
                    {badge && (
                      <span
                        className="absolute top-1 right-1.5 rounded-full px-1.5 py-0.5 font-mono text-sm leading-none text-white"
                        style={{ backgroundColor: badge === "start" ? "#00684A" : "#00A35C" }}
                      >
                        {badge}
                      </span>
                    )}
                    {expandableIds?.has(node._id) && (
                      <span
                        className={`absolute right-2 font-mono text-sm leading-none text-[#00684A] ${
                          badge ? "bottom-1" : "top-1"
                        }`}
                      >
                        +
                      </span>
                    )}
                    <span className={`min-w-0 ${badge ? "pr-14" : ""}`}>
                      <span className="block truncate text-sm font-semibold text-[#112733]">
                        {node.label}
                      </span>
                      <span className="block truncate font-mono text-sm text-[#5C6C75]">
                        {node.code}
                      </span>
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm text-[#5C6C75]">
          Nothing matches the current search, sample, or filters.
        </div>
      )}
      {!legendOpen && (
        <button
          type="button"
          onClick={() => setLegendOpen(true)}
          aria-label="Show legend"
          className="absolute right-3 bottom-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D8E3DF] bg-white text-[#00684A] shadow-sm"
        >
          <Icon glyph="InfoWithCircle" size={16} />
        </button>
      )}
      </div>
      {legendOpen && (
        <div className="flex shrink-0 items-start gap-3 border-t border-[#E8EDEB] bg-white px-3 py-2">
          <div className="flex flex-1 flex-wrap gap-x-3 gap-y-1">
            {legendTypes.map((type) => (
              <span
                key={type.id}
                className="inline-flex items-center gap-1 text-sm text-[#5C6C75]"
              >
                <Icon glyph={type.glyph} size={14} className="text-[#3D4F58]" />
                {type.label}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLegendOpen(false)}
            className="shrink-0 text-sm font-medium text-[#00684A]"
          >
            Hide
          </button>
        </div>
      )}
      <p className="sr-only">
        {nodeById.size} visible entities. Drag the background to pan, scroll to zoom, and drag a card to reposition it.
      </p>
    </section>
  );
}

