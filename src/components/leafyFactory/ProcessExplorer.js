"use client";

import Image from "next/image";

const MACHINE_IMAGES = {
  "cell-screening":
    "/img/machines/Cell-Screening-and-Grading-Station.png",
  "tab-processing": "/img/machines/Tab-Processing-Station.png",
  "z-fold": "/img/machines/Z-Fold-Stacking-Cell.png",
  "module-assembly":
    "/img/machines/Module-Assembly-and-Fixture-Cell.png",
  "laser-welding": "/img/machines/Tab-Laser-Welding-Cell.png",
  "ultrasonic-welding":
    "/img/machines/Busbar-Ultrasonic-Welding-Cell.png",
  "weld-monitoring":
    "/img/machines/Weld-Monitoring-and-Thermal-Imaging.png",
  "cooling-plate": "/img/machines/Cooling-Plate-Assembly-Cell.png",
  "pouch-sealing": "/img/machines/Pouch-Sealing-Cell-(Top+Side).png",
  "helium-test": "/img/machines/Helium-Leak-Test-Station.png",
  "eol-test": "/img/machines/EOL-Electrical-Test-Bench.png",
};

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

function MachineArtwork({ machine, large = false }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${
        large ? "h-24 w-24" : "h-12 w-12"
      }`}
    >
      <Image
        src={MACHINE_IMAGES[machine.id]}
        alt={large ? `${machine.title} icon` : ""}
        fill
        sizes={large ? "96px" : "48px"}
        className="object-contain p-1"
      />
    </span>
  );
}

function MachineDetail({ phase, machine, onOpenDocument }) {
  return (
    <article className="min-w-0 border-t border-[#D8E3DF] py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <MachineArtwork machine={machine} large />
          <div className="min-w-0">
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
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#3D4F58]">
              {machine.purpose}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            onOpenDocument(
              machine.sampleLabel,
              `${machine.title} · sample payload`,
              machine.sample
            )
          }
          aria-label={`View ${machine.sampleLabel}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C1C7C6] bg-white font-mono text-sm font-semibold text-[#00684A] transition hover:border-[#00684A] hover:bg-[#E3FCF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#016BF8]"
        >
          {"{}"}
        </button>
      </div>

      <dl className="mt-5 grid border-y border-[#D8E3DF] md:grid-cols-3 md:divide-x md:divide-[#D8E3DF]">
        <div className="py-4 md:pr-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
            Material in
          </dt>
          <dd className="mt-1.5 text-sm font-medium leading-5 text-[#112733]">
            {machine.input}
          </dd>
        </div>
        <div className="border-t border-[#D8E3DF] py-4 md:border-t-0 md:px-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00684A]">
            Context out
          </dt>
          <dd className="mt-1.5 text-sm font-medium leading-5 text-[#112733]">
            {machine.output}
          </dd>
        </div>
        <div className="border-t border-[#D8E3DF] py-4 md:border-t-0 md:pl-5">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5C6C75]">
            Published metrics
          </dt>
          <dd className="mt-2.5 flex flex-wrap gap-2">
            {machine.metrics.map((metric) => (
              <MetricChip key={metric}>{metric}</MetricChip>
            ))}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function ProcessExplorer({
  phases,
  selectedMachineId,
  onSelectMachine,
  onOpenDocument,
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
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1
          id="process-title"
          className="text-xl font-semibold tracking-[-0.015em] text-[#112733]"
        >
          Production process
        </h1>
        <span className="text-xs font-medium text-[#5C6C75]">
          5 phases · 11 machines
        </span>
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
            const tone = TONES.emerald;
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
                          selected
                            ? "border-[#82CDB1] bg-[#F8FAF9] shadow-[0_12px_30px_-20px_rgba(0,104,74,0.35)]"
                            : "border-[#E8EDEB] bg-[#FBFCFC] hover:border-[#C6D8D4] hover:bg-white"
                        }`}
                      >
                        <MachineArtwork machine={machine} />
                        <span className="min-w-0 text-xs font-semibold leading-4 text-[#112733]">
                          {machine.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 border-t border-dashed border-[#C1C7C6] px-1 pt-2 text-[11px] leading-4 text-[#5C6C75]">
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
        <MachineDetail
          phase={selectedPhase}
          machine={selectedMachine}
          onOpenDocument={onOpenDocument}
        />
      </div>
    </section>
  );
}
