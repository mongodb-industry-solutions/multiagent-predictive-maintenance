"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@leafygreen-ui/icon";
import {
  ARCHITECTURE_FLOWS,
  ARCHITECTURE_MODULES,
  FACTORY_SOURCE_URL,
  PROCESS_PHASES,
} from "@/lib/const/leafyFactory";
import ArchitectureExplorer from "./ArchitectureExplorer";
import ProcessExplorer from "./ProcessExplorer";

const SECTION_LINKS = [
  { href: "#why", label: "Why it matters", number: "00" },
  { href: "#process", label: "Production process", number: "01" },
  { href: "#architecture", label: "Architecture", number: "02" },
];

function Hero() {
  return (
    <header className="leafy-factory-enter relative overflow-hidden rounded-[24px] bg-[#062A2D] text-white shadow-[0_24px_70px_-38px_rgba(0,38,40,0.9)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(213,255,235,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(213,255,235,0.22)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:linear-gradient(to_right,black,transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-28 h-80 w-80 rounded-full border border-[#00ED64]/20"
      />
      <div
        aria-hidden="true"
        className="absolute -right-9 -top-12 h-56 w-56 rounded-full border border-[#00ED64]/15"
      />

      <div className="relative grid min-h-[440px] lg:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
        <div className="flex min-w-0 flex-col justify-between p-6 sm:p-9 lg:p-11">
          <div>
            <Link
              href="/unified-namespace"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A5DCC6] transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7FE8B2]"
            >
              <Icon glyph="ArrowLeft" size={16} />
              Unified Namespace
            </Link>
            <p className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-[#7FE8B2]">
              The foundation for every use case
            </p>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Leafy Factory
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-[#D0E6E0] sm:text-lg sm:leading-8">
              A simulated EV battery module line where business orders, machine
              signals, quality events, and full production genealogy become one
              explorable digital thread.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#process"
              className="inline-flex items-center gap-2 rounded-lg bg-[#00A35C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00BD68] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Explore the line
              <Icon glyph="ArrowRight" size={16} />
            </a>
            <a
              href={FACTORY_SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/45 hover:bg-white/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              View simulator source
              <Icon glyph="ArrowRight" size={16} />
            </a>
          </div>
        </div>

        <aside className="relative m-4 min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#031C22]/75 p-6 backdrop-blur-sm sm:m-6 sm:p-7 lg:ml-0 lg:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-y-8 left-[39px] w-px bg-gradient-to-b from-[#00ED64]/10 via-[#00ED64]/65 to-[#00ED64]/10"
          />
          <p className="relative pl-12 text-xs font-semibold uppercase tracking-[0.18em] text-[#8FE9BA]">
            One digital thread
          </p>
          <ol className="relative mt-7 space-y-7">
            {[
              ["Order", "ERP customer demand and product intent"],
              ["Cell", "Electrical grade and material identity"],
              ["Module", "Every process result and quality gate"],
              ["Outcome", "A complete, queryable production record"],
            ].map(([title, description], index) => (
              <li key={title} className="grid grid-cols-[32px_1fr] gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#00ED64]/45 bg-[#083B38] text-[10px] font-bold text-[#9AF2C4]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    {title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-white/55">
                    {description}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <div className="relative mt-8 border-t border-white/10 pt-6">
            <span className="text-4xl font-semibold tracking-[-0.04em] text-white">
              5
            </span>
            <span className="ml-2 text-sm text-white/50">phases</span>
            <span className="ml-6 text-lg font-semibold text-[#8FE9BA]">
              11
            </span>
            <span className="ml-1.5 text-xs text-white/50">machines</span>
            <span className="ml-5 text-lg font-semibold text-[#8FE9BA]">
              6
            </span>
            <span className="ml-1.5 text-xs text-white/50">systems</span>
          </div>
        </aside>
      </div>
    </header>
  );
}

function SectionNav() {
  return (
    <nav
      aria-label="Leafy Factory sections"
      className="leafy-factory-enter flex overflow-x-auto rounded-xl border border-[#D8E3DF] bg-white p-1.5 shadow-sm"
      style={{ animationDelay: "100ms" }}
    >
      {SECTION_LINKS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="group flex min-w-max flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-[#3D4F58] transition hover:bg-[#E3FCF7] hover:text-[#00684A] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#016BF8]"
        >
          <span className="font-mono text-[10px] text-[#889397] group-hover:text-[#00A35C]">
            {item.number}
          </span>
          {item.label}
        </a>
      ))}
    </nav>
  );
}

function WhyItMatters() {
  return (
    <section
      id="why"
      aria-labelledby="why-title"
      className="scroll-mt-5"
    >
      <div className="mb-5 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#00684A]">
          00 · Why it matters
        </p>
        <h2
          id="why-title"
          className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-[#112733]"
        >
          Factory data is useful when its context survives
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[1.35fr_0.65fr]">
        <article className="leafy-factory-enter relative overflow-hidden rounded-2xl bg-[#123B4A] p-6 text-white sm:p-8">
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full border-[28px] border-white/[0.04]"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#8FE9BA]">
            From event to evidence
          </p>
          <h3 className="mt-3 max-w-2xl text-2xl font-semibold tracking-[-0.02em]">
            MQTT moves the signal. MongoDB keeps the operational truth.
          </h3>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">
            A transient machine reading gains order, product, cell, module, and
            quality context. The resulting document can support operations,
            analytics, predictive maintenance, and AI without rebuilding that
            history for every application.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-2 text-xs font-semibold">
            {["Signal", "Context", "Genealogy", "Action"].map(
              (label, index, labels) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5">
                    {label}
                  </span>
                  {index < labels.length - 1 && (
                    <Icon
                      glyph="ArrowRight"
                      size={13}
                      className="text-[#7FE8B2]"
                    />
                  )}
                </span>
              )
            )}
          </div>
        </article>

        <div className="grid gap-4">
          <article
            className="leafy-factory-enter rounded-2xl border border-[#D8E3DF] bg-white p-5"
            style={{ animationDelay: "80ms" }}
          >
            <span className="font-mono text-xs font-semibold text-[#00A35C]">
              A
            </span>
            <h3 className="mt-2 text-base font-semibold text-[#112733]">
              Traceability by design
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#5C6C75]">
              Follow cells into a module and connect every process result back
              to its customer order.
            </p>
          </article>
          <article
            className="leafy-factory-enter rounded-2xl border border-[#B8E4D2] bg-[#E3FCF7] p-5"
            style={{ animationDelay: "160ms" }}
          >
            <span className="font-mono text-xs font-semibold text-[#00684A]">
              B
            </span>
            <h3 className="mt-2 text-base font-semibold text-[#112733]">
              A shared foundation
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#3D4F58]">
              The same durable context grounds dashboards, anomaly detection,
              workflow automation, and coordinated agents.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

function ClosingCallout() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#B8E4D2] bg-[#E3FCF7] p-6 sm:p-8">
      <div
        aria-hidden="true"
        className="absolute bottom-0 right-0 h-full w-1/3 bg-[linear-gradient(135deg,transparent,rgba(0,163,92,0.08))]"
      />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#00684A]">
            Continue the story
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#112733]">
            See the Unified Namespace in action
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#3D4F58]">
            Create a production order, watch the line publish live events, and
            inspect the MongoDB documents and analytics they produce.
          </p>
        </div>
        <Link
          href="/unified-namespace/uns-in-action"
          className="inline-flex items-center gap-2 rounded-lg bg-[#00684A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00593F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#016BF8]"
        >
          Open UNS in Action
          <Icon glyph="ArrowRight" size={16} />
        </Link>
      </div>
    </section>
  );
}

export default function LeafyFactoryExplainer() {
  const [selectedMachineId, setSelectedMachineId] = useState(
    PROCESS_PHASES[0].machines[0].id
  );
  const [selectedModuleId, setSelectedModuleId] = useState("mqtt");

  return (
    <main className="w-full pb-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-2 py-4 sm:px-4 lg:px-6">
        <Hero />
        <SectionNav />
        <WhyItMatters />
        <ProcessExplorer
          phases={PROCESS_PHASES}
          selectedMachineId={selectedMachineId}
          onSelectMachine={setSelectedMachineId}
        />
        <ArchitectureExplorer
          modules={ARCHITECTURE_MODULES}
          flows={ARCHITECTURE_FLOWS}
          selectedModuleId={selectedModuleId}
          onSelectModule={setSelectedModuleId}
          sourceUrl={FACTORY_SOURCE_URL}
        />
        <ClosingCallout />
      </div>
    </main>
  );
}
