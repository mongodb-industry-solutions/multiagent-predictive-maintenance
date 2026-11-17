"use client";

import React, { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, ProgressCircle, Step, Stepper } from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import InfoWizard from "@/components/infoWizard/InfoWizard";
import DocumentModal from "@/components/unsAction/DocumentModal";
import { AUDIT_TRAIL_TALK_TRACK } from "@/lib/const/talkTrack";
import {
  AUDIT_AGENTS,
  AUDIT_WORKFLOW_STEPS,
} from "@/lib/auditTrail/constants";
import {
  AUDIT_SCENARIOS,
  getAuditScenarioByKey,
} from "@/lib/auditTrail/scenarios";
import {
  captureInterventionStep,
  checkPolicyAndRetrieveStep,
  closeAuditLoopStep,
  draftAndRouteStep,
  fetchAuditLineage,
  submitHumanReviewSignature,
  testMongoSchemaGuard,
} from "@/lib/api/auditTrail";
import AuditActivityPanel from "./AuditActivityPanel";
import AuditLineageModal from "./AuditLineageModal";

const STAGE_IDS = AUDIT_WORKFLOW_STEPS.map((step) => step.id);

function createEmptyActivity() {
  return {
    production_agent: [],
    documentation_agent: [],
    quality_engineer: [],
  };
}

function StatusPill({ tone = "slate", children }) {
  const styles = {
    green: "border-[#00684A]/30 bg-[#E3FCF7] text-[#00684A]",
    amber: "border-[#944F01]/35 bg-[#FEF7DB] text-[#944F01]",
    red: "border-[#B1371F]/35 bg-[#FFEAE5] text-[#B1371F]",
    blue: "border-[#016BF8]/30 bg-[#E8F1FE] text-[#016BF8]",
    slate: "border-[#D8E3DF] bg-white text-[#3D4F58]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-sm font-semibold ${
        styles[tone] || styles.slate
      }`}
    >
      {children}
    </span>
  );
}

function AgentBadge({ isHuman = false, unauthorized = false, label }) {
  if (unauthorized) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFEAE5] px-3 py-0.5 text-sm font-semibold text-[#B1371F]">
        <Icon glyph="Warning" size={14} />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-sm font-semibold ${
        isHuman
          ? "bg-[#FEF7DB] text-[#944F01]"
          : "bg-[#E3FCF7] text-[#00684A]"
      }`}
    >
      <Icon glyph={isHuman ? "Person" : "Sparkle"} size={14} />
      <span>{label}</span>
    </span>
  );
}

function JsonInspectButton({ onClick, label = "{}" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E3DF] bg-white px-2.5 py-1 font-mono text-sm font-semibold text-[#00684A] transition hover:border-[#00A35C] hover:bg-[#E3FCF7]"
    >
      {label}
    </button>
  );
}

