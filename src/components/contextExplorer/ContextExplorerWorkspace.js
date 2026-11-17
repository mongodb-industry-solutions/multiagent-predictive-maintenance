"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@via-ds/icons";
import InfoWizard from "@/components/infoWizard/InfoWizard";
import { CONTEXT_EXPLORER_TALK_TRACK } from "@/lib/const/talkTrack";
import { getCurrentDemoDay } from "@/lib/connectedFactory/constants";
import {
  buildContextExplorerPrompts,
  buildContextExplorerSteps,
} from "@/lib/connectedFactory/steps";
import PipelinePane from "./PipelinePane";
import ResultPane, { HighlightedJson } from "./ResultPane";
import AskInWordsPane from "./AskInWordsPane";
import StepStoryModal from "./StepStoryModal";

const DATA_COLLECTION_DESCRIPTIONS = {
  telemetry:
    "Weld-zone temperature, laser power, and shield-gas flow on LTW-04 (24h TTL)",
  alerts:
    "LTW-04 edge alarms carry machine_id & ts, with no order or material ID",
  workorders:
    "Stores M1 maintenance orders alongside LTW-04 production order spans",
  materials:
    "ERP cell-tab and busbar foil master data including maxWeldTempC thermal limits",
};

const STEP0_SKELETON_COLLECTIONS = [
  {
    name: "telemetry",
    timeseries: true,
    lines: [
      { indent: 1, keyW: "w-10", valW: "w-36", accent: false },
      { indent: 1, keyW: "w-20", brace: true },
      { indent: 2, keyW: "w-12", valW: "w-16", accent: true },
      { indent: 2, keyW: "w-24", valW: "w-24", accent: true },
      { indent: 2, keyW: "w-20", valW: "w-16", accent: true },
      { indent: 2, keyW: "w-28", valW: "w-20", accent: true },
      { indent: 2, keyW: "w-14", valW: "w-28", accent: false },
      { indent: 2, keyW: "w-20", valW: "w-24", accent: true },
      { indent: 1, closeBrace: true },
      { indent: 1, keyW: "w-12", valW: "w-14", accent: false },
    ],
  },
  {
    name: "alerts",
    timeseries: false,
    lines: [
      { indent: 1, keyW: "w-16", valW: "w-28", accent: false },
      { indent: 1, keyW: "w-12", valW: "w-16", accent: true },
      { indent: 1, keyW: "w-16", valW: "w-20", accent: false },
      { indent: 1, keyW: "w-20", valW: "w-36", accent: false },
      { indent: 1, keyW: "w-20", valW: "w-16", accent: true },
      { indent: 1, keyW: "w-16", valW: "w-8", accent: false },
      { indent: 1, keyW: "w-14", valW: "w-32", accent: false },
      { indent: 1, keyW: "w-14", valW: "w-28", accent: false },
      { indent: 1, keyW: "w-8", valW: "w-36", accent: false },
    ],
  },
  {
    name: "workorders",
    timeseries: false,
    lines: [
      { indent: 1, keyW: "w-20", valW: "w-24", accent: true },
      { indent: 1, keyW: "w-12", valW: "w-16", accent: true },
      { indent: 1, keyW: "w-20", valW: "w-36", accent: false },
      { indent: 1, keyW: "w-20", valW: "w-16", accent: true },
      { indent: 1, keyW: "w-28", valW: "w-24", accent: true },
      { indent: 1, keyW: "w-20", valW: "w-20", accent: true },
      { indent: 1, keyW: "w-20", valW: "w-10", accent: false },
      { indent: 1, keyW: "w-16", valW: "w-24", accent: true },
      { indent: 1, keyW: "w-20", valW: "w-36", accent: false },
    ],
  },
  {
    name: "materials",
    timeseries: false,
    lines: [
      { indent: 1, keyW: "w-28", valW: "w-24", accent: true },
      { indent: 1, keyW: "w-24", valW: "w-12", accent: false },
      { indent: 1, keyW: "w-24", valW: "w-12", accent: false },
      { indent: 1, keyW: "w-12", valW: "w-40", accent: false },
      { indent: 1, keyW: "w-16", valW: "w-20", accent: false },
      { indent: 1, keyW: "w-24", valW: "w-14", accent: false },
    ],
  },
];

