"use client";

import Icon from "@leafygreen-ui/icon";
import JsonViewer from "./JsonViewer";

const TONES = {
  emerald: {
    phase: "border-[#00A35C] bg-[#E3FCF7] text-[#00684A]",
    number: "bg-[#00684A] text-white",
    machine:
      "border-[#B8E4D2] bg-[#F3FCF8] hover:border-[#00A35C] hover:bg-white",
    selected:
      "border-[#00684A] bg-white shadow-[0_12px_30px_-20px_rgba(0,104,74,0.7)]",
  },
  teal: {
    phase: "border-[#1E9E93] bg-[#E2F5F2] text-[#075F58]",
    number: "bg-[#087F73] text-white",
    machine:
      "border-[#B7DDD8] bg-[#F1FAF8] hover:border-[#1E9E93] hover:bg-white",
    selected:
      "border-[#087F73] bg-white shadow-[0_12px_30px_-20px_rgba(8,127,115,0.7)]",
  },
  amber: {
    phase: "border-[#DB6C00] bg-[#FFF3DC] text-[#7A3D00]",
    number: "bg-[#B95700] text-white",
    machine:
      "border-[#EBCB9B] bg-[#FFF9ED] hover:border-[#DB6C00] hover:bg-white",
    selected:
      "border-[#B95700] bg-white shadow-[0_12px_30px_-20px_rgba(185,87,0,0.7)]",
  },
  blue: {
    phase: "border-[#167F93] bg-[#E5F4F6] text-[#0E5665]",
    number: "bg-[#167F93] text-white",
    machine:
      "border-[#BCDDE3] bg-[#F2FAFB] hover:border-[#167F93] hover:bg-white",
    selected:
      "border-[#167F93] bg-white shadow-[0_12px_30px_-20px_rgba(22,127,147,0.7)]",
  },
  slate: {
    phase: "border-[#5C6C75] bg-[#E8EDEB] text-[#273C45]",
    number: "bg-[#3D4F58] text-white",
    machine:
      "border-[#C1C7C6] bg-[#F4F6F5] hover:border-[#5C6C75] hover:bg-white",
    selected:
      "border-[#3D4F58] bg-white shadow-[0_12px_30px_-20px_rgba(61,79,88,0.7)]",
  },
};

function MetricChip({ children }) {
  return (
    <code className="rounded-md border border-[#D8E3DF] bg-[#F1F5F3] px-2 py-1 text-[11px] text-[#3D4F58]">
      {children}
    </code>
  );
}

function MachineDetail({ phase, machine }) {
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <article className="min-w-0 rounded-2xl border border-[#D8E3DF] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#E3FCF7] px-2.5 py-1 text-xs font-semibold text-[#00684A]">
            {phase.number} · {phase.title}
          </span>
          <span className="rounded-full border border-[#D8E3DF] px-2.5 py-1 text-xs text-[#5C6C75]">
            Simulator: {machine.implementation}
          </span>
        </div>
        <h3
          id="selected-machine-title"
          className="mt-4 text-xl font-semibold tracking-[-0.015em] text-[#112733]"
        >
          {machine.title}
        </h3>
        <p className="mt-3 text-sm leading-6 text-[#3D4F58]">
          {machine.purpose}
        </p>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-[#F1F5F3] p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
              Material in
            </dt>
            <dd className="mt-1.5 text-sm font-medium leading-5 text-[#112733]">
              {machine.input}
            </dd>
          </div>
          <div className="rounded-xl bg-[#E3FCF7] p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00684A]">
              Context out
            </dt>
            <dd className="mt-1.5 text-sm font-medium leading-5 text-[#112733]">
              {machine.output}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
            Published metrics
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {machine.metrics.map((metric) => (
              <MetricChip key={metric}>{metric}</MetricChip>
            ))}
          </div>
        </div>
      </article>

      <JsonViewer
        label={machine.sampleLabel}
        value={machine.sample}
        maxHeight="390px"
      />
    </div>
  );
}

