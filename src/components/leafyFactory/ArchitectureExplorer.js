"use client";

import { useMemo, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { Modal } from "@leafygreen-ui/modal";

const DETAIL_CANVAS = { width: 1200, height: 720 };
const DETAIL_NODE_HEIGHT = 52;

function ArchitectureModeSwitch({ mode, onChange }) {
  return (
    <div
      role="group"
      aria-label="Architecture mode"
      className="inline-flex items-center rounded-lg border border-[#D8E3DF] bg-white/70 p-0.5"
    >
      {[
        { value: "simplified", label: "Simplified view", glyph: "Diagram" },
        { value: "detailed", label: "Detailed view", glyph: "Charts" },
      ].map((option) => {
        const selected = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            title={option.label}
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`flex h-7 w-7 items-center justify-center rounded-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#016BF8] ${
              selected
                ? "bg-[#F1F5F3] text-[#00684A]"
                : "text-[#889397] hover:bg-[#F1F5F3] hover:text-[#3D4F58]"
            }`}
          >
            <Icon glyph={option.glyph} size={14} />
          </button>
        );
      })}
    </div>
  );
}

function ModuleCard({
  module,
  compact = false,
  highlighted = false,
  onHighlight,
  onOpenModule,
}) {
  const clearHighlight = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      onHighlight(null);
    }
  };

  return (
    <article
      onMouseEnter={() => onHighlight(module.id)}
      onMouseLeave={() => onHighlight(null)}
      onFocus={() => onHighlight(module.id)}
      onBlur={clearHighlight}
      className={`group min-w-0 rounded-xl border text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8] ${
        compact ? "relative p-4" : "absolute min-h-[112px] p-3.5"
      } ${
        highlighted
          ? "border-[#00A35C] bg-white shadow-[0_14px_30px_-24px_rgba(0,104,74,0.5)]"
          : "border-[#C6D8D4] bg-white/95 hover:-translate-y-0.5 hover:border-[#82CDB1] hover:bg-white hover:shadow-md"
      }`}
      style={compact ? undefined : module.position}
    >
      <button
        type="button"
        onClick={() => onOpenModule(module.id)}
        aria-label={`View ${module.title} details`}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8]"
      />
      <div className="pointer-events-none relative z-10 flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            highlighted
              ? "bg-[#00684A] text-white"
              : "bg-[#E8F3EF] text-[#00684A]"
          }`}
        >
          <Icon glyph={module.icon} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.13em] text-[#00684A]">
            {module.type}
          </span>
          <span className="mt-0.5 block text-sm font-semibold leading-5 text-[#112733]">
            {module.title}
          </span>
        </span>
      </div>

      <p className="pointer-events-none relative z-10 mt-2.5 border-l-2 border-[#82CDB1] pl-2 text-[11px] leading-4 text-[#3D4F58]">
        <span className="mr-1 font-semibold uppercase tracking-[0.08em] text-[#00684A]">
          Built with
        </span>
        {module.implementation}
      </p>
    </article>
  );
}

function ArchitectureCanvas({
  modules,
  flows,
  highlightedModuleId,
  onHighlightModule,
  onOpenModule,
}) {
  return (
    <div className="relative h-[680px] overflow-hidden rounded-2xl border border-[#C6D8D4] bg-[#F8FAF9]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-55 [background-image:radial-gradient(rgba(0,104,74,0.16)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 1000 680"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {flows.map((flow) => {
          const active =
            flow.from === highlightedModuleId ||
            flow.to === highlightedModuleId;
          return (
            <g key={flow.id}>
              <path
                d={flow.path}
                fill="none"
                stroke={
                  active ? "rgba(0,163,92,0.3)" : "rgba(82,110,114,0.28)"
                }
                strokeWidth={active ? 1.2 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={flow.path}
                fill="none"
                stroke={
                  active ? "rgba(0,163,92,0.9)" : "rgba(82,110,114,0.75)"
                }
                strokeWidth={active ? 1.9 : 1.7}
                strokeLinecap="round"
                strokeDasharray="2 17"
                vectorEffect="non-scaling-stroke"
                className="leafy-factory-data-flow"
              />
              <title>{flow.label}</title>
            </g>
          );
        })}
      </svg>

      {modules.map((module) => (
        <ModuleCard
          key={module.id}
          module={module}
          highlighted={module.id === highlightedModuleId}
          onHighlight={onHighlightModule}
          onOpenModule={onOpenModule}
        />
      ))}
    </div>
  );
}

function FlowList({ flows, modules }) {
  const moduleById = Object.fromEntries(
    modules.map((module) => [module.id, module])
  );

  return (
    <div className="rounded-xl border border-[#D8E3DF] bg-[#F1F5F3] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#5C6C75]">
        Supplied data routes
      </p>
      <ol className="mt-3 grid gap-2">
        {flows.map((flow) => (
          <li
            key={flow.id}
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border border-[#D8E3DF] bg-white px-3 py-2 text-xs text-[#3D4F58]"
          >
            <span className="min-w-0 truncate font-semibold">
              {moduleById[flow.from].shortLabel}
            </span>
            <span className="text-center">
              {flow.bidirectional ? "↔" : "→"}
            </span>
            <span className="min-w-0 truncate text-right font-semibold">
              {moduleById[flow.to].shortLabel}
            </span>
            <span className="col-span-3 text-[10px] text-[#5C6C75]">
              {flow.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ModuleDetailModal({ module, onClose, onOpenDocument }) {
  if (!module) return null;

  const openSample = () => {
    onClose();
    onOpenDocument(
      module.sampleLabel,
      `${module.title} · sample payload`,
      module.sample
    );
  };

  return (
    <Modal
      open
      setOpen={(open) => {
        if (!open) onClose();
      }}
      size="large"
      style={{ width: "min(92vw, 880px)", maxWidth: "880px" }}
    >
      <article className="max-h-[78vh] overflow-y-auto p-1 pr-3">
        <header className="flex items-start gap-4 border-b border-[#D8E3DF] pb-5 pr-8">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E3FCF7] text-[#00684A]">
              <Icon glyph={module.icon} size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#00684A]">
                {module.type}
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#112733]">
                {module.title}
              </h3>
              <p className="mt-1 text-sm font-medium text-[#5C6C75]">
                {module.implementation}
              </p>
            </div>
          </div>
        </header>

        <p className="mt-5 text-sm leading-6 text-[#3D4F58]">
          {module.purpose}
        </p>

        <section className="mt-5 rounded-xl border border-[#D8E3DF] bg-[#F4F9F7] p-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
            How it is built
          </h4>
          <p className="mt-1.5 text-sm leading-6 text-[#273C45]">
            {module.build}
          </p>
        </section>

        <section className="mt-5">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
            Components
          </h4>
          <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {module.components.map((component) => (
              <li
                key={component}
                className="flex items-center gap-2 rounded-lg border border-[#D8E3DF] bg-white px-3 py-2 text-xs font-medium text-[#3D4F58]"
              >
                <Icon glyph="Checkmark" size={12} className="text-[#00A35C]" />
                {component}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#D8E3DF] pt-5">
          <button
            type="button"
            onClick={openSample}
            className="inline-flex items-center gap-2 rounded-lg bg-[#00684A] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#00593F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8]"
          >
            <span className="font-mono">{"{}"}</span>
            View sample payload
          </button>
          {module.links.length > 0 &&
            module.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#B8C5C1] px-3 py-2 text-sm font-semibold text-[#00684A] transition hover:border-[#00684A] hover:bg-[#F1F5F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8]"
              >
                {link.label}
                <Icon glyph="ArrowRight" size={14} />
              </a>
            ))}
        </footer>
      </article>
    </Modal>
  );
}

function getFlowGeometry(flow, nodeById) {
  if (flow.path) {
    return {
      path: flow.path,
      labelX: flow.labelPosition?.x || 0,
      labelY: flow.labelPosition?.y || 0,
    };
  }

  const from = nodeById[flow.from];
  const to = nodeById[flow.to];
  const start = {
    x: from.position.x + from.position.width / 2,
    y: from.position.y + DETAIL_NODE_HEIGHT / 2,
  };
  const finish = {
    x: to.position.x + to.position.width / 2,
    y: to.position.y + DETAIL_NODE_HEIGHT / 2,
  };
  const dx = finish.x - start.x;
  const dy = finish.y - start.y;
  const curve = flow.curve || 0;
  const control = {
    x: (start.x + finish.x) / 2 - dy * curve,
    y: (start.y + finish.y) / 2 + dx * curve,
  };

  return {
    path: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${finish.x} ${finish.y}`,
    labelX:
      start.x * 0.25 +
      control.x * 0.5 +
      finish.x * 0.25 +
      (flow.labelDx || 0),
    labelY:
      start.y * 0.25 +
      control.y * 0.5 +
      finish.y * 0.25 +
      (flow.labelDy || 0),
  };
}

