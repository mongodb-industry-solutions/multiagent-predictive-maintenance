"use client";

import Icon from "@leafygreen-ui/icon";
import JsonViewer from "./JsonViewer";

function ModuleButton({ module, selected, compact = false, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(module.id)}
      aria-pressed={selected}
      aria-controls="selected-module-detail"
      className={`group min-w-0 rounded-xl border text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8] ${
        compact ? "p-4" : "absolute min-h-[82px] p-3.5"
      } ${
        selected
          ? "border-[#00A35C] bg-[#E3FCF7] shadow-[0_16px_36px_-25px_rgba(0,104,74,0.8)]"
          : "border-[#BCD1CC] bg-white/95 hover:-translate-y-0.5 hover:border-[#00A35C] hover:bg-white hover:shadow-md"
      }`}
      style={compact ? undefined : module.position}
    >
      <span className="block text-[10px] font-semibold uppercase tracking-[0.13em] text-[#00684A]">
        {module.type}
      </span>
      <span className="mt-1 block text-sm font-semibold leading-5 text-[#112733]">
        {module.title}
      </span>
      {!compact && (
        <span className="mt-1 block text-[10px] text-[#5C6C75]">
          {module.components.length} components · select to inspect
        </span>
      )}
    </button>
  );
}

function ArchitectureCanvas({
  modules,
  flows,
  selectedModuleId,
  onSelectModule,
}) {
  return (
    <div className="relative h-[520px] overflow-hidden rounded-2xl border border-[#B9CFCA] bg-[#EEF6F3]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-45 [background-image:linear-gradient(to_right,rgba(0,104,74,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,104,74,0.08)_1px,transparent_1px)] [background-size:28px_28px]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/75 to-transparent"
      />

      <svg
        aria-hidden="true"
        viewBox="0 0 1000 520"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <marker
            id="leafy-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#657A82" />
          </marker>
          <marker
            id="leafy-arrow-active"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill="#00A35C" />
          </marker>
        </defs>

        {flows.map((flow) => {
          const active =
            flow.from === selectedModuleId || flow.to === selectedModuleId;
          const marker = active
            ? "url(#leafy-arrow-active)"
            : "url(#leafy-arrow)";
          return (
            <g key={flow.id}>
              <path
                d={flow.path}
                fill="none"
                stroke={active ? "#82CDB1" : "#8CA19F"}
                strokeWidth={active ? 4 : 2}
                strokeLinejoin="round"
                markerEnd={marker}
                markerStart={flow.bidirectional ? marker : undefined}
              />
              <path
                d={flow.path}
                fill="none"
                stroke={active ? "#00684A" : "#526E72"}
                strokeWidth={active ? 2.6 : 1.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="3 13"
                markerEnd={marker}
                markerStart={flow.bidirectional ? marker : undefined}
                className="leafy-factory-data-flow"
              />
            </g>
          );
        })}
      </svg>

      <div className="absolute bottom-3 right-3 rounded-lg border border-[#D8E3DF] bg-white/90 px-3 py-2 text-[10px] font-medium text-[#5C6C75] shadow-sm backdrop-blur">
        Animated dashes show data direction
      </div>

      {modules.map((module) => (
        <ModuleButton
          key={module.id}
          module={module}
          selected={module.id === selectedModuleId}
          onSelect={onSelectModule}
        />
      ))}
    </div>
  );
}

function FlowList({ flows, modules, selectedModuleId }) {
  const moduleById = Object.fromEntries(
    modules.map((module) => [module.id, module])
  );

  return (
    <div className="rounded-xl border border-[#D8E3DF] bg-[#F1F5F3] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#5C6C75]">
        Supplied data routes
      </p>
      <ol className="mt-3 grid gap-2">
        {flows.map((flow) => {
          const active =
            flow.from === selectedModuleId || flow.to === selectedModuleId;
          return (
            <li
              key={flow.id}
              className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
                active
                  ? "border-[#82CDB1] bg-[#E3FCF7] text-[#00684A]"
                  : "border-[#D8E3DF] bg-white text-[#3D4F58]"
              }`}
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
          );
        })}
      </ol>
    </div>
  );
}

function ModuleDetail({ module }) {
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <article className="min-w-0 rounded-2xl border border-[#D8E3DF] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#00684A]">
          {module.type}
        </p>
        <h3
          id="selected-module-title"
          className="mt-2 text-xl font-semibold tracking-[-0.015em] text-[#112733]"
        >
          {module.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#3D4F58]">
          {module.purpose}
        </p>

        <div className="mt-5 rounded-xl border-l-4 border-[#00A35C] bg-[#F1F5F3] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
            How it is built
          </p>
          <p className="mt-1.5 text-sm leading-6 text-[#273C45]">
            {module.build}
          </p>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
            Components
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {module.components.map((component) => (
              <span
                key={component}
                className="rounded-md border border-[#D8E3DF] bg-white px-2.5 py-1.5 text-xs font-medium text-[#3D4F58]"
              >
                {component}
              </span>
            ))}
          </div>
        </div>

        {module.links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {module.links.map((link, index) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8] ${
                  index === 0
                    ? "bg-[#00684A] text-white hover:bg-[#00593F]"
                    : "border border-[#B8C5C1] text-[#00684A] hover:border-[#00684A] hover:bg-[#F1F5F3]"
                }`}
              >
                {link.label}
                <Icon glyph="ArrowRight" size={14} />
              </a>
            ))}
          </div>
        )}
      </article>

      <JsonViewer
        label={module.sampleLabel}
        value={module.sample}
        maxHeight="430px"
      />
    </div>
  );
}

export default function ArchitectureExplorer({
  modules,
  flows,
  selectedModuleId,
  onSelectModule,
  sourceUrl,
}) {
  const selectedModule =
    modules.find((module) => module.id === selectedModuleId) || modules[0];

  return (
    <section
      id="architecture"
      aria-labelledby="architecture-title"
      className="scroll-mt-5"
    >
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00684A]">
            02 · Simulator architecture
          </p>
          <h2
            id="architecture-title"
            className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-[#112733]"
          >
            Explore the systems behind the line
          </h2>
          <p className="mt-3 text-base leading-7 text-[#5C6C75]">
            Select a module to see what it owns, how it is assembled, and the
            shape of data it contributes to the factory namespace.
          </p>
        </div>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-[#B8C5C1] bg-white px-3 py-2 text-sm font-semibold text-[#00684A] transition hover:border-[#00684A] hover:bg-[#F1F5F3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8]"
        >
          View complete source
          <Icon glyph="ArrowRight" size={15} />
        </a>
      </div>

      <div className="hidden lg:block">
        <ArchitectureCanvas
          modules={modules}
          flows={flows}
          selectedModuleId={selectedModule.id}
          onSelectModule={onSelectModule}
        />
      </div>

      <div className="grid gap-4 lg:hidden">
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map((module) => (
            <ModuleButton
              key={module.id}
              module={module}
              compact
              selected={module.id === selectedModule.id}
              onSelect={onSelectModule}
            />
          ))}
        </div>
        <FlowList
          flows={flows}
          modules={modules}
          selectedModuleId={selectedModule.id}
        />
      </div>

      <div
        id="selected-module-detail"
        className="mt-5"
        aria-labelledby="selected-module-title"
      >
        <ModuleDetail module={selectedModule} />
      </div>
    </section>
  );
}