export default function ProcessExplorer({
  phases,
  selectedMachineId,
  onSelectMachine,
}) {
  const selectedPhase =
    phases.find((phase) =>
      phase.machines.some((machine) => machine.id === selectedMachineId)
    ) || phases[0];
  const selectedMachine =
    selectedPhase.machines.find(
      (machine) => machine.id === selectedMachineId
    ) || selectedPhase.machines[0];

  return (
    <section id="process" aria-labelledby="process-title" className="scroll-mt-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00684A]">
            01 · Production process
          </p>
          <h2
            id="process-title"
            className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-[#112733]"
          >
            Follow one module from cell to finished pack
          </h2>
          <p className="mt-3 text-base leading-7 text-[#5C6C75]">
            Five phases coordinate eleven machines. Select any station to inspect
            the material transition and the JSON context it publishes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-[#5C6C75]">
          <span className="h-2 w-2 rounded-full bg-[#00A35C]" />
          Physical flow
          <span className="ml-2 h-px w-8 bg-[#889397]" />
          Digital trace
        </div>
      </div>

      <div className="cardlist-scrollbar overflow-x-auto pb-3">
        <div className="relative grid min-w-[1120px] grid-cols-5 gap-3 pt-2">
          <div
            aria-hidden="true"
            className="absolute left-[9%] right-[9%] top-[42px] h-px bg-[#9DB7B2]"
          >
            <span className="leafy-factory-line-flow absolute inset-y-[-1px] left-0 w-28 bg-gradient-to-r from-transparent via-[#00A35C] to-transparent" />
          </div>

          {phases.map((phase, phaseIndex) => {
            const tone = TONES[phase.tone];
            const phaseSelected = phase.id === selectedPhase.id;
            return (
              <article
                key={phase.id}
                className="leafy-factory-enter relative min-w-0"
                style={{ animationDelay: `${phaseIndex * 90}ms` }}
              >
                <button
                  type="button"
                  onClick={() => onSelectMachine(phase.machines[0].id)}
                  aria-pressed={phaseSelected}
                  className={`relative z-10 flex min-h-[128px] w-full flex-col rounded-2xl border p-4 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8] ${tone.phase} ${
                    phaseSelected ? "shadow-md" : "opacity-90 hover:opacity-100"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${tone.number}`}
                  >
                    {phase.number}
                  </span>
                  <span className="mt-3 text-sm font-semibold leading-5">
                    {phase.title}
                  </span>
                  {phaseIndex < phases.length - 1 && (
                    <Icon
                      glyph="ArrowRight"
                      size={16}
                      className="absolute right-3 top-4 opacity-55"
                    />
                  )}
                </button>

                <div className="mt-3 flex flex-col gap-2">
                  {phase.machines.map((machine) => {
                    const selected = machine.id === selectedMachine.id;
                    return (
                      <button
                        key={machine.id}
                        type="button"
                        onClick={() => onSelectMachine(machine.id)}
                        aria-pressed={selected}
                        aria-controls="selected-machine-detail"
                        className={`group flex min-h-[70px] items-center gap-3 rounded-xl border p-3 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8] ${
                          selected ? tone.selected : tone.machine
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                            selected
                              ? tone.number
                              : "bg-white text-[#5C6C75] shadow-sm"
                          }`}
                        >
                          {String(
                            phases
                              .slice(0, phaseIndex)
                              .reduce(
                                (total, item) => total + item.machines.length,
                                0
                              ) +
                              phase.machines.indexOf(machine) +
                              1
                          ).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 text-xs font-semibold leading-4 text-[#112733]">
                          {machine.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-lg border border-dashed border-[#C1C7C6] px-3 py-2 text-[11px] leading-4 text-[#5C6C75]">
                  <span className="font-semibold text-[#3D4F58]">Output:</span>{" "}
                  {phase.outcome}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div
        id="selected-machine-detail"
        className="mt-5"
        aria-labelledby="selected-machine-title"
      >
        <MachineDetail phase={selectedPhase} machine={selectedMachine} />
      </div>
    </section>
  );
}
