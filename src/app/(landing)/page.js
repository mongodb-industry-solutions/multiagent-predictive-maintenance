"use client";

import Link from "next/link";
import FactoryConstellation from "@/components/factoryConstellation/FactoryConstellation";
import { STORY_STAGES } from "@/lib/const/navigation";

const stageTaglines = {
  "unified-namespace": "One live model of the shop floor.",
  "ai-workflows": "Answers grounded in factory data.",
  "agentic-ai": "Agents that decide and act.",
};

export default function Page() {
  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#000F12] text-white">
      {/* Background layers */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_50%_at_50%_-5%,rgba(0,104,74,0.46),transparent_68%),radial-gradient(ellipse_60%_55%_at_8%_105%,rgba(0,78,66,0.5),transparent_70%),radial-gradient(ellipse_55%_50%_at_100%_15%,rgba(0,163,92,0.16),transparent_68%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_50%_45%,black,transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,transparent_42%,rgba(0,11,10,0.6))]"
      />

      {/* Hero copy */}
      <header className="relative z-10 shrink-0 px-6 pt-[clamp(1.25rem,5.5vh,3.25rem)] text-center">
        <h1
          className="leafy-rise text-[clamp(2.1rem,5.6vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.03em]"
          style={{ animationDelay: "0.1s" }}
        >
          Leafy{" "}
          <span className="bg-gradient-to-r from-[#00ED64] via-[#5CE6A5] to-[#00A35C] bg-clip-text text-transparent">
            Factory
          </span>
        </h1>

        <p
          className="leafy-rise mx-auto mt-[clamp(0.4rem,1.2vh,0.9rem)] max-w-2xl text-[clamp(0.85rem,1.9vh,1.15rem)] leading-snug text-white/55"
          style={{ animationDelay: "0.2s" }}
        >
          A unified context layer to unlock AI in the factory shop floor
        </p>
      </header>

      {/* Main animation */}
      <div className="relative z-10 min-h-0 flex-1 px-2 sm:px-6">
        <FactoryConstellation />
      </div>

      {/* Stage entry points */}
      <footer className="relative z-10 shrink-0 px-4 pb-[clamp(1.5rem,5vh,3rem)] sm:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-3 gap-2 sm:gap-2.5">
          {STORY_STAGES.map((stage, index) => (
            <Link
              key={stage.id}
              href={stage.href}
              className="leafy-rise group relative flex flex-col items-start gap-1.5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#00ED64]/40 hover:bg-white/[0.07] hover:shadow-[0_18px_40px_-24px_rgba(0,237,100,0.65)] sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-3"
              style={{ animationDelay: `${0.55 + index * 0.1}s` }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#00ED64]/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#00ED64]/10 text-[10px] font-semibold text-[#8FE9BA] transition-colors duration-300 group-hover:border-[#00ED64]/40 group-hover:text-[#00ED64] sm:h-8 sm:w-8 sm:text-[11px]">
                {stage.number}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-semibold leading-tight text-white sm:truncate sm:text-sm">
                  {stage.label}
                </span>
                <span className="mt-0.5 hidden truncate text-xs leading-4 text-white/45 lg:block">
                  {stageTaglines[stage.id]}
                </span>
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="hidden h-4 w-4 shrink-0 text-white/30 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#00ED64] sm:block"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      </footer>
    </main>
  );
}
