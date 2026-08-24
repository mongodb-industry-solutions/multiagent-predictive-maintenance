"use client";

import Link from "next/link";
import Icon from "@leafygreen-ui/icon";
import { H2, H3, Body, Description } from "@leafygreen-ui/typography";
import PageContainer from "@/components/pageContainer/PageContainer";
import PlaceholderPanel from "@/components/placeholderPanel/PlaceholderPanel";

const factors = [
  ["Safety impact", "3 / 5", "Guarded equipment; no direct exposure"],
  ["Production impact", "5 / 5", "Line 4 bottleneck; no installed redundancy"],
  ["Quality impact", "4 / 5", "Controls final-dimension tolerance"],
  ["Failure likelihood", "3 / 5", "Two vibration warnings in 90 days"],
  ["Detectability", "2 / 5", "Telemetry provides early warning"],
];

const workflow = [
  ["Retrieve", "Asset, telemetry, work orders, production dependencies"],
  ["Evaluate", "Apply the approved scoring rubric to each factor"],
  ["Explain", "Link every score to evidence and uncertainty"],
  ["Review", "Reliability engineer approves or adjusts the result"],
];

export default function CriticalityAnalysisPage() {
  return (
    <PageContainer
        eyebrow="AI Workflows · Concept preview"
        title="Asset criticality analysis"
        description="Use a governed AI workflow to gather factory evidence, apply a consistent scoring model, explain the result, and keep a reliability engineer in control."
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
        <section className="grid gap-5 xl:grid-cols-[330px_1fr]">
          <PlaceholderPanel
            eyebrow="Selected asset"
            title="CNC-042"
            description="5-axis machining center · Final Assembly / Line 4"
            glyph="Wrench"
            highlights={[
              "Supports 38% of Line 4 throughput",
              "No equivalent standby asset",
              "12 work orders in the last 24 months",
              "Condition monitoring available",
            ]}
            footer={
              <div className="flex items-center justify-between">
                <Body className="text-sm text-[#3D4F58]">Data confidence</Body>
                <Body weight="medium" className="text-[#00684A]">
                  High · 92%
                </Body>
              </div>
            }
          >
            <div className="rounded-xl bg-[#F8FAF9] p-4">
              <Description>Assessment standard</Description>
              <Body weight="medium" className="mt-1 text-[#112733]">
                ISO 14224 aligned rubric
              </Body>
            </div>
          </PlaceholderPanel>

          <div className="grid gap-5">
            <div className="rounded-2xl border border-[#D8E3DF] bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <Body
                    weight="medium"
                    className="uppercase tracking-[0.13em] text-[#00684A]"
                  >
                    Workflow run · Draft
                  </Body>
                  <H2 className="mt-2 text-[#112733]">
                    Transparent, predetermined path
                  </H2>
                </div>
                <span className="rounded-full bg-[#E3FCF7] px-3 py-1.5 text-xs font-medium text-[#00684A]">
                  Awaiting human review
                </span>
              </div>
              <ol className="mt-6 grid gap-3 md:grid-cols-4">
                {workflow.map(([title, body], index) => (
                  <li
                    key={title}
                    className="relative rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4"
                  >
                    <span className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#00684A] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <H3 className="text-base text-[#112733]">{title}</H3>
                    <Description className="mt-1 text-sm leading-5">
                      {body}
                    </Description>
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div className="overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white">
                <div className="border-b border-[#D8E3DF] px-5 py-4">
                  <H3 className="text-[#112733]">Scoring evidence</H3>
                  <Description className="mt-1">
                    Every factor is backed by retrieved operational context.
                  </Description>
                </div>
                <div className="divide-y divide-[#E8EDEB]">
                  {factors.map(([factor, score, evidence]) => (
                    <div
                      key={factor}
                      className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_72px_1.4fr] sm:items-center"
                    >
                      <Body weight="medium" className="text-[#112733]">
                        {factor}
                      </Body>
                      <span className="w-fit rounded-full bg-[#F1F5F3] px-2.5 py-1 text-sm font-medium text-[#3D4F58]">
                        {score}
                      </span>
                      <Description className="text-sm">{evidence}</Description>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col rounded-2xl bg-[#112733] p-6 text-white">
                <Body
                  weight="medium"
                  className="uppercase tracking-[0.13em] text-[#B8E4D8]"
                >
                  Recommended class
                </Body>
                <p className="mt-4 text-6xl font-semibold text-[#00ED64]">A</p>
                <H2 className="mt-2 text-white">Business critical</H2>
                <p className="mt-3 flex-1 text-sm leading-6 text-[#DCEBE7]">
                  Prioritize condition monitoring, planned inspection, and
                  stocked spindle-bearing spares. Review the score in six months
                  or after a process change.
                </p>
                <div className="mt-5 border-t border-white/15 pt-4">
                  <Body className="text-sm text-[#B8E4D8]">
                    Composite score
                  </Body>
                  <p className="mt-1 text-2xl font-semibold">82 / 100</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#D8E3DF] bg-white p-5">
              <div>
                <Body weight="medium" className="text-[#112733]">
                  Human decision point
                </Body>
                <Description className="mt-1">
                  A reliability engineer reviews evidence before publishing the
                  criticality class.
                </Description>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-[#C1C7C6] px-4 py-2 text-sm font-medium text-[#3D4F58] opacity-70"
                >
                  Adjust score
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg bg-[#00684A] px-4 py-2 text-sm font-medium text-white opacity-70"
                >
                  Approve result
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-dashed border-[#00A35C] bg-[#E3FCF7] p-5">
          <Body weight="medium" className="text-[#00684A]">
            Concept preview
          </Body>
          <Description className="mt-1 leading-6 text-[#3D4F58]">
            The assessment is representative static content. Future work can
            execute the retrieval and scoring steps against live MongoDB data
            while persisting evidence, versions, and approvals.
          </Description>
        </section>
    </PageContainer>
  );
}
