"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Link from "next/link";
import {
  Button,
  ProgressCircle,
  Select,
  SelectItem,
  Step,
  Stepper,
  TextArea,
  Toolbar,
  ToolbarAction,
} from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import {
  computeCandidateScores,
  DEFAULT_CANDIDATES,
  isArgumentActive,
} from "@/lib/contestable/scoring";
import {
  CONTESTABLE_AGENTS,
  DEFAULT_REFINEMENT_BY_CANDIDATE,
  ENGINEER_PRESET_SUGGESTIONS,
  STANDALONE_PRESET_SCENARIOS,
} from "@/lib/contestable/scenarios";
import {
  prepareContestableSession,
  runContestableSpecialist,
  submitContestableAction,
  generateContestableRefinement,
  commitContestableIncident,
  fetchContestableLineage,
} from "@/lib/api/contestable";
import DocumentModal from "@/components/unsAction/DocumentModal";
import AgentActivityPanel from "@/components/contestable/AgentActivityPanel";

const CANDIDATE_COLORS = {
  bearing_degradation: "#016BF8",
  misalignment: "#00684A",
  sensor_fault: "#DB6C00",
};

const AGENT_META = {
  vibration_pattern_agent: {
    label: "Vibration Pattern Agent",
    shortLabel: "vibration_pattern_agent",
    badgeBg: "bg-[#E8F1FE]",
    badgeText: "text-[#016BF8]",
    icon: "Chart",
  },
  maintenance_history_agent: {
    label: "Maintenance History Agent",
    shortLabel: "maintenance_history_agent",
    badgeBg: "bg-[#FEF7DB]",
    badgeText: "text-[#944F01]",
    icon: "Wrench",
  },
  reliability_engineer: {
    label: "Reliability Engineer",
    shortLabel: "reliability_engineer",
    badgeBg: "bg-[#E3FCF7]",
    badgeText: "text-[#00684A]",
    icon: "Person",
  },
};

function formatStepsToText(instructions) {
  if (!instructions) return "";
  if (typeof instructions === "string") return instructions;
  if (Array.isArray(instructions)) {
    return instructions
      .map(
        (step, idx) =>
          `- Step ${step.step || idx + 1}: ${
            typeof step === "string" ? step : step.description || ""
          }`,
      )
      .join("\n");
  }
  return "";
}