function formatUtcTimestamp(iso) {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  return `${parsed.toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

/**
 * Visualizes the before -> proposed setpoint relative to the validated recipe [min, max] envelope.
 */
function RecipeEnvelopeGauge({
  beforeValue,
  proposedValue,
  min,
  max,
  scaleMin,
  scaleMax,
  unit,
}) {
  const lo = scaleMin ?? min - (max - min) * 0.35;
  const hi = scaleMax ?? max + (max - min) * 0.65;
  const span = Math.max(hi - lo, 1);
  const toPct = (v) => Math.max(3, Math.min(97, ((v - lo) / span) * 100));

  const winLeft = toPct(min);
  const winWidth = Math.max(6, toPct(max) - winLeft);
  const beforePct = toPct(beforeValue);
  const proposedPct = toPct(proposedValue);
  const inBounds = proposedValue >= min && proposedValue <= max;

  return (
    <div className="rounded-xl border border-[#E8EDEB] bg-[#F8FAF9] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-[#112733]">
          Pre-Validated Recipe / PAR Window: {min} – {max} {unit}
        </span>
        <span
          className={`font-mono font-semibold ${
            inBounds ? "text-[#00684A]" : "text-[#B1371F]"
          }`}
        >
          {inBounds
            ? "Inside Proven Acceptable Range (PAR)"
            : "Outside Proven Acceptable Range (PAR)"}
        </span>
      </div>

      <div className="relative mt-6 mb-5 h-4 w-full rounded-full bg-[#FFEAE5] ring-1 ring-[#D8E3DF]">
        {/* Validated green operating band */}
        <div
          className="absolute top-0 bottom-0 rounded-sm border-x-2 border-[#00684A] bg-[#B8E4D2]/80"
          style={{ left: `${winLeft}%`, width: `${winWidth}%` }}
          title={`Approved recipe range: ${min}–${max} ${unit}`}
        />

        {/* Before marker */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${beforePct}%` }}
          title={`Before: ${beforeValue} ${unit}`}
        >
          <div className="h-4 w-4 rounded-full border-2 border-[#3D4F58] bg-white shadow-xs" />
        </div>

        {/* Proposed marker */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${proposedPct}%` }}
          title={`Proposed: ${proposedValue} ${unit}`}
        >
          <div
            className={`h-5 w-5 rounded-full border-2 border-white shadow-md ${
              inBounds ? "bg-[#00684A]" : "bg-[#B1371F]"
            }`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#3D4F58]">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-[#3D4F58] bg-white" />
          Before:{" "}
          <strong className="font-mono text-[#112733]">
            {beforeValue} {unit}
          </strong>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className={`h-3.5 w-3.5 rounded-full ${
              inBounds ? "bg-[#00684A]" : "bg-[#B1371F]"
            }`}
          />
          Proposed:{" "}
          <strong
            className={`font-mono ${
              inBounds ? "text-[#00684A]" : "text-[#B1371F]"
            }`}
          >
            {proposedValue} {unit}
          </strong>
        </span>
      </div>
    </div>
  );
}

function TempTrendBars({
  values = [],
  limitC = 230,
  label,
  subtitle = "",
  className = "",
}) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const minVal = Math.min(...values, limitC - 35);
  const maxVal = Math.max(...values, limitC + 8);
  const span = Math.max(maxVal - minVal, 1);

  return (
    <div
      className={`flex flex-col rounded-xl border border-[#E8EDEB] bg-[#F8FAF9] p-5 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-bold text-[#112733]">{label}</span>
          {subtitle && (
            <span className="text-sm font-normal text-[#5C6C75]">
              {subtitle}
            </span>
          )}
        </div>
        <span className="font-mono text-sm text-[#5C6C75]">Max {limitC} °C</span>
      </div>
      <div className="mt-4 flex min-h-[7rem] flex-1 items-end gap-2.5">
        {values.map((val, idx) => {
          const pct = Math.max(
            18,
            Math.min(100, Math.round(((val - minVal) / span) * 100))
          );
          const over = val > limitC;
          const near = !over && val >= limitC - 5;
          return (
            <div
              key={idx}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
              title={`${val} °C`}
            >
              <div className="flex w-full flex-1 items-end rounded-md bg-[#E8EDEB]/70 p-1">
                <div
                  className={`w-full rounded-sm transition-all ${
                    over
                      ? "bg-[#B1371F]"
                      : near
                        ? "bg-[#DB6C00]"
                        : "bg-[#00A35C]"
                  }`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-sm text-[#5C6C75]">
                {val.toFixed(0)}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScenarioChoiceCard({ scenario, selected, onSelect }) {
  const toneStyles = {
    green: {
      pill: "bg-[#E3FCF7] text-[#00684A] border-[#00A35C]/40",
      ring: selected
        ? "border-[#00684A] bg-white ring-2 ring-[#00A35C]/25 shadow-md"
        : "border-[#D8E3DF] bg-white hover:border-[#00A35C]",
      icon: "CheckmarkWithCircle",
      iconFill: "#00684A",
    },
    amber: {
      pill: "bg-[#FEF7DB] text-[#944F01] border-[#DB6C00]/40",
      ring: selected
        ? "border-[#DB6C00] bg-white ring-2 ring-[#DB6C00]/25 shadow-md"
        : "border-[#D8E3DF] bg-white hover:border-[#DB6C00]",
      icon: "Person",
      iconFill: "#944F01",
    },
    red: {
      pill: "bg-[#FFEAE5] text-[#B1371F] border-[#B1371F]/35",
      ring: selected
        ? "border-[#B1371F] bg-white ring-2 ring-[#B1371F]/20 shadow-md"
        : "border-[#D8E3DF] bg-white hover:border-[#B1371F]/60",
      icon: "Warning",
      iconFill: "#B1371F",
    },
  };

  const style = toneStyles[scenario.badgeTone] || toneStyles.green;
  const isUnverified = Boolean(scenario.credential_override);

  return (
    <button
      type="button"
      onClick={() => onSelect(scenario.key)}
      className={`flex flex-col justify-between rounded-2xl border p-5 text-left transition-all ${style.ring}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${style.pill}`}
          >
            <Icon glyph={style.icon} fill={style.iconFill} size={15} />
            {scenario.governanceMode}
          </span>
          {selected && (
            <span className="rounded-full bg-[#112733] px-2.5 py-0.5 text-sm font-semibold text-white">
              Selected
            </span>
          )}
        </div>

        <h3 className="mt-3.5 text-lg font-bold leading-snug text-[#112733]">
          {scenario.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[#3D4F58]">
          {scenario.summary}
        </p>
      </div>

      <div className="mt-4 space-y-2 border-t border-[#E8EDEB] pt-3.5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[#5C6C75]">{scenario.parameter_label}</span>
          <span className="font-mono font-bold text-[#112733]">
            {scenario.before_value} → {scenario.proposed_value} {scenario.unit}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#5C6C75]">Recipe Window</span>
          <span className="font-mono text-[#3D4F58]">
            {scenario.recipeWindowLabel}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#5C6C75]">Initiated By</span>
          <span
            className={`inline-flex items-center gap-1 font-medium ${
              isUnverified ? "text-[#B1371F]" : "text-[#00684A]"
            }`}
          >
            <Icon glyph={isUnverified ? "Warning" : "Sparkle"} size={14} />
            {isUnverified ? "Unverified Cloud Script" : "Production Agent"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function AuditTrailWorkspace({
  dataSource = "leafy",
  factorySnapshot = null,
  activeFactoryOrder = null,
  toolbarRight = null,
}) {
  const [selectedScenarioKey, setSelectedScenarioKey] =
    useState("routine_trim");
  const [hasStarted, setHasStarted] = useState(false);
  const [workflowStage, setWorkflowStage] = useState("capture");
  const [view, setView] = useState("capture");
  const [record, setRecord] = useState(null);
  const [revisions, setRevisions] = useState([]);

  const [isStepRunning, setIsStepRunning] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState(null);
  const [runningMessage, setRunningMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Shared Agents rail
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState("production_agent");
  const [activityByAgent, setActivityByAgent] = useState(createEmptyActivity);

  // Modals
  const [infoOpen, setInfoOpen] = useState(false);
  const [inspectedDoc, setInspectedDoc] = useState(null);
  const [lineageOpen, setLineageOpen] = useState(false);
  const [lineageInitialTab, setLineageInitialTab] = useState("validator");
  const [lineageBundle, setLineageBundle] = useState(null);
  const [schemaTestResult, setSchemaTestResult] = useState(null);
  const [isTestingSchema, setIsTestingSchema] = useState(false);

  // Human in the loop sign-off form (21 CFR Part 11 11.50, 11.100, 11.200)
  const [reviewDecision, setReviewDecision] = useState("reject_hold");
  const reviewerName = "Elena Rostova";
  const reviewerRole = "Lead Quality Engineer";
  const signerUserId = "e.rostova@leafy-factory.com";
  const [signingPin, setSigningPin] = useState("112100");
  const [reviewRationale, setReviewRationale] = useState(
    "Rejected 1560 W override per precedent CHG-2026-0089; clean laser protective window and resume at 1460 W."
  );

  const activeScenario = useMemo(
    () => getAuditScenarioByKey(selectedScenarioKey),
    [selectedScenarioKey]
  );

  const appendEvent = useCallback((event) => {
    const agentId = event?.agent || "documentation_agent";
    setRunningAgentId(agentId);
    setSelectedAgentId(agentId);
    setActivityByAgent((prev) => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), event],
    }));
  }, []);

  const handleDecisionChange = (nextDecision) => {
    setReviewDecision(nextDecision);
    if (nextDecision === "approve_override") {
      setReviewRationale(
        "Authorized 1-batch 1560 W trial override under active pyrometer thermal monitoring."
      );
    } else {
      setReviewRationale(
        "Rejected 1560 W override per precedent CHG-2026-0089; clean laser protective window and resume at 1460 W."
      );
    }
  };

  const handleReset = useCallback(() => {
    setHasStarted(false);
    setWorkflowStage("capture");
    setView("capture");
    setRecord(null);
    setRevisions([]);
    setIsStepRunning(false);
    setRunningAgentId(null);
    setRunningMessage("");
    setErrorMsg("");
    setSchemaTestResult(null);
    setLineageBundle(null);
    setActivityOpen(false);
    setSelectedAgentId("production_agent");
    setActivityByAgent(createEmptyActivity());
  }, []);

  const handleStartCapture = async () => {
    if (isStepRunning) return;
    setHasStarted(true);
    setWorkflowStage("capture");
    setView("capture");
    setErrorMsg("");
    setSchemaTestResult(null);
    setActivityByAgent(createEmptyActivity());
    setIsStepRunning(true);
    setRunningAgentId("production_agent");
    setRunningMessage(
      "Production Agent is logging the intervention and reconstructing operational context in MongoDB…"
    );

    try {
      const res = await captureInterventionStep({
        scenarioKey: activeScenario.key,
        dataSource,
        factorySnapshot,
        onEvent: appendEvent,
      });
      setRecord(res.record);
    } catch (error) {
      setErrorMsg(error?.message || "Failed to capture shopfloor intervention");
    } finally {
      setIsStepRunning(false);
      setRunningAgentId(null);
      setRunningMessage("");
    }
  };

  const runStep2PolicyAndSops = async () => {
    if (!record?.intervention_id || isStepRunning) return;
    setWorkflowStage("policy");
    setView("policy");
    setErrorMsg("");
    setIsStepRunning(true);
    setRunningAgentId("documentation_agent");
    setRunningMessage(
      "Checking deterministic control rules and running governed Atlas Vector Search…"
    );

    try {
      const res = await checkPolicyAndRetrieveStep({
        interventionId: record.intervention_id,
        onEvent: appendEvent,
      });
      setRecord(res.record);
    } catch (error) {
      setErrorMsg(error?.message || "Failed to evaluate policy and SOPs");
    } finally {
      setIsStepRunning(false);
      setRunningAgentId(null);
      setRunningMessage("");
    }
  };

  const runStep3DraftAndRoute = async () => {
    if (!record?.intervention_id || isStepRunning) return;
    setWorkflowStage("review");
    setView("review");
    setErrorMsg("");
    setIsStepRunning(true);
    setRunningAgentId("documentation_agent");
    setRunningMessage(
      "Documentation Agent is drafting the Change Record and routing authorization…"
    );

    try {
      const res = await draftAndRouteStep({
        interventionId: record.intervention_id,
        onEvent: appendEvent,
      });
      setRecord(res.record);

      if (res.record.status === "pending_human_review") {
        setSelectedAgentId("quality_engineer");
        setActivityByAgent((prev) => ({
          ...prev,
          quality_engineer: [
            ...(prev.quality_engineer || []),
            {
              type: "status",
              status: "waiting",
              content:
                "Held for Quality Engineer electronic signature before out-of-range execution.",
              at: new Date().toISOString(),
            },
          ],
        }));
      }
    } catch (error) {
      setErrorMsg(error?.message || "Failed to draft Change Record");
    } finally {
      setIsStepRunning(false);
      setRunningAgentId(null);
      setRunningMessage("");
    }
  };

  const handleQualitySignOff = async () => {
    if (!record?.intervention_id || isStepRunning) return;
    setErrorMsg("");
    setIsStepRunning(true);
    setRunningAgentId("quality_engineer");
    setRunningMessage("Committing Quality Engineer electronic signature…");

    try {
      const res = await submitHumanReviewSignature({
        interventionId: record.intervention_id,
        decision: reviewDecision,
        reviewerName,
        reviewerRole,
        signerUserId,
        signingPin,
        rationale: reviewRationale,
      });
      setRecord(res.record);
      setActivityByAgent((prev) => ({
        ...prev,
        quality_engineer: [
          ...(prev.quality_engineer || []),
          {
            type: "status",
            status: "signed",
            content: `Signed Revision v${res.record.v} (${
              reviewDecision === "approve_override"
                ? "Trial Override Approved"
                : "Override Rejected"
            }) by ${reviewerName}.`,
            at: new Date().toISOString(),
          },
        ],
      }));
    } catch (error) {
      setErrorMsg(error?.message || "Failed to record electronic signature");
    } finally {
      setIsStepRunning(false);
      setRunningAgentId(null);
      setRunningMessage("");
    }
  };

  const runStep4CloseLoop = async () => {
    if (!record?.intervention_id || isStepRunning) return;
    setWorkflowStage("outcome");
    setView("outcome");
    setErrorMsg("");
    setIsStepRunning(true);
    setRunningAgentId("documentation_agent");
    setRunningMessage(
      "Verifying post-change weld telemetry and closing the MongoDB audit trail…"
    );

    try {
      const res = await closeAuditLoopStep({
        interventionId: record.intervention_id,
        onEvent: appendEvent,
      });
      setRecord(res.record);
      if (Array.isArray(res.revisions)) {
        setRevisions(res.revisions);
      }
    } catch (error) {
      setErrorMsg(error?.message || "Failed to verify outcomes");
    } finally {
      setIsStepRunning(false);
      setRunningAgentId(null);
      setRunningMessage("");
    }
  };

  const handleContinue = () => {
    if (isStepRunning || !record) return;

    const viewIdx = STAGE_IDS.indexOf(view);
    const stageIdx = STAGE_IDS.indexOf(workflowStage);
    if (viewIdx < stageIdx) {
      setView(STAGE_IDS[viewIdx + 1]);
      return;
    }

    if (workflowStage === "capture") {
      runStep2PolicyAndSops();
      return;
    }
    if (workflowStage === "policy") {
      runStep3DraftAndRoute();
      return;
    }
    if (workflowStage === "review") {
      if (record.status === "pending_human_review") return;
      runStep4CloseLoop();
    }
  };

  const openFullLineageModal = async (tab = "validator") => {
    const targetTab = typeof tab === "string" ? tab : "validator";
    setLineageInitialTab(targetTab);
    setLineageOpen(true);
    if (!record?.intervention_id) return;
    try {
      const bundle = await fetchAuditLineage(record.intervention_id);
      setLineageBundle(bundle);
    } catch (error) {
      setErrorMsg(error?.message || "Could not load MongoDB lineage");
    }
  };

  const handleRunSchemaGuardTest = async () => {
    setIsTestingSchema(true);
    try {
      const res = await testMongoSchemaGuard();
      setSchemaTestResult(res);
    } catch (error) {
      setSchemaTestResult({
        rejectedByMongo: false,
        message: error?.message || "Schema guard test failed",
      });
    } finally {
      setIsTestingSchema(false);
    }
  };

  const stageIndex = STAGE_IDS.indexOf(workflowStage);
  const viewIndex = STAGE_IDS.indexOf(view);
  const needsHumanSignOff =
    workflowStage === "review" && record?.status === "pending_human_review";
  const isCompleted = Boolean(record?.outcome);

  const showContinue =
    hasStarted &&
    !isStepRunning &&
    Boolean(record) &&
    (viewIndex < stageIndex ||
      (workflowStage !== "outcome" && !needsHumanSignOff));

  const handleStepSelect = (key) => {
    if (!hasStarted || isStepRunning) return;
    const idx = Number(key);
    if (!Number.isInteger(idx) || idx < 0 || idx > stageIndex) return;
    const nextView = AUDIT_WORKFLOW_STEPS[idx]?.id;
    if (nextView) setView(nextView);
  };

  const isAgentWorking = (agent) =>
    hasStarted && isStepRunning && runningAgentId === agent.id;

  const isAgentCurrent = (agent) => {
    if (!hasStarted) return false;
    if (needsHumanSignOff) return agent.id === "quality_engineer";
    return agent.steps.includes(view);
  };

  const unauthorizedAgent =
    record?.agents?.production_agent?.authorized === false;

  const bounds =
    record?.reconstructed_context?.recipe_envelope?.parameter_bounds;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* Shared Top Bar */}
      <div className="mb-2.5 grid shrink-0 grid-cols-1 items-center gap-3 px-2 lg:grid-cols-[minmax(13rem,auto)_minmax(0,1fr)_auto]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#112733]">
            Agentic Audit Trail
          </h1>
          <Link
            href="/agentic-ai"
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
          >
            <Icon glyph="ArrowLeft" size={16} />
            <span>Back to overview</span>
          </Link>
        </div>

        <div
          className={`agentic-demo-stepper contestable-stepper min-w-0 overflow-x-auto${
            isCompleted ? " contestable-report-saved" : ""
          }`}
        >
          <Stepper
            currentStep={
              !hasStarted
                ? 0
                : isCompleted
                  ? AUDIT_WORKFLOW_STEPS.length
                  : stageIndex
            }
            maxDisplaySteps={AUDIT_WORKFLOW_STEPS.length}
            aria-label="Agentic audit trail workflow"
            onSelectionChange={handleStepSelect}
            className="min-w-[500px] [&>li]:cursor-pointer"
          >
            {AUDIT_WORKFLOW_STEPS.map((step, index) => (
              <Step key={String(index)} textValue={step.label}>
                {step.label}
              </Step>
            ))}
          </Stepper>
        </div>

        <div className="flex items-center justify-end gap-2">
          {toolbarRight}
          <InfoWizard
            open={infoOpen}
            setOpen={setInfoOpen}
            sections={AUDIT_TRAIL_TALK_TRACK}
            iconOnly
            iconGlyph="InfoWithCircle"
            tooltipText="Demo talk track & step guide"
          />
        </div>
      </div>

      {/* Main Split: Purpose-built Audit Trail Workspace + Shared Agents Rail */}
      <div className="relative flex min-h-0 flex-1 gap-3 px-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white shadow-sm">
          {errorMsg && (
            <div className="mx-5 mt-3 rounded-lg border border-[#B1371F]/30 bg-[#FFEAE5] px-4 py-2.5 text-sm font-medium text-[#B1371F]">
              {errorMsg}
            </div>
          )}

          {!hasStarted ? (
            /* ================= LANDING STATE: Header pinned at top, 3 Scenario Cards + CTA centered below ================= */
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
              {/* Station Header with LTW-04 Artwork */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-5 rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] px-6 py-5">
                <div className="flex items-center gap-5">
                  <div className="relative hidden h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#D8E3DF] bg-white sm:block">
                    <Image
                      src="/img/machines/Tab-Laser-Welding-Cell.png"
                      alt="Tab Laser Welding Cell LTW-04"
                      fill
                      sizes="80px"
                      className="object-contain p-1.5"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm font-semibold uppercase tracking-wider text-[#00684A]">
                        Leafy Factory · EV Module Line · Station 05 (LTW-04)
                      </span>
                      {activeFactoryOrder && (
                        <span className="rounded-full border border-[#D8E3DF] bg-white px-3 py-0.5 font-mono text-sm text-[#3D4F58]">
                          Order{" "}
                          {activeFactoryOrder.mes_order_id ||
                            activeFactoryOrder.order_id}
                        </span>
                      )}
                    </div>
                    <h2 className="mt-1.5 text-2xl font-bold text-[#112733]">
                      Choose a shopfloor intervention to audit
                    </h2>
                    <p className="mt-1 text-base text-[#5C6C75]">
                      Every parameter change is captured deterministically,
                      checked against policy rules, grounded in approved SOPs,
                      and versioned in MongoDB.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openFullLineageModal("validator")}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#00684A]/35 bg-[#E3FCF7] px-3 py-1.5 text-sm font-semibold text-[#00684A] transition hover:bg-[#D5F5EC]"
                >
                  <Icon glyph="Database" size={14} />
                  <span>Audit Lineage</span>
                </button>
              </div>

              {/* 3 Governance Path Cards + Start Button centered in remaining space */}
              <div className="flex flex-1 flex-col items-center justify-center py-4">
                <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-3">
                  {AUDIT_SCENARIOS.map((sc) => (
                    <ScenarioChoiceCard
                      key={sc.key}
                      scenario={sc}
                      selected={sc.key === selectedScenarioKey}
                      onSelect={setSelectedScenarioKey}
                    />
                  ))}
                </div>

                <div className="mt-6 flex justify-center">
                  <Button variant="primary" onPress={handleStartCapture}>
                    Start Audit Trail →
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ================= ACTIVE AUDIT WORKFLOW ================= */
            <>
              {/* Compact Shopfloor Change Ribbon */}
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#D8E3DF] bg-[#F8FAF9] px-5 py-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <StatusPill tone={activeScenario.badgeTone}>
                    {activeScenario.governanceMode}
                  </StatusPill>
                  <span className="text-base font-bold text-[#112733]">
                    {activeScenario.parameter_label}:{" "}
                    <span className="font-mono text-[#016BF8]">
                      {activeScenario.before_value} →{" "}
                      {activeScenario.proposed_value} {activeScenario.unit}
                    </span>
                  </span>
                  <span className="hidden text-sm text-[#5C6C75] xl:inline">
                    · LTW-04 · {activeScenario.product} (
                    {activeScenario.material_master})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openFullLineageModal("validator")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#00684A]/35 bg-[#E3FCF7] px-3 py-1.5 text-sm font-semibold text-[#00684A] transition hover:bg-[#D5F5EC]"
                  >
                    <Icon glyph="Database" size={14} />
                    <span>Audit Lineage</span>
                  </button>
                  <button
                    type="button"
                    disabled={isStepRunning}
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#D8E3DF] bg-white px-3 py-1.5 text-sm font-semibold text-[#3D4F58] hover:bg-[#F1F5F3] disabled:opacity-50"
                  >
                    <Icon glyph="Refresh" size={14} />
                    <span>Change Scenario</span>
                  </button>
                </div>
              </div>

              {/* Active Step Content */}
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {isStepRunning ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-3">
                    <ProgressCircle size="large" aria-label="Step running" />
                    <p className="text-base font-medium text-[#3D4F58]">
                      {runningMessage}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* -------- STEP 1: CAPTURE & CONTEXT -------- */}
                    {record && view === "capture" && (
                      <div className="flex h-full min-h-0 flex-col gap-4">
                        {/* Top Visual Setpoint Gauge */}
                        <div className="shrink-0 rounded-xl border border-[#D8E3DF] bg-white p-5">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-sm font-semibold uppercase tracking-wider text-[#00684A]">
                                Step 1 · Captured Shopfloor Event (Revision v1)
                              </span>
                              <h3 className="mt-0.5 text-lg font-bold text-[#112733]">
                                {record.intervention.trigger_reason}
                              </h3>
                            </div>
                            <AgentBadge
                              unauthorized={unauthorizedAgent}
                              label={`${record.agents.production_agent.display_name} · ${record.agents.production_agent.credential_type}`}
                            />
                          </div>

                          <RecipeEnvelopeGauge
                            beforeValue={record.intervention.before_value}
                            proposedValue={record.intervention.proposed_value}
                            min={bounds?.min ?? activeScenario.recipeMin}
                            max={bounds?.max ?? activeScenario.recipeMax}
                            scaleMin={activeScenario.scaleMin}
                            scaleMax={activeScenario.scaleMax}
                            unit={record.intervention.unit}
                          />
                        </div>

                        {/* Bottom Joined MongoDB Context Sources */}
                        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
                          <div className="flex min-h-0 flex-col lg:col-span-2">
                            <TempTrendBars
                              label="Joined Telemetry"
                              subtitle="(4-min weld-zone window)"
                              values={
                                record.reconstructed_context.telemetry_window
                                  ?.curve_preview || []
                              }
                              limitC={
                                record.reconstructed_context.material_spec
                                  ?.maxWeldTempC || 230
                              }
                              className="h-full"
                            />
                          </div>

                          <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-[#D8E3DF] bg-white p-5">
                            <div className="flex items-center justify-between gap-2 border-b border-[#E8EDEB] pb-3">
                              <div className="flex flex-wrap items-baseline gap-2">
                                <span className="text-lg font-bold text-[#112733]">
                                  Joined Context
                                </span>
                                <span className="text-sm font-normal text-[#5C6C75]">
                                  (MES & ERP)
                                </span>
                              </div>
                              <JsonInspectButton
                                onClick={() =>
                                  setInspectedDoc({
                                    title: "Reconstructed MongoDB Context",
                                    subtitle:
                                      "Deterministically joined from telemetry, workorders, and materials",
                                    value: record.reconstructed_context,
                                  })
                                }
                              />
                            </div>

                            <dl className="flex flex-1 flex-col justify-evenly gap-2 text-base">
                              <div className="flex justify-between gap-2 border-b border-[#F1F5F3] pb-2">
                                <dt className="text-[#5C6C75]">MES Order</dt>
                                <dd
                                  className={`font-mono font-bold ${
                                    record.reconstructed_context.order_context
                                      ?.mes_order_id
                                      ? "text-[#112733]"
                                      : "text-[#B1371F]"
                                  }`}
                                >
                                  {record.reconstructed_context.order_context
                                    ?.mes_order_id || "UNBOUND"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2 border-b border-[#F1F5F3] pb-2">
                                <dt className="text-[#5C6C75]">Batch / Unit</dt>
                                <dd className="font-mono font-semibold text-[#112733]">
                                  {record.reconstructed_context.order_context
                                    ?.batch_unit_id || "NONE"}
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2 border-b border-[#F1F5F3] pb-2">
                                <dt className="text-[#5C6C75]">Material</dt>
                                <dd className="font-mono font-semibold text-[#112733]">
                                  {
                                    record.reconstructed_context.material_spec
                                      ?.materialMaster
                                  }{" "}
                                  (max{" "}
                                  {
                                    record.reconstructed_context.material_spec
                                      ?.maxWeldTempC
                                  }{" "}
                                  °C)
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2 border-b border-[#F1F5F3] pb-2">
                                <dt className="text-[#5C6C75]">Shield Gas</dt>
                                <dd className="font-mono font-semibold text-[#112733]">
                                  {
                                    record.reconstructed_context
                                      .telemetry_window?.shield_gas_flow_lpm
                                  }{" "}
                                  L/min ·{" "}
                                  {
                                    record.reconstructed_context
                                      .telemetry_window?.shield_o2_ppm
                                  }{" "}
                                  ppm O₂
                                </dd>
                              </div>
                              <div className="flex justify-between gap-2">
                                <dt className="text-[#5C6C75]">
                                  Shift Trims Used
                                </dt>
                                <dd className="font-mono font-semibold text-[#112733]">
                                  {
                                    record.reconstructed_context
                                      .shift_intervention_count
                                  }{" "}
                                  / {bounds?.max_shift_trims ?? 2}
                                </dd>
                              </div>
                            </dl>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* -------- STEP 2: POLICY & GOVERNED SOPs -------- */}
                    {record?.policy_evaluation && view === "policy" && (
                      <div className="flex h-full min-h-0 flex-col gap-4">
                        {/* Top: Verdict Banner + 4 Deterministic Rule Checks */}
                        <section className="shrink-0 rounded-xl border border-[#D8E3DF] bg-white p-4">
                          <div
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                              record.policy_evaluation.risk_level === "critical"
                                ? "border-[#B1371F]/35 bg-[#FFEAE5]"
                                : record.policy_evaluation.risk_level === "high"
                                  ? "border-[#DB6C00]/35 bg-[#FEF7DB]"
                                  : "border-[#00A35C]/35 bg-[#E3FCF7]"
                            }`}
                          >
                            <div>
                              <div className="text-sm font-semibold uppercase tracking-wider text-[#3D4F58]">
                                Deterministic Control Policy (Zero LLM Authority)
                              </div>
                              <div className="mt-0.5 text-lg font-bold text-[#112733]">
                                {record.policy_evaluation.classification_label} —{" "}
                                {record.intervention.applied_value !== null
                                  ? `PLC Setpoint: ${record.intervention.applied_value} ${record.intervention.unit}`
                                  : "PLC Held Pending Quality Sign-Off"}
                              </div>
                            </div>
                            <StatusPill
                              tone={
                                record.policy_evaluation.risk_level ===
                                "critical"
                                  ? "red"
                                  : record.policy_evaluation.risk_level ===
                                      "high"
                                    ? "amber"
                                    : "green"
                              }
                            >
                              Route:{" "}
                              {record.policy_evaluation.routing_mode.replace(
                                /_/g,
                                " "
                              )}
                            </StatusPill>
                          </div>

                          <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {(record.policy_evaluation.rules || []).map(
                              (rule) => (
                                <div
                                  key={rule.rule_id}
                                  className={`flex items-start gap-2.5 rounded-xl border p-3.5 ${
                                    rule.passed
                                      ? "border-[#E8EDEB] bg-[#F8FAF9]"
                                      : rule.severity === "critical"
                                        ? "border-[#B1371F]/30 bg-[#FFEAE5]/55"
                                        : "border-[#DB6C00]/35 bg-[#FEF7DB]/55"
                                  }`}
                                >
                                  <Icon
                                    glyph={
                                      rule.passed
                                        ? "CheckmarkWithCircle"
                                        : "Warning"
                                    }
                                    fill={
                                      rule.passed
                                        ? "#00684A"
                                        : rule.severity === "critical"
                                          ? "#B1371F"
                                          : "#944F01"
                                    }
                                    size={17}
                                    className="mt-1 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <div className="text-base font-semibold text-[#112733]">
                                      {rule.label}
                                    </div>
                                    <p className="mt-1 text-base leading-6 text-[#3D4F58]">
                                      {rule.detail}
                                    </p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </section>

                        {/* Bottom: Governed $vectorSearch (Left: Approved | Right: Blocked + Prior Memory) */}
                        <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-[#D8E3DF] bg-white p-5">
                          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[#E8EDEB] pb-3">
                            <div>
                              <h3 className="text-lg font-bold text-[#112733]">
                                Governed SOP Retrieval{" "}
                                <span className="text-sm font-normal text-[#5C6C75]">
                                  (<code>$vectorSearch</code> Pre-Filter)
                                </span>
                              </h3>
                              <p className="mt-0.5 font-mono text-sm text-[#5C6C75]">
                                filter: status=&quot;approved&quot; ·
                                station=&quot;LTW-04&quot; · product=&quot;
                                {record.intervention.product}&quot;
                              </p>
                            </div>
                            <JsonInspectButton
                              onClick={() =>
                                setInspectedDoc({
                                  title:
                                    "Governed $vectorSearch & Episodic Memory",
                                  subtitle:
                                    "Pre-filtered approved SOPs + recalled historical change_records",
                                  value: {
                                    governed_requirements:
                                      record.governed_requirements,
                                    episodic_recall: record.episodic_recall,
                                  },
                                })
                              }
                            />
                          </div>

                          <div className="mt-4 grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                            {/* Bottom Left: Approved & Grounded */}
                            <div className="flex flex-col gap-3">
                              <div className="text-base font-bold text-[#00684A]">
                                Approved & Grounded
                              </div>
                              <div className="space-y-3">
                                {(
                                  record.governed_requirements
                                    ?.approved_procedures || []
                                )
                                  .slice(0, 2)
                                  .map((proc) => (
                                    <div
                                      key={`${proc.doc_id}-${proc.version}`}
                                      className="rounded-xl border border-[#B8E4D2] bg-[#E3FCF7]/55 p-4"
                                    >
                                      <div className="flex items-center justify-between font-mono text-sm font-bold text-[#00684A]">
                                        <span>
                                          {proc.doc_id} v{proc.version} (
                                          {proc.doc_type})
                                        </span>
                                        <span>{proc.score}</span>
                                      </div>
                                      <div className="mt-1 text-base font-semibold text-[#112733]">
                                        {proc.title}
                                      </div>
                                      {proc.clauses?.[0] && (
                                        <p className="mt-1 text-base leading-6 text-[#3D4F58]">
                                          {proc.clauses[0]}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                              </div>
                            </div>

                            {/* Bottom Right: Blocked Before Vector Ranking + Prior Memory */}
                            <div className="flex flex-col gap-3">
                              <div className="text-base font-bold text-[#B1371F]">
                                Blocked Before Vector Ranking
                              </div>
                              <div className="space-y-3">
                                {(
                                  record.governed_requirements
                                    ?.excluded_uncontrolled_docs || []
                                ).map((doc) => (
                                  <div
                                    key={`${doc.doc_id}-${doc.version}`}
                                    className="rounded-xl border border-[#B1371F]/25 bg-[#FFEAE5]/45 p-4"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-sm font-bold text-[#B1371F]">
                                        {doc.doc_id} v{doc.version}
                                      </span>
                                      <span className="rounded bg-white px-2.5 py-0.5 text-sm font-semibold text-[#B1371F]">
                                        {doc.status}
                                      </span>
                                    </div>
                                    <p className="mt-1.5 text-base leading-6 text-[#3D4F58]">
                                      {doc.reason_excluded}
                                    </p>
                                  </div>
                                ))}

                                {record.episodic_recall?.[0] && (
                                  <div className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4">
                                    <div className="text-base font-semibold text-[#112733]">
                                      Prior Memory ·{" "}
                                      <span className="font-mono text-[#016BF8]">
                                        {
                                          record.episodic_recall[0]
                                            .intervention_id
                                        }
                                      </span>
                                    </div>
                                    <p className="mt-1 text-base leading-6 text-[#3D4F58]">
                                      {
                                        record.episodic_recall[0]
                                          .outcome_summary
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    {/* -------- STEP 3: REVIEW & SIGN (QMS Change Control Dossier) -------- */}
                    {record?.draft_record && view === "review" && (
                      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
                        {/* Formal QMS Change Record Document (wider, slightly larger text) */}
                        <article className="rounded-xl border border-[#D8E3DF] bg-white lg:col-span-8">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E8EDEB] bg-[#F8FAF9] px-6 py-4">
                            <div>
                              <span className="font-mono text-sm font-bold text-[#00684A]">
                                QMS CHANGE RECORD · {record.intervention_id}
                              </span>
                              <h3 className="text-xl font-bold text-[#112733]">
                                {activeScenario.title}
                              </h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <AgentBadge label="Documentation Agent" />
                              <JsonInspectButton
                                onClick={() =>
                                  setInspectedDoc({
                                    title: `Drafted Change Record · ${record.intervention_id}`,
                                    subtitle:
                                      "Synthesized by Documentation Agent from deterministic evidence",
                                    value: record.draft_record,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div className="divide-y divide-[#E8EDEB] px-6 text-base leading-7">
                            <div className="py-4">
                              <div className="text-sm font-semibold uppercase tracking-wider text-[#5C6C75]">
                                What Changed & Who Acted
                              </div>
                              <p className="mt-1.5 text-[#112733]">
                                {record.draft_record.change_summary}
                              </p>
                            </div>
                            <div className="py-4">
                              <div className="text-sm font-semibold uppercase tracking-wider text-[#5C6C75]">
                                Process & Quality Impact
                              </div>
                              <p className="mt-1.5 text-[#112733]">
                                {record.draft_record.impact_assessment}
                              </p>
                            </div>
                            <div className="py-4">
                              <div className="text-sm font-semibold uppercase tracking-wider text-[#5C6C75]">
                                Governed SOP & Regulatory Basis
                              </div>
                              <p className="mt-1.5 text-[#112733]">
                                {record.draft_record.compliance_rationale}
                              </p>
                            </div>
                            <div className="py-4">
                              <div className="text-sm font-semibold uppercase tracking-wider text-[#5C6C75]">
                                Required Follow-Up Controls
                              </div>
                              <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[#3D4F58]">
                                {(
                                  record.draft_record.recommended_actions || []
                                ).map((action, idx) => (
                                  <li key={idx}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </article>

                        {/* Disposition / E-Signature / Quarantine Stamp (narrower vertical column) */}
                        <section className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4 lg:col-span-4">
                          <div className="flex items-center justify-between border-b border-[#D8E3DF] pb-3">
                            <h3 className="text-lg font-bold text-[#112733]">
                              Authorization Gate
                            </h3>
                            {needsHumanSignOff && (
                              <AgentBadge isHuman label="Quality Engineer" />
                            )}
                          </div>

                          {needsHumanSignOff ? (
                            <div className="mt-4 space-y-3 text-base leading-6">
                              <div className="rounded-lg border border-[#DB6C00]/40 bg-[#FEF7DB] p-3 text-sm leading-5 text-[#944F01]">
                                <strong>Out-of-PAR Hold:</strong> Documentation
                                Agent drafted the assessment, but independent
                                Quality Engineer 21 CFR Part 11 e-signature is
                                required to disposition this deviation.
                              </div>

                              <div className="space-y-2 text-sm">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDecisionChange("reject_hold")
                                  }
                                  className={`w-full rounded-xl border p-2.5 text-left transition ${
                                    reviewDecision === "reject_hold"
                                      ? "border-[#00684A] bg-[#E3FCF7] font-semibold text-[#00684A]"
                                      : "border-[#D8E3DF] bg-white text-[#3D4F58]"
                                  }`}
                                >
                                  Reject 1560 W override &amp; clean laser optics
                                  (Recommended)
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDecisionChange("approve_override")
                                  }
                                  className={`w-full rounded-xl border p-2.5 text-left transition ${
                                    reviewDecision === "approve_override"
                                      ? "border-[#DB6C00] bg-[#FEF7DB] font-semibold text-[#944F01]"
                                      : "border-[#D8E3DF] bg-white text-[#3D4F58]"
                                  }`}
                                >
                                  Approve 1-batch trial override at 1560 W
                                </button>
                              </div>

                              {/* 21 CFR Part 11 (11.50 & 11.200) Signer Block */}
                              <div className="rounded-xl border border-[#D8E3DF] bg-white p-3 text-sm leading-6">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold uppercase tracking-wider text-[#00684A]">
                                    21 CFR Part 11 E-Signature
                                  </span>
                                  <span className="rounded bg-[#E3FCF7] px-2 py-0.5 font-mono text-[#00684A]">
                                    11.50 · 11.200
                                  </span>
                                </div>
                                <div className="mt-2 space-y-1 text-[#3D4F58]">
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[#5C6C75]">
                                      Authenticated Signer:
                                    </span>
                                    <strong className="text-[#112733]">
                                      {reviewerName} ({reviewerRole})
                                    </strong>
                                  </div>
                                  <div className="flex justify-between gap-2">
                                    <span className="text-[#5C6C75]">
                                      Unique User ID:
                                    </span>
                                    <span className="font-mono text-[#112733]">
                                      {signerUserId}
                                    </span>
                                  </div>
                                  <div className="pt-0.5">
                                    <span className="text-[#5C6C75]">
                                      Meaning of Signature:{" "}
                                    </span>
                                    <strong className="text-[#112733]">
                                      {reviewDecision === "approve_override"
                                        ? "Temporary Controlled Deviation Authorization"
                                        : "Quality Rejection & Optics Maintenance Hold"}
                                    </strong>
                                  </div>
                                </div>

                                <label className="mt-2.5 block border-t border-[#E8EDEB] pt-2">
                                  <span className="flex items-center justify-between font-semibold text-[#3D4F58]">
                                    <span>2nd-Factor Signing PIN</span>
                                    <span className="font-normal text-[#5C6C75]">
                                      Demo pre-filled
                                    </span>
                                  </span>
                                  <input
                                    type="password"
                                    value={signingPin}
                                    onChange={(e) =>
                                      setSigningPin(e.target.value)
                                    }
                                    placeholder="Enter Part 11 PIN"
                                    className="mt-1 w-full rounded-lg border border-[#C1C7C6] bg-[#F8FAF9] px-2.5 py-1.5 font-mono text-sm text-[#112733]"
                                  />
                                </label>
                              </div>

                              <label className="block text-sm">
                                <span className="font-semibold text-[#3D4F58]">
                                  Justification / Disposition Note
                                </span>
                                <textarea
                                  rows={2}
                                  value={reviewRationale}
                                  onChange={(e) =>
                                    setReviewRationale(e.target.value)
                                  }
                                  className="mt-1 w-full rounded-lg border border-[#C1C7C6] bg-white px-3 py-2 text-sm text-[#112733]"
                                />
                              </label>

                              <Button
                                variant="primary"
                                onPress={handleQualitySignOff}
                                className="w-full"
                              >
                                Execute 21 CFR Part 11 Signature (Save v4)
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-4 space-y-4 text-base leading-7">
                              <div
                                className={`rounded-xl border-2 p-4 ${
                                  record.approval?.routing_mode ===
                                  "security_quarantine"
                                    ? "border-[#B1371F]/45 bg-[#FFEAE5]"
                                    : "border-[#00684A]/45 bg-[#E3FCF7]"
                                }`}
                              >
                                <div className="flex items-center gap-2 text-base font-bold text-[#112733]">
                                  <Icon
                                    glyph={
                                      record.approval?.routing_mode ===
                                      "security_quarantine"
                                        ? "Warning"
                                        : "CheckmarkWithCircle"
                                    }
                                    fill={
                                      record.approval?.routing_mode ===
                                      "security_quarantine"
                                        ? "#B1371F"
                                        : "#00684A"
                                    }
                                    size={18}
                                  />
                                  <span>
                                    {record.approval?.routing_mode ===
                                    "automated"
                                      ? "Auto-Verified Within Pre-Validated PAR"
                                      : record.approval?.routing_mode ===
                                          "security_quarantine"
                                        ? "Rejected & Quarantined at OT Gate"
                                        : "21 CFR Part 11 Electronically Signed"}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-[#3D4F58]">
                                  {record.approval?.rationale ||
                                    record.approval?.authority_basis}
                                </p>

                                {/* 21 CFR 11.50 Signature Manifestation */}
                                {record.approval?.reviewer_name ? (
                                  <dl className="mt-3 space-y-1.5 rounded-lg border border-[#00684A]/25 bg-white/90 p-3 text-sm leading-6 text-[#112733]">
                                    <div className="font-bold uppercase tracking-wider text-[#00684A]">
                                      21 CFR 11.50 Signature Manifestation
                                    </div>
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-[#5C6C75]">
                                        Printed Name:
                                      </dt>
                                      <dd className="text-right font-semibold">
                                        {record.approval.reviewer_name} ·{" "}
                                        {record.approval.reviewer_role}
                                      </dd>
                                    </div>
                                    {record.approval.signer_user_id && (
                                      <div className="flex justify-between gap-2">
                                        <dt className="text-[#5C6C75]">
                                          Signer ID:
                                        </dt>
                                        <dd className="font-mono">
                                          {record.approval.signer_user_id}
                                        </dd>
                                      </div>
                                    )}
                                    <div className="flex justify-between gap-2">
                                      <dt className="text-[#5C6C75]">
                                        Signed (UTC):
                                      </dt>
                                      <dd className="font-mono">
                                        {formatUtcTimestamp(
                                          record.approval.signed_at
                                        )}
                                      </dd>
                                    </div>
                                    <div className="pt-0.5">
                                      <dt className="text-[#5C6C75]">
                                        Meaning of Signature:
                                      </dt>
                                      <dd className="font-semibold text-[#00684A]">
                                        {record.approval.meaning_of_signature}
                                      </dd>
                                    </div>
                                    {record.approval.signature_sha256 && (
                                      <div className="border-t border-[#E8EDEB] pt-1.5 font-mono text-sm text-[#3D4F58]">
                                        11.70 Record Binding:{" "}
                                        {record.approval.signature_sha256.slice(
                                          0,
                                          20
                                        )}
                                        …
                                      </div>
                                    )}
                                  </dl>
                                ) : (
                                  record.approval?.signed_at && (
                                    <div className="mt-2 font-mono text-sm text-[#3D4F58]">
                                      Logged (UTC):{" "}
                                      {formatUtcTimestamp(
                                        record.approval.signed_at
                                      )}
                                    </div>
                                  )
                                )}
                              </div>

                              {/* Live MongoDB $jsonSchema Guard Demo */}
                              <div className="rounded-xl border border-[#D8E3DF] bg-white p-4">
                                <div className="text-base font-semibold text-[#112733]">
                                  Database-Level Guard (<code>$jsonSchema</code>{" "}
                                  Validation)
                                </div>
                                <p className="mt-1.5 text-base leading-7 text-[#5C6C75]">
                                  Even if an external script or bug bypasses the
                                  UI and writes directly to MongoDB, the{" "}
                                  <code>change_records</code> collection rejects
                                  any record missing valid agent credentials or
                                  required shopfloor fields.
                                </p>

                                <div className="mt-3">
                                  <button
                                    type="button"
                                    disabled={isTestingSchema}
                                    onClick={handleRunSchemaGuardTest}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#B1371F]/35 bg-[#FFEAE5] px-3.5 py-2 text-sm font-semibold text-[#B1371F] hover:bg-[#FFD9D0]"
                                  >
                                    <Icon glyph="Database" size={14} />
                                    <span>
                                      {isTestingSchema
                                        ? "Testing MongoDB Validator…"
                                        : "Test Unauthorized DB Write"}
                                    </span>
                                  </button>
                                </div>

                                {schemaTestResult && (
                                  <div className="mt-3 rounded-lg border border-[#00684A]/35 bg-[#E3FCF7] p-3 text-base leading-7 text-[#112733]">
                                    <div className="font-semibold text-[#00684A]">
                                      {schemaTestResult.rejectedByMongo
                                        ? `Rejected by MongoDB (${schemaTestResult.codeName} · code ${schemaTestResult.errorCode})`
                                        : schemaTestResult.message}
                                    </div>
                                    {schemaTestResult.rejectedByMongo && (
                                      <p className="mt-1 text-base leading-7 text-[#3D4F58]">
                                        Missing required{" "}
                                        <code>agents.production_agent.agent_id</code>{" "}
                                        and invalid <code>status</code>—blocked
                                        before persisting.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </section>
                      </div>
                    )}

                    {/* -------- STEP 4: OUTCOME & IMMUTABLE AUDIT TIMELINE -------- */}
                    {record?.outcome && view === "outcome" && (
                      <div className="grid h-full min-h-0 grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* Left: Post-Change Shopfloor Outcome */}
                        <section className="flex h-full min-h-0 flex-col justify-between gap-3 overflow-hidden rounded-xl border border-[#D8E3DF] bg-white p-5 lg:col-span-6">
                          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E8EDEB] pb-3">
                            <div>
                              <span className="text-sm font-semibold uppercase tracking-wider text-[#00684A]">
                                Closed-Loop Shopfloor Outcome
                              </span>
                              <h3 className="mt-0.5 text-lg font-bold text-[#112733]">
                                {record.outcome.verified
                                  ? "Process Stabilized & Verified"
                                  : "Thermal Breach Caught & Auto-Reverted"}
                              </h3>
                            </div>
                            <StatusPill
                              tone={
                                record.outcome.exception_opened
                                  ? "red"
                                  : "green"
                              }
                            >
                              {record.outcome.weld_points_passed}
                            </StatusPill>
                          </div>

                          <p className="shrink-0 text-base leading-6 text-[#3D4F58]">
                            {record.outcome.summary}
                          </p>

                          <TempTrendBars
                            label="Post-Decision Telemetry"
                            subtitle="(weld-zone °C)"
                            values={record.outcome.post_curve || []}
                            limitC={record.outcome.material_limit_c || 230}
                            className="min-h-0 flex-1"
                          />

                          <div className="grid shrink-0 grid-cols-3 gap-2.5 text-center">
                            <div className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3">
                              <div className="text-sm text-[#5C6C75]">
                                Applied Setpoint
                              </div>
                              <div className="mt-1 font-mono text-base font-bold text-[#112733]">
                                {record.outcome.applied_value}{" "}
                                {record.intervention.unit}
                              </div>
                            </div>
                            <div className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3">
                              <div className="text-sm text-[#5C6C75]">
                                Peak Temp
                              </div>
                              <div className="mt-1 font-mono text-base font-bold text-[#112733]">
                                {record.outcome.post_peak_temp_c} °C
                              </div>
                            </div>
                            <div className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3">
                              <div className="text-sm text-[#5C6C75]">
                                Batches Verified
                              </div>
                              <div className="mt-1 font-mono text-base font-bold text-[#00684A]">
                                {record.outcome.batches_verified}
                              </div>
                            </div>
                          </div>

                          {record.outcome.exception_opened && (
                            <div className="shrink-0 rounded-xl border border-[#B1371F]/35 bg-[#FFEAE5] p-3.5 text-base leading-6 text-[#B1371F]">
                              <strong>
                                {record.outcome.exception_opened.capa_id} (
                                {record.outcome.exception_opened.severity}):
                              </strong>{" "}
                              {record.outcome.exception_opened.reason}
                            </div>
                          )}
                        </section>

                        {/* Right: Connected Vertical Revision Timeline (only the trail list scrolls) */}
                        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white p-5 lg:col-span-6">
                          <div className="shrink-0 border-b border-[#E8EDEB] pb-3">
                            <span className="text-sm font-semibold uppercase tracking-wider text-[#016BF8]">
                              <code>change_record_revisions</code>
                            </span>
                            <h3 className="mt-0.5 text-lg font-bold text-[#112733]">
                              Immutable Audit Trail (v1 → v{record.v})
                            </h3>
                          </div>

                          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                            <ol className="relative ml-3 space-y-4 border-l-2 border-[#B8E4D2] pl-6">
                            {revisions.map((rev) => {
                              const isHuman =
                                rev.agent_id === "quality_engineer";
                              return (
                                <li key={rev.v} className="relative">
                                  <span
                                    className={`absolute -left-[1.95rem] top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full ring-4 ring-white ${
                                      isHuman ? "bg-[#DB6C00]" : "bg-[#00684A]"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInspectedDoc({
                                        title: `change_record_revisions · ${rev.intervention_id} (v${rev.v})`,
                                        subtitle: `${rev.stage} · SHA-256 ${rev.snapshot_sha256}`,
                                        value: rev,
                                      })
                                    }
                                    className="flex min-h-[5.75rem] w-full items-center justify-between gap-3 rounded-xl border border-[#E8EDEB] bg-[#F8FAF9] px-4 py-5 text-left transition hover:border-[#00A35C] hover:bg-white"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded bg-[#112733] px-2.5 py-0.5 font-mono text-sm font-bold text-white">
                                          v{rev.v}
                                        </span>
                                        <span className="text-base font-bold text-[#112733]">
                                          {rev.stage}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-sm text-[#5C6C75]">
                                          <Icon
                                            glyph={
                                              isHuman ? "Person" : "Sparkle"
                                            }
                                            size={13}
                                          />
                                          {rev.triggered_by}
                                        </span>
                                      </div>
                                      <p className="mt-1.5 line-clamp-2 text-base leading-6 text-[#3D4F58]">
                                        {rev.change_note}
                                      </p>
                                      <p className="mt-1 font-mono text-sm text-[#5C6C75]">
                                        {formatUtcTimestamp(rev.changed_at)} ·{" "}
                                        {rev.prev_snapshot_sha256
                                          ? `${rev.prev_snapshot_sha256.slice(0, 8)}…`
                                          : "GENESIS"}{" "}
                                        →{" "}
                                        {String(
                                          rev.snapshot_sha256 || ""
                                        ).slice(0, 8)}
                                        …
                                      </p>
                                    </div>
                                    <span className="shrink-0 rounded-md border border-[#D8E3DF] bg-white px-2.5 py-1 font-mono text-sm font-semibold text-[#00684A]">
                                      {"{}"}
                                    </span>
                                  </button>
                                </li>
                              );
                            })}
                            </ol>
                          </div>
                        </section>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Shared Agents Overview Rail */}
        <AuditActivityPanel
          open={activityOpen}
          onToggle={() => setActivityOpen((prev) => !prev)}
          agents={AUDIT_AGENTS}
          selectedAgentId={selectedAgentId}
          onSelectAgent={setSelectedAgentId}
          activityByAgent={activityByAgent}
          isAgentWorking={isAgentWorking}
          isAgentCurrent={isAgentCurrent}
          showContinue={showContinue}
          onContinue={handleContinue}
        />
      </div>

      <DocumentModal
        open={Boolean(inspectedDoc)}
        title={inspectedDoc?.title || "MongoDB Document"}
        subtitle={inspectedDoc?.subtitle || ""}
        value={inspectedDoc?.value || {}}
        onClose={() => setInspectedDoc(null)}
      />

      <AuditLineageModal
        open={lineageOpen}
        initialTab={lineageInitialTab}
        lineageBundle={lineageBundle}
        onClose={() => setLineageOpen(false)}
      />
    </div>
  );
}