function DetailedArchitecture({ groups, flows, modules, onOpenModule }) {
  const [highlightedGroupId, setHighlightedGroupId] = useState(null);
  const moduleById = useMemo(
    () => Object.fromEntries(modules.map((module) => [module.id, module])),
    [modules]
  );
  const nodes = useMemo(
    () =>
      groups.flatMap((group) =>
        group.nodes.map((node) => ({
          ...node,
          detailGroupId: group.id,
        }))
      ),
    [groups]
  );
  const nodeById = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [nodes]
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-[#C6D8D4] bg-[#F8FAF9]">
      <svg
        viewBox={`0 0 ${DETAIL_CANVAS.width} ${DETAIL_CANVAS.height}`}
        className="block h-auto w-full"
        role="group"
        aria-label="Detailed Leafy Factory service topology"
      >
        <defs>
          <pattern
            id="leafy-detail-grid"
            width="22"
            height="22"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="1" fill="rgba(0,104,74,0.12)" />
          </pattern>
        </defs>

        <rect
          width={DETAIL_CANVAS.width}
          height={DETAIL_CANVAS.height}
          fill="url(#leafy-detail-grid)"
        />

        {groups.map((group) => {
          const groupModule = moduleById[group.moduleId || group.id];
          const selected = highlightedGroupId === group.id;
          const openGroup = () => onOpenModule(group.moduleId || group.id);
          return (
            <g
              key={group.id}
              role="button"
              tabIndex="0"
              aria-label={`View ${group.title || groupModule.title} details`}
              className="cursor-pointer focus:outline-none"
              onClick={openGroup}
              onMouseEnter={() => setHighlightedGroupId(group.id)}
              onMouseLeave={() => setHighlightedGroupId(null)}
              onFocus={() => setHighlightedGroupId(group.id)}
              onBlur={() => setHighlightedGroupId(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openGroup();
                }
              }}
            >
              <rect
                x={group.position.x}
                y={group.position.y}
                width={group.position.width}
                height={group.position.height}
                rx="14"
                fill={
                  selected
                    ? "rgba(255,255,255,0.64)"
                    : "rgba(255,255,255,0.24)"
                }
                stroke={
                  selected ? "rgba(0,163,92,0.58)" : "rgba(82,110,114,0.28)"
                }
                strokeWidth={selected ? "1.6" : "1"}
              />
              <title>{`View ${group.title || groupModule.title} details`}</title>
              <text
                x={group.position.x + 14}
                y={group.position.y + 27}
                fontSize="12"
                fontWeight="650"
                fill="#3D4F58"
              >
                {group.title || groupModule.title}
              </text>
            </g>
          );
        })}

        {flows.map((flow) => {
          const active =
            nodeById[flow.from]?.detailGroupId === highlightedGroupId ||
            nodeById[flow.to]?.detailGroupId === highlightedGroupId ||
            flow.relatedGroups?.includes(highlightedGroupId);
          const geometry = getFlowGeometry(flow, nodeById);

          return (
            <g key={flow.id} pointerEvents="none">
              <path
                d={geometry.path}
                fill="none"
                stroke={
                  active ? "rgba(0,163,92,0.3)" : "rgba(82,110,114,0.28)"
                }
                strokeWidth={active ? 1.2 : 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={geometry.path}
                fill="none"
                stroke={
                  active ? "rgba(0,163,92,0.9)" : "rgba(82,110,114,0.75)"
                }
                strokeWidth={active ? 1.9 : 1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="2 17"
                vectorEffect="non-scaling-stroke"
                className="leafy-factory-data-flow"
              />
            </g>
          );
        })}

        {nodes.map((node) => (
          <foreignObject
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            width={node.position.width}
            height={DETAIL_NODE_HEIGHT}
            pointerEvents="none"
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className="h-full w-full p-0.5"
            >
              <div className="flex h-full w-full items-center gap-2 rounded-lg border border-[#C6D8D4] bg-white px-2 text-left shadow-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#E8F3EF] text-[#00684A]">
                  <Icon glyph={node.icon} size={15} />
                </span>
                <span className="min-w-0 truncate text-[10px] font-semibold text-[#112733]">
                  {node.label}
                </span>
              </div>
            </div>
          </foreignObject>
        ))}
      </svg>

      <div id="detailed-flow-summary" className="sr-only">
        <h3>Detailed architecture connections</h3>
        <ul>
          {flows.map((flow) => (
            <li key={flow.id}>
              {nodeById[flow.from].label}{" "}
              {flow.bidirectional ? "exchanges" : "sends"} {flow.label}{" "}
              {flow.bidirectional ? "with" : "to"}{" "}
              {flow.toLabel || nodeById[flow.to].label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ArchitectureExplorer({
  modules,
  flows,
  detailGroups,
  detailFlows,
  sourceUrl,
  onOpenDocument,
}) {
  const [mode, setMode] = useState("simplified");
  const [highlightedModuleId, setHighlightedModuleId] = useState(null);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const activeModule =
    modules.find((module) => module.id === activeModuleId) || null;

  return (
    <>
      <section
        id="architecture"
        aria-labelledby="architecture-title"
        className="scroll-mt-5"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="architecture-title"
              className="text-xl font-semibold tracking-[-0.015em] text-[#112733]"
            >
              Architecture
            </h2>
            <p className="mt-1 text-xs text-[#5C6C75]">
              {mode === "simplified"
                ? "Core systems and the technologies used to build them"
                : "Services, data stores, and the connections between them"}
            </p>
          </div>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-1 py-2 text-xs font-medium text-[#5C6C75] transition hover:text-[#00684A] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8]"
          >
            Source code
            <Icon glyph="ArrowRight" size={12} />
          </a>
        </div>

        <div className="relative">
          <div className="absolute right-3 top-3 z-40 hidden lg:block">
            <ArchitectureModeSwitch mode={mode} onChange={setMode} />
          </div>
          <div className="mb-2 flex justify-end lg:hidden">
            <ArchitectureModeSwitch mode={mode} onChange={setMode} />
          </div>

          {mode === "simplified" ? (
            <>
              <div className="hidden lg:block">
                <ArchitectureCanvas
                  modules={modules}
                  flows={flows}
                  highlightedModuleId={highlightedModuleId}
                  onHighlightModule={setHighlightedModuleId}
                  onOpenModule={setActiveModuleId}
                />
              </div>

              <div className="grid gap-4 lg:hidden">
                <div className="grid gap-3 sm:grid-cols-2">
                  {modules.map((module) => (
                    <ModuleCard
                      key={module.id}
                      module={module}
                      compact
                      highlighted={module.id === highlightedModuleId}
                      onHighlight={setHighlightedModuleId}
                      onOpenModule={setActiveModuleId}
                    />
                  ))}
                </div>
                <FlowList flows={flows} modules={modules} />
              </div>
            </>
          ) : (
            <DetailedArchitecture
              groups={detailGroups}
              flows={detailFlows}
              modules={modules}
              onOpenModule={setActiveModuleId}
            />
          )}
        </div>
      </section>

      <ModuleDetailModal
        module={activeModule}
        onClose={() => setActiveModuleId(null)}
        onOpenDocument={onOpenDocument}
      />
    </>
  );
}