function ScoreTrack({ label, value, color, emphasize = false }) {
  const score = value?.score ?? 0.5;
  const pct = Math.round(score * 100);
  return (
    <div>
      <div
        className={`flex justify-between text-sm ${
          emphasize ? "font-semibold text-[#112733]" : "text-[#5C6C75]"
        }`}
      >
        <span>{label}</span>
        <span className={`font-mono ${emphasize ? "text-[#00684A]" : ""}`}>
          {score.toFixed(3)} ({pct}%)
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#E8EDEB]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(4, Math.min(100, pct))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  scoreMode = "none",
  scoreObj,
  scoreBeforeObj,
  hasArguments = false,
  isWinner = false,
  isSelected = false,
  precedentsOpen = false,
  selectable = true,
  onSelect,
}) {
  const color = CANDIDATE_COLORS[candidate.id] || "#00684A";
  const precedent = candidate.historical_case;
  const Tag = selectable ? "button" : "div";

  return (
    <Tag
      type={selectable ? "button" : undefined}
      onClick={
        selectable ? () => onSelect && onSelect(candidate.id) : undefined
      }
      className={`flex w-full flex-col rounded-xl border p-4 text-left transition-colors ${
        isSelected
          ? "border-[#00684A] bg-[#F4FBF8] shadow-sm"
          : "border-[#D8E3DF] bg-white"
      } ${
        selectable
          ? `cursor-pointer ${isSelected ? "" : "hover:border-[#889397]"}`
          : "cursor-default"
      }`}
    >
      <div className="flex w-full flex-col text-left">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-base font-semibold text-[#112733]">
              {candidate.label}
            </span>
          </span>
          {scoreMode !== "none" && hasArguments && isWinner && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-semibold text-[#00684A]">
              <Icon glyph="CheckmarkWithCircle" size={14} />
              Leading
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-[#5C6C75]">
          {candidate.summary}
        </p>
      </div>

      {scoreMode === "live" &&
        (hasArguments ? (
          <div className="mt-3">
            <ScoreTrack
              label="Score"
              value={scoreObj}
              color={color}
              emphasize
            />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#889397]">Waiting for arguments</p>
        ))}

      {scoreMode === "compare" && (
        <div className="mt-3 space-y-2">
          <ScoreTrack
            label="Before Contestation"
            value={scoreBeforeObj || scoreObj}
            color="#889397"
          />
          <ScoreTrack
            label="After Contestation"
            value={scoreObj}
            color={color}
            emphasize
          />
        </div>
      )}

      {precedentsOpen && precedent && (
        <div className="mt-3 w-full rounded-lg bg-white p-3 text-left text-sm text-[#3D4F58]">
          <div className="font-semibold text-[#112733]">{precedent.title}</div>
          {precedent.root_cause && (
            <div className="mt-1 text-[#5C6C75]">
              Root cause: {precedent.root_cause}
            </div>
          )}
          {precedent.observations && (
            <p className="mt-1.5 leading-6">{precedent.observations}</p>
          )}
          {precedent.instructions && (
            <p className="mt-1.5 leading-6 text-[#5C6C75]">
              {precedent.instructions}
            </p>
          )}
        </div>
      )}
    </Tag>
  );
}

function CandidateCardSkeleton() {
  return (
    <div className="rounded-xl border border-[#D8E3DF] bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 animate-pulse rounded-full bg-[#E8EDEB]" />
        <div className="h-4 w-2/5 animate-pulse rounded bg-[#E8EDEB]" />
      </div>
      <div className="mt-3 h-3 w-full animate-pulse rounded bg-[#E8EDEB]" />
      <div className="mt-2 h-3 w-4/5 animate-pulse rounded bg-[#E8EDEB]" />
    </div>
  );
}

function repairLines(instructions) {
  if (!instructions) return [];
  if (Array.isArray(instructions)) {
    return instructions
      .map((step, idx) =>
        typeof step === "string"
          ? step
          : step.description || `Step ${step.step || idx + 1}`,
      )
      .filter(Boolean);
  }
  return String(instructions)
    .split("\n")
    .map((line) => line.replace(/^-\s*Step\s+\d+:\s*/i, "").trim())
    .filter(Boolean);
}

function ReportField({ label, value, onChange, minHeight = "7.5rem" }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-[#5C6C75]">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] px-3 py-2.5 text-sm leading-6 text-[#112733] [field-sizing:content]"
        style={{ minHeight }}
      />
    </label>
  );
}

function IncidentReportSheet({
  eyebrow,
  machineId,
  errorCode,
  errorName,
  rootCause,
  repairInstructions,
  rationale,
  editable = false,
  onRootCause,
  onRepair,
  onRationale,
  headerExtra,
}) {
  const lines = repairLines(repairInstructions);

  return (
    <article className="flex min-h-[36rem] flex-col rounded-xl border border-[#D8E3DF] bg-white">
      <header className="border-b border-[#E8EDEB] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#5C6C75]">
              {eyebrow}
            </div>
            <h3 className="mt-1 text-lg font-semibold text-[#112733]">
              {errorName || "Incident report"}
            </h3>
          </div>
          {headerExtra}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-[#889397]">Machine</dt>
            <dd className="font-medium text-[#112733]">{machineId || "M1"}</dd>
          </div>
          <div>
            <dt className="text-[#889397]">Error</dt>
            <dd className="font-medium text-[#112733]">
              {errorCode || "E13"}
              {errorName ? ` · ${errorName}` : ""}
            </dd>
          </div>
        </dl>
      </header>
      <div className="flex flex-1 flex-col gap-5 px-5 py-4">
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5C6C75]">
            Root cause
          </h4>
          {editable ? (
            <textarea
              value={rootCause}
              onChange={(event) => onRootCause(event.target.value)}
              className="mt-1.5 w-full resize-y rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] px-3 py-2.5 text-sm leading-6 text-[#112733] [field-sizing:content]"
              style={{ minHeight: "8rem" }}
            />
          ) : (
            <p className="mt-1.5 text-sm leading-6 text-[#112733]">
              {rootCause}
            </p>
          )}
        </section>
        <section className="flex-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5C6C75]">
            Repair instructions
          </h4>
          {editable ? (
            <textarea
              value={
                typeof repairInstructions === "string"
                  ? repairInstructions
                  : formatStepsToText(repairInstructions)
              }
              onChange={(event) => onRepair(event.target.value)}
              className="mt-1.5 w-full resize-y rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] px-3 py-2.5 text-sm leading-6 text-[#112733] [field-sizing:content]"
              style={{ minHeight: "14rem" }}
            />
          ) : (
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#112733]">
              {lines.map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ol>
          )}
        </section>
        {(editable || rationale) && (
          <section>
            {editable ? (
              <ReportField
                label="Contestation rationale"
                value={rationale || ""}
                onChange={onRationale}
                minHeight="6.5rem"
              />
            ) : (
              <>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#5C6C75]">
                  Notes
                </h4>
                <p className="mt-1.5 text-sm leading-6 text-[#3D4F58]">
                  {rationale}
                </p>
              </>
            )}
          </section>
        )}
      </div>
    </article>
  );
}

function ArgumentCard({
  arg,
  onAction,
  onInspectJson,
  interactive = true,
  isSaving = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draftReason, setDraftReason] = useState(arg.reason || "");
  const [draftScore, setDraftScore] = useState(String(arg.score ?? 0.5));

  useEffect(() => {
    setDraftReason(arg.reason || "");
    setDraftScore(String(arg.score ?? 0.5));
  }, [arg.reason, arg.score]);

  const active = isArgumentActive(arg);
  const isSupport = (arg.stance || arg.type) === "support";
  const agentInfo = AGENT_META[arg.agent] || {
    label: arg.agent,
    shortLabel: arg.agent,
    badgeBg: "bg-gray-100",
    badgeText: "text-gray-700",
    icon: "Diagram",
  };

  const minimalRecord = {
    session_id: arg.session_id,
    candidate: arg.candidate,
    agent: arg.agent,
    stance: arg.stance,
    score: arg.score,
    reason: arg.reason,
    created_at: arg.created_at,
    ...(arg.human_action
      ? {
          status: arg.status,
          human_action: arg.human_action,
          reviewed_by: arg.reviewed_by,
        }
      : {}),
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        !active
          ? "border-dashed border-[#C1C7C6] bg-[#F8FAF9] opacity-65"
          : isSupport
            ? "border-l-4 border-[#D8E3DF] border-l-[#00A35C] bg-white"
            : "border-l-4 border-[#D8E3DF] border-l-[#DB6C00] bg-white"
      }`}
    >
      {/* Top header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium ${agentInfo.badgeBg} ${agentInfo.badgeText}`}
          >
            <Icon glyph={agentInfo.icon} size={14} />
            {agentInfo.label}
          </span>
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-semibold ${
              isSupport
                ? "bg-[#E3FCF7] text-[#00684A]"
                : "bg-[#FFEAE5] text-[#B1371F]"
            }`}
          >
            {isSupport ? "Support (+)" : "Challenge (-)"}
          </span>
          {arg.human_action === "accept" && (
            <span className="rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-semibold text-[#00684A]">
              Accepted
            </span>
          )}
          {arg.human_action === "reject" && (
            <span className="rounded-full bg-[#FFEAE5] px-2.5 py-0.5 text-sm font-semibold text-[#B1371F]">
              Rejected (Excluded)
            </span>
          )}
          {arg.human_action === "modify" && (
            <span className="rounded-full bg-[#FEF7DB] px-2.5 py-0.5 text-sm font-semibold text-[#944F01]">
              Modified by Engineer
            </span>
          )}
          {arg.human_action === "add" && (
            <span className="rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-semibold text-[#00684A]">
              Engineer Added
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[#F1F5F3] px-2.5 py-1 font-mono text-sm font-semibold text-[#112733]">
            score: {Number(arg.score ?? 0).toFixed(2)}
          </span>
          <button
            type="button"
            onClick={() => onInspectJson && onInspectJson(minimalRecord)}
            title="Inspect MongoDB argument record"
            className="rounded px-2 py-1 font-mono text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
          >
            {"{}"}
          </button>
        </div>
      </div>

      {/* Reason text or Edit Form */}
      {editing ? (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-[#D8E3DF] bg-[#F8FAF9] p-3.5">
          <TextArea
            label="Argument reason (plain language)"
            value={draftReason}
            onChange={setDraftReason}
          />
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-[#3D4F58]">
              <span>Confidence Score (0.00 – 1.00):</span>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={draftScore}
                onChange={(e) => setDraftScore(e.target.value)}
                className="w-24 rounded-md border border-[#C1C7C6] bg-white px-2.5 py-1 text-sm font-semibold text-[#112733]"
              />
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-[#C1C7C6] bg-white px-3 py-1.5 text-sm font-medium text-[#3D4F58] hover:bg-[#F1F5F3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onAction({
                    actionType: "modify",
                    argumentId: arg.argument_id,
                    reason: draftReason,
                    score: Number(draftScore),
                  });
                  setEditing(false);
                }}
                className="rounded-md bg-[#00684A] px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-[#00593F]"
              >
                Save & Rescore
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2.5">
          {arg.original_reason && arg.original_reason !== arg.reason && (
            <p className="mb-1 text-sm text-[#5C6C75] line-through">
              Original: {arg.original_reason}
            </p>
          )}
          <p
            className={`text-base leading-6 text-[#112733] ${
              !active ? "line-through" : ""
            }`}
          >
            {arg.reason}
          </p>
          {Array.isArray(arg.evidence_refs) && arg.evidence_refs.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {arg.evidence_refs.map((ref, idx) => (
                <span
                  key={idx}
                  className="rounded bg-[#F1F5F3] px-2.5 py-1 text-sm text-[#5C6C75]"
                >
                  Ref: {ref}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action buttons for Reliability Engineer */}
      {interactive && !editing && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#E8EDEB] pt-3">
          <div className="flex items-center gap-2">
            {active ? (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    onAction({
                      actionType: "accept",
                      argumentId: arg.argument_id,
                    })
                  }
                  className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    arg.human_action === "accept"
                      ? "border-[#00684A] bg-[#E3FCF7] text-[#00684A]"
                      : "border-[#D8E3DF] bg-white text-[#00684A] hover:bg-[#E3FCF7]"
                  }`}
                >
                  <Icon glyph="Checkmark" size={14} />
                  Accept
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() =>
                    onAction({
                      actionType: "reject",
                      argumentId: arg.argument_id,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D8E3DF] bg-white px-3 py-1.5 text-sm font-semibold text-[#B1371F] hover:bg-[#FFEAE5]"
                >
                  <Icon glyph="X" size={14} />
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D8E3DF] bg-white px-3 py-1.5 text-sm font-semibold text-[#3D4F58] hover:bg-[#F1F5F3]"
                >
                  <Icon glyph="Edit" size={14} />
                  Modify
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  onAction({
                    actionType: "restore",
                    argumentId: arg.argument_id,
                  })
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-[#C1C7C6] bg-white px-3 py-1.5 text-sm font-semibold text-[#112733] hover:bg-[#F1F5F3]"
              >
                Restore Argument
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const STAGE_ORDER = ["evidence", "debate", "review", "report"];
const WORKFLOW_STEPS = [
  { id: "evidence", label: "Evidence" },
  { id: "debate", label: "Specialist debate" },
  { id: "review", label: "Engineer review" },
  { id: "report", label: "Incident report" },
];
const SPECIALIST_IDS = ["vibration_pattern_agent", "maintenance_history_agent"];
const REVEAL_MS = 280;

const EMPTY_ACTIVITY = {
  root_cause: [],
  vibration_pattern_agent: [],
  maintenance_history_agent: [],
  reliability_engineer: [],
  refiner: [],
};

function sameActivityEvent(left, right) {
  if (!left || !right || left.type !== right.type) return false;
  if (left.type === "update") {
    return left.name === right.name && left.runId === right.runId;
  }
  if (left.type === "message") {
    return (
      left.role === right.role &&
      left.at === right.at &&
      left.content === right.content
    );
  }
  return (
    left.status === right.status &&
    left.at === right.at &&
    left.runId === right.runId &&
    left.content === right.content
  );
}

const ACTORS = [
  {
    id: "root_cause",
    label: "Root Cause Agent",
    short: "Root cause",
    kind: "agent",
    icon: "Sparkle",
    view: "evidence",
  },
  {
    id: "vibration_pattern_agent",
    label: "Vibration Pattern",
    short: "Vibration",
    kind: "agent",
    icon: "Sparkle",
    view: "debate",
  },
  {
    id: "maintenance_history_agent",
    label: "Maintenance History",
    short: "Maintenance",
    kind: "agent",
    icon: "Sparkle",
    view: "debate",
  },
  {
    id: "reliability_engineer",
    label: "Reliability Engineer",
    short: "Engineer",
    kind: "human",
    icon: "Person",
    view: "review",
  },
  {
    id: "refiner",
    label: "Refinement Agent",
    short: "Refiner",
    kind: "agent",
    icon: "Sparkle",
    view: "report",
  },
];

export default function ContestableWorkspace({
  incident = null,
  alert = null,
  selectionOptions = [],
  selectedKey = "benchmark",
  onSelectKey,
  activeSelection = null,
  dataSource = "leafy",
  onCommitted,
  toolbarStart = null,
}) {
  const [hasStarted, setHasStarted] = useState(false);
  const [lockedSelection, setLockedSelection] = useState(null);
  const [workflowStage, setWorkflowStage] = useState("evidence");
  const [view, setView] = useState("evidence");
  const [evidenceStatus, setEvidenceStatus] = useState("idle");
  const [session, setSession] = useState(null);
  const [argumentsList, setArgumentsList] = useState([]);
  const [agentStatus, setAgentStatus] = useState({
    vibration_pattern_agent: "idle",
    maintenance_history_agent: "idle",
  });
  const [baselineScores, setBaselineScores] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(
    "bearing_degradation",
  );
  const [precedentsOpen, setPrecedentsOpen] = useState(false);
  const [argumentsOpen, setArgumentsOpen] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isGeneratingRefinement, setIsGeneratingRefinement] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [inspectedDoc, setInspectedDoc] = useState(null);
  const [lineageDoc, setLineageDoc] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [newArgStance, setNewArgStance] = useState("support");
  const [newArgScore, setNewArgScore] = useState("0.85");
  const [newArgReason, setNewArgReason] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [selectedActorId, setSelectedActorId] = useState("root_cause");
  const [activityByActor, setActivityByActor] = useState(EMPTY_ACTIVITY);
  const [draftRootCause, setDraftRootCause] = useState("");
  const [draftRepairSteps, setDraftRepairSteps] = useState("");
  const [draftRationale, setDraftRationale] = useState("");

  const queueRef = useRef([]);
  const timerRef = useRef(null);
  const shownIdsRef = useRef(new Set());
  const requestDoneRef = useRef({
    vibration_pattern_agent: false,
    maintenance_history_agent: false,
  });
  const debateStartedRef = useRef(false);
  const runGenerationRef = useRef(0);
  const enqueueRef = useRef(() => {});
  const resetMenuRef = useRef(null);
  const appendActivity = useCallback((actorId, event) => {
    if (!actorId || !event) return;
    setActivityByActor((prev) => {
      const list = prev[actorId] || [];
      if (list.some((item) => sameActivityEvent(item, event))) return prev;
      return { ...prev, [actorId]: [...list, event] };
    });
  }, []);
  const clearActorActivity = useCallback((actorId) => {
    setActivityByActor((prev) => ({ ...prev, [actorId]: [] }));
  }, []);

  useEffect(() => {
    if (!resetConfirmOpen) return undefined;
    const closeMenu = (event) => {
      if (event.key === "Escape") {
        setResetConfirmOpen(false);
        return;
      }
      if (
        event.type === "mousedown" &&
        !resetMenuRef.current?.contains(event.target)
      ) {
        setResetConfirmOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [resetConfirmOpen]);

  const liveScored = useMemo(() => {
    const candidates = session?.candidates || DEFAULT_CANDIDATES;
    return computeCandidateScores(argumentsList, candidates);
  }, [argumentsList, session?.candidates]);

  const candidates = session?.candidates || DEFAULT_CANDIDATES;
  const winningCandidate = liveScored.winningCandidate || "bearing_degradation";
  const debateDone = SPECIALIST_IDS.every((id) => agentStatus[id] === "done");

  const selectedMeta =
    candidates.find((cand) => cand.id === selectedCandidate) || candidates[0];
  const engineerPreset = ENGINEER_PRESET_SUGGESTIONS.find(
    (preset) => preset.candidate === selectedCandidate,
  );

  useEffect(() => {
    const match = ENGINEER_PRESET_SUGGESTIONS.find(
      (preset) => preset.candidate === selectedCandidate,
    );
    if (!match) return;
    setNewArgStance(match.stance);
    setNewArgScore(String(match.score));
    setNewArgReason(match.reason);
  }, [selectedCandidate]);

  useEffect(() => {
    if (!debateDone || baselineScores) return;
    setBaselineScores(liveScored.candidateScores);
  }, [baselineScores, debateDone, liveScored]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.body.classList.remove("contestable-select-open");
    },
    [],
  );

  const settleAgents = useCallback(() => {
    setAgentStatus((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of SPECIALIST_IDS) {
        const drained =
          requestDoneRef.current[id] &&
          !queueRef.current.some((arg) => arg.agent === id);
        if (drained && prev[id] === "running") {
          next[id] = "done";
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const pump = useCallback(() => {
    if (timerRef.current) return;
    const step = () => {
      const nextArg = queueRef.current.shift();
      if (!nextArg) {
        timerRef.current = null;
        settleAgents();
        return;
      }
      shownIdsRef.current.add(nextArg.argument_id);
      setArgumentsList((prev) =>
        prev.some((arg) => arg.argument_id === nextArg.argument_id)
          ? prev
          : [...prev, nextArg],
      );
      settleAgents();
      timerRef.current = setTimeout(step, REVEAL_MS);
    };
    timerRef.current = setTimeout(step, REVEAL_MS);
  }, [settleAgents]);

  enqueueRef.current = (incoming) => {
    const fresh = [];
    for (const arg of incoming || []) {
      if (!arg?.argument_id || shownIdsRef.current.has(arg.argument_id)) {
        continue;
      }
      if (
        queueRef.current.some((item) => item.argument_id === arg.argument_id)
      ) {
        continue;
      }
      fresh.push(arg);
    }
    if (fresh.length === 0) {
      settleAgents();
      return;
    }
    queueRef.current.push(...fresh);
    pump();
  };

  const prepare = useCallback(
    async (isCancelled = () => false, overrideContext = null) => {
      const targetIncident =
        overrideContext !== null ? overrideContext.incident : incident;
      const targetAlert =
        overrideContext !== null
          ? overrideContext.alert
          : alert || STANDALONE_PRESET_SCENARIOS[0].alert;
      setEvidenceStatus("running");
      setErrorMsg("");
      clearActorActivity("root_cause");
      try {
        const res = await prepareContestableSession({
          incident: targetIncident,
          alert: targetAlert,
          machineId:
            targetIncident?.machine_id || targetAlert?.machine_id || "M1",
          dataSource,
          onEvent: (event) => {
            if (isCancelled()) return;
            appendActivity("root_cause", event);
          },
        });
        if (isCancelled()) return;
        for (const message of res?.messages || []) {
          appendActivity("root_cause", message);
        }
        setSession(res.session || null);
        setArgumentsList([]);
        setEvidenceStatus("ready");
        const firstId = res.session?.candidates?.[0]?.id;
        if (firstId) setSelectedCandidate(firstId);
      } catch (err) {
        if (isCancelled()) return;
        setEvidenceStatus("error");
        setErrorMsg(err.message || "Failed to gather candidate root causes");
      }
    },
    [alert, appendActivity, clearActorActivity, dataSource, incident],
  );

  const handleAnalyzeRootCause = useCallback(() => {
    const selectionSnapshot = activeSelection || {
      key: selectedKey,
      kind: incident ? "incident" : "alert",
      label: incident
        ? `Incident · ${incident.machine_id || "M1"} · ${incident.error_code || "E13"} ${incident.error_name || "Incident"}`
        : `Alert · ${STANDALONE_PRESET_SCENARIOS[0].title}`,
      shortLabel: incident
        ? `Incident · ${incident.machine_id || "M1"} · ${incident.error_code || "E13"} ${incident.error_name || "Incident"}`
        : `${STANDALONE_PRESET_SCENARIOS[0].machine_id} · ${STANDALONE_PRESET_SCENARIOS[0].error_code} ${STANDALONE_PRESET_SCENARIOS[0].error_name}`,
      incident,
      alert: alert || STANDALONE_PRESET_SCENARIOS[0].alert,
    };
    setLockedSelection(selectionSnapshot);
    setHasStarted(true);
    setWorkflowStage("evidence");
    setView("evidence");
    runGenerationRef.current += 1;
    const generation = runGenerationRef.current;
    prepare(() => runGenerationRef.current !== generation, {
      incident: selectionSnapshot.incident,
      alert: selectionSnapshot.alert,
    });
  }, [activeSelection, alert, incident, prepare, selectedKey]);

  const runSpecialist = useCallback(
    async (agentId) => {
      if (!session?.session_id) return;
      const generation = runGenerationRef.current;
      requestDoneRef.current[agentId] = false;
      setAgentStatus((prev) => ({ ...prev, [agentId]: "running" }));
      setErrorMsg("");
      clearActorActivity(agentId);
      try {
        const res = await runContestableSpecialist({
          sessionId: session.session_id,
          agent: agentId,
          onEvent: (event) => {
            if (runGenerationRef.current !== generation) return;
            appendActivity(agentId, event);
          },
        });
        if (runGenerationRef.current !== generation) return;
        for (const message of res?.messages || []) {
          appendActivity(agentId, message);
        }
        if (res?.session) setSession(res.session);
        requestDoneRef.current[agentId] = true;
        enqueueRef.current(res?.arguments || []);
      } catch (err) {
        if (runGenerationRef.current !== generation) return;
        requestDoneRef.current[agentId] = true;
        setAgentStatus((prev) => ({ ...prev, [agentId]: "error" }));
        setErrorMsg(err.message || "Specialist agent failed");
      }
    },
    [appendActivity, clearActorActivity, session?.session_id],
  );

  const handleArgumentAction = useCallback(
    async ({ actionType, argumentId, reason, score, candidate, stance }) => {
      if (!session?.session_id) return;
      setIsSavingAction(true);
      setErrorMsg("");
      const actionLabels = {
        accept: "Accepted",
        reject: "Rejected",
        modify: "Modified",
        restore: "Restored",
        add: "Added",
      };
      const candidateId = candidate || selectedCandidate;
      const candidateLabel =
        (session?.candidates || DEFAULT_CANDIDATES).find(
          (item) => item.id === candidateId
        )?.label || candidateId;
      const detail = [
        `${actionLabels[actionType] || actionType} an argument for ${candidateLabel}.`,
        stance ? `Stance: ${stance}.` : "",
        score !== undefined && score !== null && score !== ""
          ? `Score: ${score}.`
          : "",
        reason || "",
      ]
        .filter(Boolean)
        .join("\n");
      appendActivity("reliability_engineer", {
        type: "message",
        role: "user",
        at: new Date().toISOString(),
        content: detail,
      });

      setArgumentsList((prev) => {
        if (actionType === "add") {
          const added = {
            argument_id: `${session.session_id}_eng_${Date.now().toString().slice(-4)}`,
            session_id: session.session_id,
            candidate: candidate || selectedCandidate,
            agent: "reliability_engineer",
            stance: stance || newArgStance,
            score: Number(score ?? 0.85),
            reason: reason || newArgReason,
            created_at: new Date().toISOString(),
            status: "active",
            human_action: "add",
            reviewed_by: "Reliability Engineer",
          };
          return [...prev, added];
        }
        return prev.map((arg) => {
          if (arg.argument_id !== argumentId) return arg;
          if (actionType === "reject") {
            return { ...arg, status: "rejected", human_action: "reject" };
          }
          if (actionType === "accept") {
            return { ...arg, status: "active", human_action: "accept" };
          }
          if (actionType === "restore") {
            return {
              ...arg,
              status: "active",
              human_action: null,
              reason: arg.original_reason || arg.reason,
              score: arg.original_score ?? arg.score,
            };
          }
          if (actionType === "modify") {
            return {
              ...arg,
              status: "active",
              human_action: "modify",
              original_reason: arg.original_reason || arg.reason,
              original_score: arg.original_score ?? arg.score,
              reason: reason ?? arg.reason,
              score: score !== undefined ? Number(score) : arg.score,
            };
          }
          return arg;
        });
      });

      try {
        const res = await submitContestableAction({
          sessionId: session.session_id,
          actionType,
          argumentId,
          reason,
          score,
          candidate,
          stance,
          reviewerRole: "Reliability Engineer",
        });
        setSession(res.session);
        if (Array.isArray(res.arguments) && res.arguments.length > 0) {
          setArgumentsList(res.arguments);
          shownIdsRef.current = new Set(
            res.arguments.map((arg) => arg.argument_id),
          );
        }
      } catch {
        // Keep the optimistic score update if the request fails.
      } finally {
        setIsSavingAction(false);
      }
    },
    [
      appendActivity,
      newArgReason,
      newArgStance,
      selectedCandidate,
      session?.candidates,
      session?.session_id,
    ],
  );

  const handleGenerateReport = useCallback(async () => {
    const generation = runGenerationRef.current;
    const winner = liveScored.winningCandidate || selectedCandidate;
    const fallback =
      DEFAULT_REFINEMENT_BY_CANDIDATE[winner] ||
      DEFAULT_REFINEMENT_BY_CANDIDATE.misalignment;
    const winnerLabel = liveScored.candidateScores[winner]?.label || winner;

    setDraftRootCause(fallback.root_cause);
    setDraftRepairSteps(formatStepsToText(fallback.repair_instructions));
    setDraftRationale(
      `Selected ${winnerLabel} (score ${(liveScored.candidateScores[winner]?.score ?? 0.5).toFixed(3)}) after specialist arguments and reliability engineer review.`,
    );

    if (!session?.session_id) return;
    setIsGeneratingRefinement(true);
    clearActorActivity("refiner");
    try {
      const res = await generateContestableRefinement({
        sessionId: session.session_id,
        onEvent: (event) => {
          if (runGenerationRef.current !== generation) return;
          appendActivity("refiner", event);
        },
      });
      if (runGenerationRef.current !== generation) return;
      for (const message of res?.messages || []) {
        appendActivity("refiner", message);
      }
      if (res.refinement) {
        setDraftRootCause(res.refinement.root_cause || fallback.root_cause);
        setDraftRepairSteps(
          formatStepsToText(
            res.refinement.repair_instructions || fallback.repair_instructions,
          ),
        );
        setDraftRationale(res.refinement.rationale || "");
      }
      if (res.lineage) setLineageDoc(res.lineage);
    } catch {
      // Keep the immediate fallback draft.
    } finally {
      if (runGenerationRef.current === generation) {
        setIsGeneratingRefinement(false);
      }
    }
  }, [
    appendActivity,
    clearActorActivity,
    liveScored,
    selectedCandidate,
    session?.session_id,
  ]);

  const handleCommitToIncidentReport = useCallback(async () => {
    if (!session?.session_id) return;
    setIsCommitting(true);
    setErrorMsg("");
    try {
      const targetIncident = lockedSelection?.incident ?? incident;
      const res = await commitContestableIncident({
        sessionId: session.session_id,
        incidentId: targetIncident?._id || session?.incident_id,
        rootCause: draftRootCause,
        repairInstructions: draftRepairSteps,
        rationale: draftRationale,
        reviewerRole: "Reliability Engineer",
        createIfMissing: true,
      });
      setCommitSuccess(true);
      if (res.lineage) setLineageDoc(res.lineage);
      if (onCommitted) onCommitted(res.incident);
    } catch (err) {
      setErrorMsg(err.message || "Failed to commit incident report");
    } finally {
      setIsCommitting(false);
    }
  }, [
    draftRationale,
    draftRepairSteps,
    draftRootCause,
    incident,
    lockedSelection,
    onCommitted,
    session?.incident_id,
    session?.session_id,
  ]);

  const handleContinue = () => {
    if (workflowStage === "evidence") {
      if (evidenceStatus !== "ready" || !session?.session_id) return;
      if (!debateStartedRef.current) {
        debateStartedRef.current = true;
        setAgentStatus({
          vibration_pattern_agent: "running",
          maintenance_history_agent: "running",
        });
        for (const id of SPECIALIST_IDS) runSpecialist(id);
      }
      setWorkflowStage("debate");
      setView("debate");
      return;
    }
    if (workflowStage === "debate") {
      if (!debateDone) return;
      setWorkflowStage("review");
      setView("review");
      return;
    }
    if (workflowStage === "review") {
      setArgumentsOpen(false);
      setWorkflowStage("report");
      setView("report");
      handleGenerateReport();
    }
  };

  const handleReset = () => {
    setResetConfirmOpen(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    queueRef.current = [];
    shownIdsRef.current = new Set();
    requestDoneRef.current = {
      vibration_pattern_agent: false,
      maintenance_history_agent: false,
    };
    debateStartedRef.current = false;
    runGenerationRef.current += 1;
    setHasStarted(false);
    setLockedSelection(null);
    setEvidenceStatus("idle");
    setWorkflowStage("evidence");
    setView("evidence");
    setSession(null);
    setArgumentsList([]);
    setAgentStatus({
      vibration_pattern_agent: "idle",
      maintenance_history_agent: "idle",
    });
    setBaselineScores(null);
    setPrecedentsOpen(false);
    setArgumentsOpen(false);
    setCommitSuccess(false);
    setErrorMsg("");
    setLineageDoc(null);
    setInspectedDoc(null);
    setDraftRootCause("");
    setDraftRepairSteps("");
    setDraftRationale("");
    setSelectedCandidate("bearing_degradation");
    setIsGeneratingRefinement(false);
    setActivityOpen(false);
    setSelectedActorId("root_cause");
    setActivityByActor(EMPTY_ACTIVITY);
  };

  const openGovernance = async () => {
    let lineage = lineageDoc;
    if (!lineage && session?.session_id) {
      try {
        const res = await fetchContestableLineage(session.session_id);
        lineage = res?.lineage || null;
        if (lineage) setLineageDoc(lineage);
      } catch {
        lineage = null;
      }
    }
    setInspectedDoc({
      title: `MongoDB Governance & Argument Records${
        session?.session_id ? ` (${session.session_id})` : ""
      }`,
      subtitle: "contestable_sessions $lookup with argument_records",
      value: lineage || {
        session_id: session?.session_id,
        argument_records: argumentsList,
      },
    });
  };

  const inspectArgument = (arg) => (record) => {
    setInspectedDoc({
      title: `MongoDB Record: ${arg.argument_id}`,
      subtitle: "Stored in argument_records collection",
      value: record,
    });
  };

  const interventionCounts = useMemo(
    () => ({
      accepted: argumentsList.filter((a) => a.human_action === "accept").length,
      rejected: argumentsList.filter((a) => a.human_action === "reject").length,
      modified: argumentsList.filter((a) => a.human_action === "modify").length,
      added: argumentsList.filter((a) => a.human_action === "add").length,
    }),
    [argumentsList],
  );

  const stageIndex = STAGE_ORDER.indexOf(workflowStage);
  const reviewReached = stageIndex >= STAGE_ORDER.indexOf("review");
  const hasCalculatedScores =
    argumentsList.length > 0 ||
    Boolean(baselineScores) ||
    Boolean(session?.scores_before);
  const scoreMode =
    reviewReached && (baselineScores || session?.scores_before)
      ? "compare"
      : hasCalculatedScores && stageIndex >= STAGE_ORDER.indexOf("debate")
        ? "live"
        : "none";
  const continueDisabled =
    evidenceStatus !== "ready" ||
    (workflowStage === "evidence" && !session?.session_id) ||
    (workflowStage === "debate" && !debateDone) ||
    (workflowStage === "review" && isGeneratingRefinement) ||
    workflowStage === "report";
  const showContinue = workflowStage !== "report" && !continueDisabled;

  const handleStepSelect = (key) => {
    if (!hasStarted) return;
    const stepIndex = Number(key);
    if (
      !Number.isInteger(stepIndex) ||
      stepIndex < 0 ||
      stepIndex > stageIndex
    ) {
      return;
    }
    const nextView = WORKFLOW_STEPS[stepIndex]?.id;
    if (!nextView || nextView === view) return;
    setView(nextView);
  };

  const presetScenario = STANDALONE_PRESET_SCENARIOS[0];
  const currentSelection = lockedSelection ||
    activeSelection || {
      key: selectedKey,
      kind: incident ? "incident" : "alert",
      label: incident
        ? `Incident · ${incident.machine_id || "M1"} · ${incident.error_code || "E13"} ${incident.error_name || "Incident"}`
        : `Alert · ${presetScenario.title}`,
      shortLabel: incident
        ? `Incident · ${incident.machine_id || "M1"} · ${incident.error_code || "E13"} ${incident.error_name || "Incident"}`
        : `${presetScenario.machine_id} · ${presetScenario.error_code} ${presetScenario.error_name}`,
      machineId:
        incident?.machine_id || alert?.machine_id || presetScenario.machine_id,
      errorCode:
        incident?.error_code || alert?.err_code || presetScenario.error_code,
      errorName:
        incident?.error_name || alert?.err_name || presetScenario.error_name,
      summary:
        incident?.root_cause ||
        `${presetScenario.subtitle} — Vibration ${presetScenario.alert.details.vibration} mm/s, Temp ${presetScenario.alert.details.temperature} °C`,
    };

  const effectiveIncident = lockedSelection?.incident ?? incident;
  const originalRootCause =
    session?.original_incident?.root_cause ||
    effectiveIncident?.root_cause ||
    presetScenario.initial_root_cause;
  const originalRepair =
    session?.original_incident?.repair_instructions ||
    effectiveIncident?.repair_instructions ||
    presetScenario.initial_repair_instructions;
  const reportMachine =
    effectiveIncident?.machine_id ||
    session?.machine_id ||
    currentSelection.machineId ||
    presetScenario.machine_id;
  const reportErrorCode =
    effectiveIncident?.error_code ||
    session?.error_code ||
    currentSelection.errorCode ||
    presetScenario.error_code;
  const reportErrorName =
    effectiveIncident?.error_name ||
    session?.error_name ||
    currentSelection.errorName ||
    presetScenario.error_name;

  const actorWorking = (actor) => {
    if (!hasStarted) return false;
    if (actor.id === "root_cause") return evidenceStatus === "running";
    if (SPECIALIST_IDS.includes(actor.id)) {
      return agentStatus[actor.id] === "running";
    }
    if (actor.id === "refiner") return isGeneratingRefinement;
    return false;
  };

  const engineerArgs = argumentsList.filter(
    (arg) =>
      arg.agent === "reliability_engineer" &&
      arg.candidate === selectedCandidate,
  );

  const renderAgentColumns = (interactive) => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {CONTESTABLE_AGENTS.map((agentCfg) => {
        const columnArgs = argumentsList.filter(
          (arg) =>
            arg.agent === agentCfg.id && arg.candidate === selectedCandidate,
        );
        const status = agentStatus[agentCfg.id];
        return (
          <div
            key={agentCfg.id}
            className="flex flex-col rounded-xl border border-[#D8E3DF] bg-white p-4"
          >
            <div className="border-b border-[#E8EDEB] pb-3">
              <h4 className="text-lg font-semibold text-[#112733]">
                {agentCfg.name}
              </h4>
              <p className="mt-1 text-sm text-[#5C6C75]">
                {agentCfg.description}
              </p>
            </div>
            <div className="mt-3 space-y-2.5">
              <div className="text-sm font-semibold text-[#112733]">
                {selectedMeta?.label || selectedCandidate}
              </div>
              {columnArgs.map((arg) => (
                <ArgumentCard
                  key={arg.argument_id}
                  arg={arg}
                  interactive={interactive}
                  isSaving={isSavingAction}
                  onAction={handleArgumentAction}
                  onInspectJson={inspectArgument(arg)}
                />
              ))}
              {status === "running" && columnArgs.length === 0 && (
                <p className="text-sm text-[#5C6C75]">Writing arguments…</p>
              )}
              {status === "error" && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm text-[#B1371F]">
                    This agent did not finish.
                  </p>
                  <Button
                    variant="secondary"
                    onPress={() => runSpecialist(agentCfg.id)}
                  >
                    Retry agent
                  </Button>
                </div>
              )}
              {status === "done" && columnArgs.length === 0 && (
                <p className="text-sm text-[#5C6C75]">
                  No arguments for this candidate yet.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(32rem,56rem)_minmax(0,1fr)] items-center gap-6 px-4 py-3">
        <div className="min-w-0 justify-self-start">
          <h1 className="text-2xl font-semibold tracking-tight text-[#112733]">
            Contestable AI
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
            commitSuccess ? " contestable-report-saved" : ""
          }`}
        >
          <Stepper
            currentStep={stageIndex}
            maxDisplaySteps={WORKFLOW_STEPS.length}
            aria-label="Contestable workflow"
            onSelectionChange={handleStepSelect}
            className="min-w-[500px] [&>li]:cursor-pointer"
          >
            {WORKFLOW_STEPS.map((step, index) => (
              <Step key={String(index)} textValue={step.label}>
                {step.label}
              </Step>
            ))}
          </Stepper>
        </div>
        <div className="flex w-full items-center justify-end">
          {toolbarStart}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 gap-3 px-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white shadow-sm">
          {errorMsg && (
            <div className="mx-5 mt-3 rounded-lg border border-[#B1371F]/30 bg-[#FFEAE5] px-4 py-2.5 text-sm font-medium text-[#B1371F]">
              {errorMsg}
            </div>
          )}

          <div className="shrink-0 border-b border-[#D8E3DF] bg-[#F8FAF9] px-5 py-4">
            {hasStarted && (
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="text-sm font-semibold uppercase tracking-wider text-[#5C6C75]">
                  Candidate Root Causes
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#D8E3DF] bg-white px-2.5 py-0.5 text-xs font-medium text-[#3D4F58]"
                  title={currentSelection.label}
                >
                  <Icon
                    glyph={
                      currentSelection.kind === "incident" ? "Guide" : "Warning"
                    }
                    size={12}
                    className={
                      currentSelection.kind === "incident"
                        ? "text-[#016BF8]"
                        : "text-[#B1371F]"
                    }
                  />
                  <span>
                    {currentSelection.shortLabel || currentSelection.label}
                  </span>
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {workflowStage !== "evidence" && (
                  <span className="text-sm text-[#3D4F58]">
                    Engineer edits:{" "}
                    <strong className="text-[#00684A]">
                      {interventionCounts.accepted} accepted
                    </strong>
                    {" · "}
                    <strong className="text-[#B1371F]">
                      {interventionCounts.rejected} rejected
                    </strong>
                    {" · "}
                    <strong className="text-[#944F01]">
                      {interventionCounts.modified} modified
                    </strong>
                    {" · "}
                    <strong className="text-[#00684A]">
                      {interventionCounts.added} added
                    </strong>
                  </span>
                )}
                <Toolbar aria-label="Candidate actions">
                  <div ref={resetMenuRef} className="relative">
                    <ToolbarAction label="Reset">
                      <Button
                        variant="tertiary"
                        size="small"
                        onPress={() => setResetConfirmOpen((open) => !open)}
                        aria-expanded={resetConfirmOpen}
                        aria-haspopup="dialog"
                        className="!border-transparent !bg-transparent !text-[#B1371F] !shadow-none hover:!border-transparent hover:!bg-transparent hover:!shadow-none focus-visible:!bg-transparent"
                      >
                        <Icon glyph="Refresh" />
                      </Button>
                    </ToolbarAction>
                    {resetConfirmOpen && (
                      <div
                        role="dialog"
                        aria-label="Confirm restart"
                        className="absolute right-0 top-full z-30 mt-1.5 w-72 rounded-xl border border-[#D8E3DF] bg-white p-3 text-left shadow-lg"
                      >
                        <p className="text-sm font-semibold text-[#112733]">
                          Restart this demo?
                        </p>
                        <p className="mt-1 text-sm leading-5 text-[#5C6C75]">
                          This will clear the current workflow, arguments, and
                          scores and start again from the first step. Are you
                          sure?
                        </p>
                        <div className="mt-3 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setResetConfirmOpen(false)}
                            className="rounded-md px-2.5 py-1 text-sm font-medium text-[#3D4F58] hover:bg-[#F1F5F3]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleReset}
                            className="rounded-md bg-[#B1371F] px-2.5 py-1 text-sm font-semibold text-white hover:bg-[#8E2C19]"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <ToolbarAction label="Show more">
                    <Button
                      variant="tertiary"
                      size="small"
                      isDisabled={evidenceStatus !== "ready"}
                      aria-expanded={precedentsOpen}
                      onPress={() => setPrecedentsOpen((open) => !open)}
                      className="!border-transparent !bg-transparent !shadow-none hover:!border-transparent hover:!bg-transparent hover:!shadow-none focus-visible:!bg-transparent"
                    >
                      <Icon glyph="ExpandVertical" />
                    </Button>
                  </ToolbarAction>
                  <div className="relative">
                    <ToolbarAction label="Explain score">
                      <Button
                        variant="tertiary"
                        size="small"
                        onPress={() => setShowFormulaInfo((prev) => !prev)}
                        aria-expanded={showFormulaInfo}
                        className="!border-transparent !bg-transparent !shadow-none hover:!border-transparent hover:!bg-transparent hover:!shadow-none focus-visible:!bg-transparent"
                      >
                        <Icon glyph="InfoWithCircle" />
                      </Button>
                    </ToolbarAction>
                    {showFormulaInfo && (
                      <div className="absolute right-0 top-full z-30 mt-1.5 w-[22rem] max-w-[90vw] rounded-xl border border-[#D8E3DF] bg-white p-4 text-sm text-[#112733] shadow-lg">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">
                            How a score is calculated
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowFormulaInfo(false)}
                            aria-label="Close scoring info"
                            className="text-[#5C6C75] hover:text-[#112733]"
                          >
                            <Icon glyph="X" size={14} />
                          </button>
                        </div>
                        <div className="mt-3 rounded-lg bg-[#F8FAF9] px-3 py-3 text-center">
                          <p className="text-base text-[#112733]">
                            score = σ(τ + αS − αC)
                          </p>
                        </div>
                        <dl className="mt-3 space-y-1.5 text-[#3D4F58]">
                          <div className="flex gap-2">
                            <dt className="w-4 shrink-0 font-medium text-[#112733]">
                              τ
                            </dt>
                            <dd>Starting belief. Begins at 0.</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-4 shrink-0 font-medium text-[#112733]">
                              α
                            </dt>
                            <dd>Weight of each side. Set to 0.3.</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-4 shrink-0 font-medium text-[#00684A]">
                              S
                            </dt>
                            <dd>Sum of the scores that support this candidate.</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="w-4 shrink-0 font-medium text-[#DB6C00]">
                              C
                            </dt>
                            <dd>Sum of the scores that challenge it.</dd>
                          </div>
                        </dl>
                        <p className="mt-3 text-[#5C6C75]">
                          Rejected arguments are left out. The bar updates as
                          arguments are accepted, rejected, modified, or added.
                        </p>
                      </div>
                    )}
                  </div>
                </Toolbar>
              </div>
            </div>
            )}

            {!hasStarted ? (
              <div className="flex min-h-[10.25rem] items-center justify-center">
                <div className="flex items-end gap-3">
                <div
                  className="w-[32rem] max-w-full"
                  onPointerDown={() => {
                    document.body.classList.add("contestable-select-open");
                  }}
                >
                    <p className="mb-2 text-sm font-semibold text-[#112733]">
                      Select an incident
                    </p>
                    <Select
                      aria-label="Select an incident"
                      className="contestable-context-select"
                      placeholder="Select an incident"
                      selectedKey={selectedKey}
                      onOpenChange={(isOpen) => {
                        document.body.classList.toggle(
                          "contestable-select-open",
                          isOpen
                        );
                      }}
                      onSelectionChange={(key) => {
                        if (key != null && onSelectKey) onSelectKey(String(key));
                      }}
                    >
                      {selectionOptions.length > 0 ? (
                        selectionOptions.map((opt) => (
                          <SelectItem
                            key={opt.key}
                            id={opt.key}
                            textValue={opt.shortLabel || opt.label}
                          >
                            {opt.shortLabel || opt.label}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem
                          id="benchmark"
                          textValue="Anomalous vibration spike on Laser Tab Welding machine"
                        >
                          Anomalous vibration spike on Laser Tab Welding machine
                        </SelectItem>
                      )}
                    </Select>
                </div>
                <Button variant="primary" onPress={handleAnalyzeRootCause}>
                  Analyze Root Cause
                </Button>
                </div>
              </div>
            ) : evidenceStatus === "running" ? (
              <div className="grid min-h-[7.25rem] grid-cols-1 gap-3 md:grid-cols-3">
                <CandidateCardSkeleton />
                <CandidateCardSkeleton />
                <CandidateCardSkeleton />
              </div>
            ) : evidenceStatus === "error" ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onPress={() =>
                    prepare(
                      () => false,
                      lockedSelection
                        ? {
                            incident: lockedSelection.incident,
                            alert: lockedSelection.alert,
                          }
                        : null,
                    )
                  }
                >
                  Retry Root Cause Agent
                </Button>
              </div>
            ) : (
              <div className="grid min-h-[7.25rem] grid-cols-1 gap-3 md:grid-cols-3">
                {candidates.map((cand) => (
                  <CandidateCard
                    key={cand.id}
                    candidate={cand}
                    scoreMode={scoreMode}
                    scoreObj={liveScored.candidateScores[cand.id]}
                    scoreBeforeObj={
                      baselineScores?.[cand.id] ||
                      session?.scores_before?.[cand.id]
                    }
                    hasArguments={argumentsList.some(
                      (arg) => arg.candidate === cand.id,
                    )}
                    isWinner={
                      argumentsList.length > 0 &&
                      winningCandidate === cand.id
                    }
                    isSelected={
                      view === "report"
                        ? argumentsList.length > 0 &&
                          winningCandidate === cand.id
                        : view !== "evidence" &&
                          selectedCandidate === cand.id
                    }
                    precedentsOpen={precedentsOpen}
                    selectable={view === "debate" || view === "review"}
                    onSelect={setSelectedCandidate}
                  />
                ))}
              </div>
            )}
          </div>

          <div
            className={`min-h-0 flex-1 p-5 ${
              !hasStarted ||
              (view === "evidence" && evidenceStatus === "ready")
                ? "flex flex-col overflow-hidden"
                : "overflow-y-auto"
            }`}
          >
            {!hasStarted && (
              <div className="grid h-full min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
                {[
                  {
                    kicker: "Vibration evidence",
                    kickerClass: "text-[#016BF8]",
                    title: "Frequency spectrum",
                    body: "Defect bands and harmonics for the selected incident appear here.",
                  },
                  {
                    kicker: "Maintenance evidence",
                    kickerClass: "text-[#944F01]",
                    title: "History and calibration",
                    body: "Repair logs, tooling changes, and sensor records appear here.",
                  },
                ].map((panel) => (
                  <div
                    key={panel.title}
                    className="flex h-full min-h-[14rem] flex-col rounded-xl border border-dashed border-[#D8E3DF] bg-[#F8FAF9] p-5"
                  >
                    <span
                      className={`text-sm font-semibold uppercase tracking-wider ${panel.kickerClass}`}
                    >
                      {panel.kicker}
                    </span>
                    <h4 className="mt-1 text-lg font-semibold text-[#112733]">
                      {panel.title}
                    </h4>
                    <p className="mt-3 max-w-md text-sm leading-6 text-[#5C6C75]">
                      {panel.body}
                    </p>
                    <p className="mt-auto pt-6 text-sm font-medium text-[#889397]">
                      Waiting for the root cause analysis
                    </p>
                  </div>
                ))}
              </div>
            )}
            {hasStarted && view === "evidence" && evidenceStatus === "ready" && (
                  <div className="grid h-full min-h-0 grid-cols-1 grid-rows-2 gap-4 lg:grid-cols-2 lg:grid-rows-1">
                    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white p-4">
                      <div className="mb-3 flex shrink-0 items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold uppercase tracking-wider text-[#016BF8]">
                            Evidence for vibration_pattern_agent
                          </span>
                          <h4 className="text-lg font-semibold text-[#112733]">
                            Vibration Frequency Spectrum & Defect Bands
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setInspectedDoc({
                              title: "Vibration Frequency Spectrum Packet",
                              subtitle:
                                "Input payload for vibration_pattern_agent",
                              value:
                                session?.evidence_summary?.vibration_spectrum,
                            })
                          }
                          className="rounded-md border border-[#D8E3DF] px-3 py-1.5 font-mono text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
                        >
                          {"{}"}
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                        {(
                          session?.evidence_summary?.vibration_spectrum
                            ?.frequency_bands || []
                        ).map((band, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3 text-sm"
                          >
                            <div className="flex items-center justify-between font-semibold text-[#112733]">
                              <span>{band.band_hz}</span>
                              <span className="font-mono text-[#016BF8]">
                                {band.amplitude_mm_s} mm/s (baseline{" "}
                                {band.baseline_mm_s} mm/s)
                              </span>
                            </div>
                            <p className="mt-1 text-[#5C6C75]">{band.notes}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white p-4">
                      <div className="mb-3 flex shrink-0 items-center justify-between">
                        <div>
                          <span className="text-sm font-semibold uppercase tracking-wider text-[#944F01]">
                            Evidence for maintenance_history_agent
                          </span>
                          <h4 className="text-lg font-semibold text-[#112733]">
                            Repair Logs, Sensor Calibration & Tooling History
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setInspectedDoc({
                              title: "Maintenance & Calibration History Packet",
                              subtitle:
                                "Input payload for maintenance_history_agent",
                              value:
                                session?.evidence_summary?.maintenance_history,
                            })
                          }
                          className="rounded-md border border-[#D8E3DF] px-3 py-1.5 font-mono text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
                        >
                          {"{}"}
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
                        {(
                          session?.evidence_summary?.maintenance_history
                            ?.repair_logs || []
                        )
                          .slice(0, 3)
                          .map((log, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3 text-sm"
                            >
                              <div className="flex items-start justify-between gap-3 font-semibold text-[#112733]">
                                <span className="min-w-0">
                                  {log.work_order} · {log.component}
                                </span>
                                <span className="shrink-0 whitespace-nowrap text-[#944F01]">
                                  {log.date}
                                </span>
                              </div>
                              <p className="mt-1 text-[#5C6C75]">
                                {log.action}
                              </p>
                            </div>
                          ))}
                        {(
                          session?.evidence_summary?.maintenance_history
                            ?.calibration_records || []
                        ).map((cal, idx) => (
                          <div
                            key={`cal-${idx}`}
                            className="rounded-lg border border-[#E8EDEB] bg-[#FEF7DB]/50 p-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-3 font-semibold text-[#112733]">
                              <span className="min-w-0">
                                Sensor {cal.sensor_id} ({cal.sensor_type})
                              </span>
                              <span className="shrink-0 whitespace-nowrap text-[#944F01]">
                                Replaced: {cal.replaced_at}
                              </span>
                            </div>
                            <p className="mt-1 text-[#5C6C75]">
                              {cal.stabilization_window} ·{" "}
                              {cal.factory_calibration}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {view === "evidence" && evidenceStatus === "running" && (
                  <div className="flex h-64 flex-col items-center justify-center gap-3">
                    <ProgressCircle
                      size="large"
                      aria-label="Root Cause Agent running"
                    />
                    <p className="text-base font-medium text-[#3D4F58]">
                      Root Cause Agent is preparing candidate root causes and
                      the evidence the specialist agents will read.
                    </p>
                  </div>
                )}

                {(view === "debate" || view === "review") && (
                  <div className="flex flex-col gap-5">
                    {renderAgentColumns(view === "review")}
                  </div>
                )}

                {view === "review" && (
                  <div className="mt-5 rounded-xl border border-[#D8E3DF] bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h4 className="text-base font-semibold text-[#112733]">
                          Add Reliability Engineer Context
                        </h4>
                        <p className="text-sm text-[#5C6C75]">
                          Shop-floor context is added to{" "}
                          <strong>
                            {selectedMeta?.label || "the selected candidate"}
                          </strong>
                          .
                        </p>
                      </div>
                      {engineerPreset && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewArgStance(engineerPreset.stance);
                            setNewArgScore(String(engineerPreset.score));
                            setNewArgReason(engineerPreset.reason);
                          }}
                          className="rounded-md border border-[#D8E3DF] bg-[#F8FAF9] px-3 py-1.5 text-sm font-medium text-[#00684A] hover:bg-[#E3FCF7]"
                        >
                          {engineerPreset.label}
                        </button>
                      )}
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm font-medium text-[#3D4F58]">
                        <span>Stance</span>
                        <select
                          value={newArgStance}
                          onChange={(e) => setNewArgStance(e.target.value)}
                          className="rounded-lg border border-[#C1C7C6] bg-white px-3 py-2 text-sm text-[#112733]"
                        >
                          <option value="support">Support (+)</option>
                          <option value="challenge">Challenge (-)</option>
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-sm font-medium text-[#3D4F58]">
                        <span>Confidence Score (0.0 – 1.0)</span>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="1"
                          value={newArgScore}
                          onChange={(e) => setNewArgScore(e.target.value)}
                          className="rounded-lg border border-[#C1C7C6] bg-white px-3 py-2 text-sm text-[#112733]"
                        />
                      </label>
                    </div>

                    <label className="flex flex-col gap-1 text-sm font-medium text-[#3D4F58]">
                      <span>Engineer Argument Reason</span>
                      <textarea
                        value={newArgReason}
                        onChange={(event) =>
                          setNewArgReason(event.target.value)
                        }
                        rows={4}
                        className="w-full resize-y rounded-lg border border-[#C1C7C6] bg-white px-3 py-2 text-sm leading-6 text-[#112733] outline-none focus:border-[#00684A]"
                      />
                    </label>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="secondary"
                        isDisabled={!newArgReason.trim() || isSavingAction}
                        onPress={() =>
                          handleArgumentAction({
                            actionType: "add",
                            candidate: selectedCandidate,
                            stance: newArgStance,
                            score: Number(newArgScore),
                            reason: newArgReason,
                          })
                        }
                      >
                        + Add Engineer Argument & Rescore
                      </Button>
                    </div>

                    {engineerArgs.length > 0 && (
                      <div className="mt-4 space-y-2.5">
                        <div className="text-sm font-semibold text-[#112733]">
                          Your arguments for {selectedMeta?.label}
                        </div>
                        {engineerArgs.map((arg) => (
                          <ArgumentCard
                            key={arg.argument_id}
                            arg={arg}
                            isSaving={isSavingAction}
                            onAction={handleArgumentAction}
                            onInspectJson={inspectArgument(arg)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {view === "report" && (
                  <div className="flex min-h-full flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setArgumentsOpen((open) => !open)}
                        className="text-sm font-semibold text-[#00684A] hover:underline"
                      >
                        {argumentsOpen
                          ? "Hide specialist arguments"
                          : "Show specialist arguments"}
                      </button>
                      {isGeneratingRefinement && (
                        <span className="inline-flex items-center gap-2 text-sm text-[#5C6C75]">
                          <ProgressCircle
                            size="small"
                            aria-label="Refinement Agent running"
                          />
                          Refinement Agent is writing the incident report…
                        </span>
                      )}
                    </div>
                    {argumentsOpen && renderAgentColumns(false)}

                    <div className="grid flex-1 grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
                      <IncidentReportSheet
                        eyebrow="Original incident report"
                        machineId={reportMachine}
                        errorCode={reportErrorCode}
                        errorName={reportErrorName}
                        rootCause={originalRootCause}
                        repairInstructions={originalRepair}
                        rationale="Initial automated diagnosis, before contestation."
                      />
                      <div className="flex flex-col gap-3">
                        <IncidentReportSheet
                          eyebrow="Refined incident report"
                          machineId={reportMachine}
                          errorCode={reportErrorCode}
                          errorName={reportErrorName}
                          rootCause={draftRootCause}
                          repairInstructions={draftRepairSteps}
                          rationale={draftRationale}
                          editable
                          onRootCause={setDraftRootCause}
                          onRepair={setDraftRepairSteps}
                          onRationale={setDraftRationale}
                          headerExtra={
                            <div className="flex items-center gap-2">
                              {commitSuccess && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3FCF7] px-3 py-1 text-sm font-semibold text-[#00684A]">
                                  <Icon glyph="CheckmarkWithCircle" size={16} />
                                  Saved
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={openGovernance}
                                title="MongoDB Governance & Argument Records"
                                aria-label="Open MongoDB governance and argument records"
                                className="rounded-md border border-[#D8E3DF] px-3 py-1.5 font-mono text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
                              >
                                {"{}"}
                              </button>
                            </div>
                          }
                        />
                        <div className="flex justify-end">
                          <Button
                            variant="primary"
                            onPress={handleCommitToIncidentReport}
                            isDisabled={
                              isGeneratingRefinement ||
                              isCommitting ||
                              !draftRootCause.trim()
                            }
                          >
                            Save Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
        </div>
        <AgentActivityPanel
          open={activityOpen}
          onToggle={() => {
            if (activityOpen) {
              setActivityOpen(false);
              return;
            }
            const runningSpecialist = SPECIALIST_IDS.find(
              (id) => agentStatus[id] === "running"
            );
            const nextId =
              evidenceStatus === "running"
                ? "root_cause"
                : runningSpecialist ||
                  (isGeneratingRefinement
                    ? "refiner"
                    : ACTORS.find((actor) => actor.view === view)?.id ||
                      "root_cause");
            setSelectedActorId(nextId);
            setActivityOpen(true);
          }}
          actors={ACTORS}
          selectedActorId={selectedActorId}
          onSelectActor={setSelectedActorId}
          activityByActor={activityByActor}
          step={view}
          isActorWorking={actorWorking}
          isActorCurrent={(actor) => hasStarted && actor.view === view}
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
    </div>
  );
}
