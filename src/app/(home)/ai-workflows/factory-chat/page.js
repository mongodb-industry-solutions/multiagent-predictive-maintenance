"use client";

import Link from "next/link";
import Icon from "@leafygreen-ui/icon";
import { H2, H3, Body, Description } from "@leafygreen-ui/typography";
import PageContainer from "@/components/pageContainer/PageContainer";
import PlaceholderPanel from "@/components/placeholderPanel/PlaceholderPanel";

const sources = [
  ["Asset profile", "assets / CNC-042"],
  ["Telemetry", "machine_telemetry / last 60 min"],
  ["Maintenance", "work_orders / WO-27114"],
  ["Manual", "CNC-042 spindle guide / §4.3"],
];

const suggestions = [
  "Which assets need attention this shift?",
  "Why is CNC-042 vibration increasing?",
  "Show similar incidents from the last 90 days.",
];

export default function FactoryChatPage() {
  return (
    <PageContainer
        eyebrow="AI Workflows · Concept preview"
        title="Talk to your factory"
        description="Ask natural-language questions across live and historical factory context. The answer is grounded in the unified namespace and keeps its evidence visible."
        activeStageId="ai-workflows"
        actions={
          <Link
            href="/ai-workflows"
            className="inline-flex items-center gap-2 rounded-lg border border-[#C1C7C6] bg-white px-4 py-2.5 font-medium text-[#112733] hover:bg-[#F1F5F3]"
          >
            <Icon glyph="ArrowLeft" size={16} />
            Back to AI Workflows
          </Link>
        }
      >
        <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="flex min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white">
            <div className="flex items-center justify-between border-b border-[#D8E3DF] px-5 py-4">
              <div>
                <H2 className="text-[#112733]">Factory assistant</H2>
                <Description className="mt-1">
                  Grounded in Leafy Factory operational context
                </Description>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E3FCF7] px-3 py-1.5 text-xs font-medium text-[#00684A]">
                <span className="h-2 w-2 rounded-full bg-[#00A35C]" />
                Connected
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto bg-[#F8FAF9] p-5">
              <div className="ml-auto max-w-[78%] rounded-2xl rounded-br-sm bg-[#00684A] px-4 py-3 text-white">
                <Body className="text-white">
                  Why is CNC-042 vibration increasing, and should we stop it?
                </Body>
              </div>

              <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-[#D8E3DF] bg-white px-5 py-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E3FCF7] text-[#00684A]">
                    <Icon glyph="Wizard" size={16} />
                  </span>
                  <Body weight="medium" className="text-[#112733]">
                    Leafy Factory Assistant
                  </Body>
                </div>
                <Body className="leading-6 text-[#3D4F58]">
                  CNC-042&apos;s vibration rose 31% during the last hour and is
                  now above the asset&apos;s watch threshold, but spindle
                  temperature and product quality remain within limits.
                </Body>
                <Body className="mt-3 leading-6 text-[#3D4F58]">
                  The pattern resembles WO-27114, where tool imbalance caused a
                  similar gradual increase. I recommend completing the current
                  cycle, then inspecting tool balance and spindle bearings
                  before the next batch. An immediate emergency stop is not
                  indicated by the available evidence.
                </Body>
                <div className="mt-4 flex flex-wrap gap-2">
                  {sources.map(([label]) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full border border-[#B8E4D8] bg-[#E3FCF7] px-2.5 py-1 text-xs font-medium text-[#00684A]"
                    >
                      <Icon glyph="Link" size={12} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-[#D8E3DF] bg-white px-5 py-4 shadow-sm">
                <Body weight="medium" className="text-[#112733]">
                  Suggested next step
                </Body>
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#FFF4E5] p-3">
                  <Icon
                    glyph="Warning"
                    size={20}
                    className="shrink-0 text-[#944F01]"
                  />
                  <Body>
                    Create an inspection task for the end of the current cycle.
                  </Body>
                </div>
              </div>
            </div>

            <div className="border-t border-[#D8E3DF] bg-white p-4">
              <div className="flex items-center gap-3 rounded-xl border border-[#C1C7C6] bg-[#F8FAF9] px-4 py-3">
                <input
                  aria-label="Ask about the factory"
                  disabled
                  value=""
                  placeholder="Ask a question about your factory data…"
                  readOnly
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00684A] text-white opacity-60">
                  <Icon glyph="ArrowRight" size={16} />
                </span>
              </div>
            </div>
          </div>

          <div className="grid content-start gap-5">
            <PlaceholderPanel
              eyebrow="Retrieved context"
              title="Evidence"
              description="Every answer can expose the operational sources used to create it."
              glyph="File"
            >
              <div className="grid gap-2">
                {sources.map(([label, path]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[#D8E3DF] bg-[#F8FAF9] p-3"
                  >
                    <Body weight="medium" className="text-sm text-[#112733]">
                      {label}
                    </Body>
                    <p className="mt-1 break-words font-mono text-xs text-[#5C6C75]">
                      {path}
                    </p>
                  </div>
                ))}
              </div>
            </PlaceholderPanel>

            <div className="rounded-2xl border border-[#D8E3DF] bg-white p-5">
              <H3 className="text-base text-[#112733]">Try asking</H3>
              <div className="mt-3 grid gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    disabled
                    className="rounded-lg border border-[#D8E3DF] px-3 py-2.5 text-left text-sm text-[#3D4F58]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-[#00A35C] bg-[#E3FCF7] p-5">
          <Body weight="medium" className="text-[#00684A]">
            Concept preview
          </Body>
          <Description className="mt-1 leading-6 text-[#3D4F58]">
            The conversation and sources are representative static content.
            Future work can connect this experience to a retrieval workflow over
            the MongoDB-backed unified namespace.
          </Description>
        </section>
    </PageContainer>
  );
}