function CollectionCardSkeleton({ spec }) {
  return (
    <section
      aria-busy="true"
      aria-label={`Loading ${spec.name} collection sample`}
      className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm"
    >
      <header className="border-b border-[#D8E3DF] bg-[#F8FAF9] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <code className="font-mono text-base font-bold text-[#112733]">
            {spec.name}
          </code>
          <span className="rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-medium text-[#00684A]">
            {spec.timeseries ? "time series" : "collection"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-4 w-36 animate-pulse rounded-md bg-[#E3ECE8]" />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-hidden bg-white p-3.5 font-mono text-sm leading-6">
        <div className="text-[#B8C5C2]">{"{"}</div>
        <div className="my-1 space-y-2.5">
          {spec.lines.map((line, idx) =>
            line.closeBrace ? (
              <div key={idx} className="pl-4 text-[#B8C5C2]">
                {"},"}
              </div>
            ) : (
              <div
                key={idx}
                className={`flex items-center gap-2 ${
                  line.indent === 2 ? "pl-8" : "pl-4"
                }`}
              >
                <span
                  className={`h-3.5 ${line.keyW} animate-pulse rounded ${
                    line.accent ? "bg-[#D5F5EC]" : "bg-[#E8EFEC]"
                  }`}
                />
                <span className="text-[#C8D3D0]">:</span>
                {line.brace ? (
                  <span className="text-[#B8C5C2]">{"{"}</span>
                ) : (
                  <span
                    className={`h-3.5 ${line.valW} animate-pulse rounded ${
                      line.accent ? "bg-[#E3FCF7]" : "bg-[#F1F5F3]"
                    }`}
                  />
                )}
              </div>
            )
          )}
        </div>
        <div className="text-[#B8C5C2]">{"}"}</div>
      </div>

      <footer className="border-t border-[#E8EDEB] bg-[#F8FAF9] px-4 py-2.5 text-sm leading-5 text-[#5C6C75]">
        {DATA_COLLECTION_DESCRIPTIONS[spec.name]}
      </footer>
    </section>
  );
}

export default function ContextExplorerWorkspace() {
  const [stepIdx, setStepIdx] = useState(0);
  const [statusData, setStatusData] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [retryingInit, setRetryingInit] = useState(false);
  const [seedError, setSeedError] = useState("");

  const activeDay = statusData?.demoDay || getCurrentDemoDay();
  const steps = useMemo(() => buildContextExplorerSteps(activeDay), [activeDay]);
  const prompts = useMemo(
    () => buildContextExplorerPrompts(activeDay),
    [activeDay]
  );

  // Per-step custom pipeline edits (keyed by `${activeDay}:${stepId}`)
  const [customPipelines, setCustomPipelines] = useState({});
  const [editing, setEditing] = useState(false);
  const [viewMode, setViewMode] = useState("json");
  const [runResult, setRunResult] = useState(null);
  const [runError, setRunError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  // Signature state for Step 6 / 6.1
  const [querySignature, setQuerySignature] = useState(null);
  const [showingSignature, setShowingSignature] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);

  // Story Visual modal & InfoWizard
  const [storyOpen, setStoryOpen] = useState(false);
  const [storySlideId, setStorySlideId] = useState("overview");
  const [infoOpen, setInfoOpen] = useState(false);

  const currentStep = steps[stepIdx];

  const firstProjectStepIdx = useMemo(
    () =>
      steps.findIndex(
        (s) => s.kind === "query" && /\$project/.test(s.pipeline || "")
      ),
    [steps]
  );

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/connected-factory/status");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load status");
      setStatusData(json);
      if (json.initError) setSeedError(json.initError);
      return json;
    } catch (err) {
      setSeedError(err.message);
      return null;
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchSignature = useCallback(
    async (dayOverride) => {
      const targetDay = dayOverride || activeDay;
      try {
        const res = await fetch(
          `/api/connected-factory/signature?machineId=LTW-04&start=${targetDay}T08:12:30Z&end=${targetDay}T08:16:30Z`
        );
        const json = await res.json();
        if (res.ok && !json.error) {
          setQuerySignature(json);
          return json;
        }
      } catch {
        // signature not available until seeded
      }
      return null;
    },
    [activeDay]
  );

  useEffect(() => {
    fetchStatus().then((st) => {
      if (st?.seeded) {
        fetchSignature(st.demoDay);
      }
    });
  }, [fetchSignature, fetchStatus]);

  // Poll automatically while background initialization or Atlas Vector Search index build is in progress
  useEffect(() => {
    if (!statusData) return undefined;
    const needsPoll =
      statusData.initializing ||
      (!statusData.seeded && !statusData.initError) ||
      (statusData.seeded &&
        !statusData.vectorIndex?.queryable &&
        statusData.vectorIndex?.status !== "UNAVAILABLE");
    if (!needsPoll) return undefined;

    const intervalMs = !statusData.seeded || statusData.initializing ? 2500 : 5000;
    const timer = setInterval(async () => {
      const updated = await fetchStatus();
      if (updated?.seeded && !querySignature) {
        fetchSignature(updated.demoDay);
      }
    }, intervalMs);
    return () => clearInterval(timer);
  }, [fetchSignature, fetchStatus, querySignature, statusData]);

  const handleRetryInit = async () => {
    setRetryingInit(true);
    setSeedError("");
    try {
      const res = await fetch("/api/connected-factory/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Initialization failed");
      setStatusData(json);
    } catch (err) {
      setSeedError(err.message);
    } finally {
      setRetryingInit(false);
    }
  };

  const selectStep = useCallback(
    (nextIdx) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, nextIdx));
      const nextStep = steps[clamped];
      setStepIdx(clamped);
      setEditing(false);
      setShowingSignature(false);
      setRunResult(null);
      setRunError("");
      setViewMode(nextStep.view || "json");
    },
    [steps]
  );

  const prevPipelineForStep = useMemo(() => {
    if (stepIdx === 0) return "";
    const prev = steps[stepIdx - 1];
    if (
      prev?.kind === "query" &&
      currentStep?.kind === "query" &&
      prev.collection === currentStep.collection
    ) {
      return customPipelines[`${activeDay}:${prev.id}`] || prev.pipeline;
    }
    return "";
  }, [activeDay, currentStep, customPipelines, stepIdx, steps]);

  const handleRunQuery = useCallback(async () => {
    if (currentStep.kind !== "query" || isRunning) return;
    const pipelineText =
      customPipelines[`${activeDay}:${currentStep.id}`] ?? currentStep.pipeline;

    setIsRunning(true);
    setRunError("");
    try {
      const res = await fetch("/api/connected-factory/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: currentStep.collection,
          pipeline: pipelineText,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setRunError(json.error || `HTTP ${res.status}`);
        setRunResult(null);
        return;
      }
      setRunResult(json);
      if (json.count > 1 && viewMode === "json") {
        setViewMode("table");
      }
    } catch (err) {
      setRunError(err.message || "Failed to execute pipeline");
      setRunResult(null);
    } finally {
      setIsRunning(false);
    }
  }, [activeDay, currentStep, customPipelines, isRunning, viewMode]);

  const handleToggleSignature = useCallback(async () => {
    if (showingSignature) {
      setShowingSignature(false);
      return;
    }
    if (querySignature) {
      setShowingSignature(true);
      return;
    }
    setSignatureLoading(true);
    const fetched = await fetchSignature();
    setSignatureLoading(false);
    if (fetched) setShowingSignature(true);
  }, [fetchSignature, querySignature, showingSignature]);

  const openStoryForCurrentStep = useCallback(() => {
    setStorySlideId(currentStep.visualSlideId || "overview");
    setStoryOpen(true);
  }, [currentStep.visualSlideId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (storyOpen || infoOpen) return;
      const tag = event.target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (event.key === "ArrowRight" && stepIdx < steps.length - 1) {
        event.preventDefault();
        selectStep(stepIdx + 1);
      } else if (event.key === "ArrowLeft" && stepIdx > 0) {
        event.preventDefault();
        selectStep(stepIdx - 1);
      } else if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter" &&
        currentStep.kind === "query"
      ) {
        event.preventDefault();
        handleRunQuery();
      } else if (event.key === "e" && currentStep.kind === "query") {
        event.preventDefault();
        setEditing(true);
      } else if (event.key === "p") {
        event.preventDefault();
        openStoryForCurrentStep();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    currentStep.kind,
    handleRunQuery,
    infoOpen,
    openStoryForCurrentStep,
    selectStep,
    stepIdx,
    steps.length,
    storyOpen,
  ]);

  const fourCollections = useMemo(
    () =>
      (statusData?.collections || []).filter((c) => c.name !== "excursions"),
    [statusData]
  );

  return (
    <main className="flex h-full min-h-0 w-full flex-col gap-3 pb-2">
      {/* Top navigation & status bar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 py-1">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[#112733]">
            Connected Factory Context Explorer
          </h1>
          <Link
            href="/ai-workflows"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
          >
            <Icon glyph="ArrowLeft" size={16} />
            <span>Back to overview</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {statusLoading && (
            <>
              <span
                aria-hidden="true"
                className="h-7 w-36 animate-pulse rounded-full border border-[#E8EDEB] bg-[#F1F5F3]"
              />
              <span
                aria-hidden="true"
                className="h-7 w-28 animate-pulse rounded-full border border-[#E8EDEB] bg-[#F1F5F3]"
              />
            </>
          )}

          {statusData?.seeded && (
            <div className="hidden items-center gap-1.5 rounded-full border border-[#D8E3DF] bg-white px-3 py-1 font-mono text-sm text-[#5C6C75] 2xl:inline-flex">
              {fourCollections
                .map(
                  (c) =>
                    `${c.name} ${(c.scopeCount || c.count).toLocaleString()}`
                )
                .join(" · ")}
            </div>
          )}

          {statusData?.seeded && (
            <span
              title={`Atlas Vector Search index: ${statusData.vectorIndex?.name}`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm font-medium ${
                statusData.vectorIndex?.queryable
                  ? "border-[#B8E4D2] bg-[#E3FCF7] text-[#00684A]"
                  : "border-[#EBCB9B] bg-[#FEF7DB] text-[#944F01]"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  statusData.vectorIndex?.queryable
                    ? "bg-[#00A35C]"
                    : "animate-pulse bg-[#DB6C00]"
                }`}
              />
              {statusData.vectorIndex?.queryable
                ? "vector index ready"
                : "vector index building"}
            </span>
          )}

          {statusData?.agent && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm font-medium ${
                statusData.agent.ok
                  ? "border-[#B8E4D2] bg-[#E3FCF7] text-[#00684A]"
                  : "border-[#FFCDC7] bg-[#FFEAE5] text-[#8C210F]"
              }`}
            >
              {statusData.agent.text}
            </span>
          )}

          <button
            type="button"
            onClick={openStoryForCurrentStep}
            title="Open visual story diagram for this step (shortcut: p)"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#C1C7C6] bg-white px-3 text-sm font-semibold text-[#112733] transition hover:border-[#00A35C] hover:bg-[#F8FAF9]"
          >
            <Icon glyph="Diagram" size={14} className="text-[#00684A]" />
            Story Visual
          </button>

          <InfoWizard
            open={infoOpen}
            setOpen={setInfoOpen}
            sections={CONTEXT_EXPLORER_TALK_TRACK}
            iconOnly
            iconGlyph="InfoWithCircle"
            tooltipText="Demo talk track & step guide"
          />
        </div>
      </div>

      {/* Step tabs */}
      <nav
        aria-label="Connected Factory Context Explorer steps"
        className="flex shrink-0 items-center gap-1 overflow-x-auto rounded-xl border border-[#D8E3DF] bg-white px-2 py-1.5 shadow-2xs"
      >
        {steps.map((step, idx) => {
          const active = idx === stepIdx;
          const completed = idx < stepIdx;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => selectStep(idx)}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                active
                  ? "bg-[#E3FCF7] font-semibold text-[#00684A] ring-1 ring-[#00A35C]/50"
                  : completed
                    ? "text-[#3D4F58] hover:bg-[#F1F5F3]"
                    : "text-[#5C6C75] hover:bg-[#F1F5F3]"
              }`}
            >
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-mono text-sm font-semibold ${
                  active
                    ? "bg-[#00684A] text-white"
                    : completed
                      ? "bg-[#D8E3DF] text-[#112733]"
                      : "bg-[#F1F5F3] text-[#5C6C75]"
                }`}
              >
                {step.num}
              </span>
              <span>
                {step.title}
                {step.star ? " ★" : ""}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Automatic first-time environment provisioning view */}
      {!statusLoading && statusData && !statusData.seeded ? (
        <section className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-[#D8E3DF] bg-white p-8 text-center shadow-sm">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E3FCF7] text-[#00684A]">
            <Icon
              glyph={seedError ? "Warning" : "Refresh"}
              size={26}
              className={seedError ? "" : "animate-spin"}
            />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-[#112733]">
            {seedError
              ? "Connected Factory Context Setup Needs Attention"
              : "Preparing Connected Factory Context in MongoDB…"}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#5C6C75]">
            {seedError
              ? "Automatic provisioning encountered an error while checking or populating LTW-04 records."
              : "Populating missing LTW-04 welding telemetry, alerts, production workorders, material limits, and the Atlas Vector Search index. Existing Leafy Factory collections remain intact — this page will open automatically in a few seconds."}
          </p>
          {seedError && (
            <>
              <p className="mt-3 rounded-lg bg-[#FFEAE5] px-4 py-2 font-mono text-sm text-[#8C210F]">
                {seedError}
              </p>
              <button
                type="button"
                disabled={retryingInit}
                onClick={handleRetryInit}
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#00684A] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00513A] disabled:opacity-50"
              >
                <Icon
                  glyph="Refresh"
                  size={16}
                  className={retryingInit ? "animate-spin" : ""}
                />
                {retryingInit ? "Retrying…" : "Retry Setup"}
              </button>
            </>
          )}
        </section>
      ) : (
        /* Main step body */
        <div className="flex min-h-0 flex-1 flex-col">
          {currentStep.kind === "data" && (
            <div className="grid min-h-[420px] flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statusLoading
                ? STEP0_SKELETON_COLLECTIONS.map((spec) => (
                    <CollectionCardSkeleton key={spec.name} spec={spec} />
                  ))
                : fourCollections.map((col) => {
                    const hasSharedDocs =
                      typeof col.scopeCount === "number" &&
                      col.count > col.scopeCount;
                    return (
                      <section
                        key={col.name}
                        className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm"
                      >
                        <header className="border-b border-[#D8E3DF] bg-[#F8FAF9] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <code className="font-mono text-base font-bold text-[#112733]">
                              {col.name}
                            </code>
                            <span className="rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-medium text-[#00684A]">
                              {col.timeseries
                                ? "time series"
                                : "collection"}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-sm text-[#5C6C75]">
                            {hasSharedDocs
                              ? `${col.scopeCount.toLocaleString()} LTW-04 docs · ${col.count.toLocaleString()} total`
                              : `${col.count.toLocaleString()} documents`}
                          </p>
                        </header>

                        <div className="min-h-0 flex-1 overflow-auto bg-white">
                          {col.sample ? (
                            <HighlightedJson value={col.sample} compact />
                          ) : (
                            <p className="p-4 text-sm text-[#889397]">
                              No sample document
                            </p>
                          )}
                        </div>

                        <footer className="border-t border-[#E8EDEB] bg-[#F8FAF9] px-4 py-2.5 text-sm leading-5 text-[#5C6C75]">
                          {DATA_COLLECTION_DESCRIPTIONS[col.name]}
                        </footer>
                      </section>
                    );
                  })}
            </div>
          )}

          {currentStep.kind === "query" && (
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[5fr_6fr]">
              <PipelinePane
                collection={currentStep.collection}
                pipeline={
                  customPipelines[`${activeDay}:${currentStep.id}`] ??
                  currentStep.pipeline
                }
                onChangePipeline={(nextText) =>
                  setCustomPipelines((prev) => ({
                    ...prev,
                    [`${activeDay}:${currentStep.id}`]: nextText,
                  }))
                }
                prevPipeline={prevPipelineForStep}
                defaultProjectOpen={stepIdx === firstProjectStepIdx}
                onRun={handleRunQuery}
                isRunning={isRunning}
                editing={editing}
                setEditing={setEditing}
                signaturePreview={querySignature}
                showingSignature={showingSignature}
                onToggleSignature={handleToggleSignature}
                signatureLoading={signatureLoading}
              />

              <ResultPane
                result={runResult}
                error={runError}
                view={viewMode}
                onChangeView={setViewMode}
                isRunning={isRunning}
                querySignature={querySignature}
                signatureWindow={currentStep.signatureWindow}
              />
            </div>
          )}

          {currentStep.kind === "agent" && (
            <AskInWordsPane prompts={prompts} />
          )}
        </div>
      )}

      {/* Bottom one-sentence takeaway bar + keyboard shortcuts */}
      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-[#D8E3DF] bg-white px-5 py-3 shadow-2xs">
        <p className="text-base font-medium leading-6 text-[#112733]">
          {currentStep.sentence}
        </p>
        <div className="flex shrink-0 items-center gap-3 font-mono text-sm text-[#5C6C75]">
          <span>← → steps</span>
          {currentStep.kind === "query" && (
            <>
              <span>·</span>
              <span>⌘↵ run</span>
              <span>·</span>
              <span>e edit</span>
            </>
          )}
          <span>·</span>
          <span>p visual</span>
        </div>
      </footer>

      <StepStoryModal
        open={storyOpen}
        dayStr={activeDay}
        slideId={storySlideId}
        onSelectSlide={setStorySlideId}
        onClose={() => setStoryOpen(false)}
      />
    </main>
  );
}
