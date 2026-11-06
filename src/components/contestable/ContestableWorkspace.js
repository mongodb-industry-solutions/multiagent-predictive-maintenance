"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Button,
  CodeBlock,
  CodeSnippet,
  CopyButton,
  ProgressCircle,
  TextArea,
  TextField,
} from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import {
  computeCandidateScores,
  DEFAULT_CANDIDATES,
  isArgumentActive,
} from "@/lib/contestable/scoring";
import {
  buildInitialClientSession,
  CONTESTABLE_AGENTS,
  DEFAULT_REFINEMENT_BY_CANDIDATE,
  ENGINEER_PRESET_SUGGESTIONS,
  STANDALONE_PRESET_SCENARIOS,
} from "@/lib/contestable/scenarios";
import {
  startContestableSession,
  submitContestableAction,
  generateContestableRefinement,
  commitContestableIncident,
} from "@/lib/api/contestable";
import DocumentModal from "@/components/unsAction/DocumentModal";

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
          }`
      )
      .join("\n");
  }
  return "";
}

function CandidateScoreBar({
  candidateId,
  scoreObj,
  scoreBeforeObj,
  isWinner,
  isSelected,
  onSelect,
}) {
  const color = CANDIDATE_COLORS[candidateId] || "#00684A";
  const pct = Math.round((scoreObj?.score ?? 0.5) * 100);
  const beforePct =
    scoreBeforeObj?.score !== undefined
      ? Math.round(scoreBeforeObj.score * 100)
      : pct;
  const delta = pct - beforePct;

  return (
    <button
      type="button"
      onClick={() => onSelect && onSelect(candidateId)}
      className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? "border-[#00684A] bg-[#F4FBF8] shadow-sm"
          : "border-[#D8E3DF] bg-white hover:border-[#889397]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-base text-[#112733]">
            {scoreObj?.label || candidateId}
          </span>
        </span>
        {isWinner && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E3FCF7] px-2.5 py-0.5 text-sm font-semibold text-[#00684A]">
            <Icon glyph="CheckmarkWithCircle" size={14} />
            Leading
          </span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#112733]">
            {(scoreObj?.score ?? 0.5).toFixed(3)}
          </span>
          <span className="text-sm text-[#5C6C75]">({pct}%)</span>
        </div>
        {delta !== 0 && (
          <span
            className={`text-sm font-semibold ${
              delta > 0 ? "text-[#00684A]" : "text-[#B1371F]"
            }`}
          >
            {delta > 0 ? `+${delta}%` : `${delta}%`} vs initial
          </span>
        )}
      </div>

      <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-[#E8EDEB]">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(6, Math.min(100, pct))}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-sm text-[#5C6C75]">
        <span>
          Support:{" "}
          <strong className="text-[#00684A]">
            +{(scoreObj?.total_support ?? 0).toFixed(2)}
          </strong>
        </span>
        <span>
          Challenge:{" "}
          <strong className="text-[#B1371F]">
            -{(scoreObj?.total_challenge ?? 0).toFixed(2)}
          </strong>
        </span>
        <span>
          Net:{" "}
          <strong className="text-[#112733]">
            {(scoreObj?.net_support ?? 0) >= 0 ? "+" : ""}
            {(scoreObj?.net_support ?? 0).toFixed(2)}
          </strong>
        </span>
      </div>
    </button>
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
          <span className="font-mono text-sm text-[#5C6C75]">
            {arg.agent}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ContestableWorkspace({
  incident = null,
  alert = null,
  dataSource = "leafy",
  onCommitted,
}) {
  // Initialize synchronously on Step 1 so there is no loading spinner on open
  // and the user always starts on Step 1 (Evidence & 3 Candidates).
  const initialBundle = useMemo(
    () => buildInitialClientSession({ incident, alert, dataSource }),
    [alert, dataSource, incident]
  );

  const [activePhase, setActivePhase] = useState(1);
  const [session, setSession] = useState(initialBundle.session);
  const [argumentsList, setArgumentsList] = useState(initialBundle.arguments);
  const [selectedCandidate, setSelectedCandidate] = useState(
    initialBundle.winningCandidate || "bearing_degradation"
  );
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isGeneratingRefinement, setIsGeneratingRefinement] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [inspectedDoc, setInspectedDoc] = useState(null);
  const [lineageDoc, setLineageDoc] = useState(null);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const syncedRef = useRef(false);

  // Engineer Add Argument state
  const [newArgCandidate, setNewArgCandidate] = useState("misalignment");
  const [newArgStance, setNewArgStance] = useState("support");
  const [newArgScore, setNewArgScore] = useState("0.85");
  const [newArgReason, setNewArgReason] = useState(
    ENGINEER_PRESET_SUGGESTIONS[0].reason
  );

  // Phase 4 Editable Incident Report state
  const [draftRootCause, setDraftRootCause] = useState("");
  const [draftRepairSteps, setDraftRepairSteps] = useState("");
  const [draftRationale, setDraftRationale] = useState("");

  // Live client-side score calculation whenever argumentsList changes
  const liveScored = useMemo(() => {
    const candidates = session?.candidates || DEFAULT_CANDIDATES;
    return computeCandidateScores(argumentsList, candidates);
  }, [argumentsList, session?.candidates]);

  const candidates = session?.candidates || DEFAULT_CANDIDATES;
  const scoresBefore = session?.scores_before || liveScored.candidateScores;
  const scoresAfter = liveScored.candidateScores;
  const winningCandidate = liveScored.winningCandidate || "bearing_degradation";

  // Silently sync the initial session to MongoDB in the background without a spinner or changing activePhase
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    startContestableSession({
      incident,
      alert: alert || STANDALONE_PRESET_SCENARIOS[0].alert,
      machineId: incident?.machine_id || alert?.machine_id || "M1",
      dataSource,
      mode: "benchmark",
    })
      .then((res) => {
        if (res?.session) {
          setSession(res.session);
          setArgumentsList(res.arguments || []);
        }
      })
      .catch(() => {
        // Keep local initialBundle if background sync fails
      });
  }, [alert, dataSource, incident]);

  // Explicit user-triggered session reset or live LLM run
  const handleStartSession = useCallback(
    async (runMode = "agent", targetPhase = null) => {
      if (runMode === "benchmark") {
        const fresh = buildInitialClientSession({ incident, alert, dataSource });
        setSession(fresh.session);
        setArgumentsList(fresh.arguments);
        setSelectedCandidate(fresh.winningCandidate || "bearing_degradation");
        setDraftRootCause("");
        setDraftRepairSteps("");
        setDraftRationale("");
        setCommitSuccess(false);
        if (targetPhase) setActivePhase(targetPhase);
        startContestableSession({
          incident,
          alert: alert || STANDALONE_PRESET_SCENARIOS[0].alert,
          machineId: incident?.machine_id || alert?.machine_id || "M1",
          dataSource,
          mode: "benchmark",
        })
          .then((res) => {
            if (res?.session) {
              setSession(res.session);
              setArgumentsList(res.arguments || []);
            }
          })
          .catch(() => {});
        return;
      }

      setIsLoadingSession(true);
      setErrorMsg("");
      setCommitSuccess(false);
      try {
        const res = await startContestableSession({
          incident,
          alert: alert || STANDALONE_PRESET_SCENARIOS[0].alert,
          machineId: incident?.machine_id || alert?.machine_id || "M1",
          dataSource,
          mode: runMode,
        });
        setSession(res.session);
        setArgumentsList(res.arguments || []);
        if (res.winningCandidate) {
          setSelectedCandidate(res.winningCandidate);
        }
        if (targetPhase) {
          setActivePhase(targetPhase);
        }
      } catch (err) {
        setErrorMsg(
          err.message || "Failed to run live LLM debate"
        );
      } finally {
        setIsLoadingSession(false);
      }
    },
    [alert, dataSource, incident]
  );

  // Apply Accept / Reject / Modify / Restore / Add with optimistic UI update
  const handleArgumentAction = useCallback(
    async ({
      actionType,
      argumentId,
      reason,
      score,
      candidate,
      stance,
    }) => {
      if (!session?.session_id) return;
      setIsSavingAction(true);
      setErrorMsg("");

      // Optimistic client update for immediate score recalculation
      setArgumentsList((prev) => {
        if (actionType === "add") {
          const added = {
            argument_id: `${session.session_id}_eng_${Date.now().toString().slice(-4)}`,
            session_id: session.session_id,
            candidate: candidate || newArgCandidate,
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
        setArgumentsList(res.arguments || []);
      } catch {
        // Keep optimistic client state if offline
      } finally {
        setIsSavingAction(false);
      }
    },
    [newArgCandidate, newArgReason, newArgStance, session?.session_id]
  );

  // Move to Phase 4 and populate refined incident report
  const handleProceedToResolution = useCallback(async () => {
    setActivePhase(4);
    const fallback =
      DEFAULT_REFINEMENT_BY_CANDIDATE[winningCandidate] ||
      DEFAULT_REFINEMENT_BY_CANDIDATE.misalignment;

    // Immediately prefill from winning candidate so user doesn't wait
    setDraftRootCause(fallback.root_cause);
    setDraftRepairSteps(formatStepsToText(fallback.repair_instructions));
    setDraftRationale(
      `Selected ${scoresAfter[winningCandidate]?.label || winningCandidate} (score ${(scoresAfter[winningCandidate]?.score ?? 0.5).toFixed(3)}) after combining specialist agent arguments and reliability engineer review.`
    );

    if (!session?.session_id) return;
    setIsGeneratingRefinement(true);
    try {
      const res = await generateContestableRefinement({
        sessionId: session.session_id,
      });
      if (res.refinement) {
        setDraftRootCause(res.refinement.root_cause || fallback.root_cause);
        setDraftRepairSteps(
          formatStepsToText(
            res.refinement.repair_instructions || fallback.repair_instructions
          )
        );
        setDraftRationale(res.refinement.rationale || "");
      }
      if (res.lineage) {
        setLineageDoc(res.lineage);
      }
    } catch {
      // Keep immediate fallback values
    } finally {
      setIsGeneratingRefinement(false);
    }
  }, [scoresAfter, session?.session_id, winningCandidate]);

  // Commit refined incident report to MongoDB incident_reports
  const handleCommitToIncidentReport = useCallback(async () => {
    if (!session?.session_id) return;
    setIsCommitting(true);
    setErrorMsg("");
    try {
      const res = await commitContestableIncident({
        sessionId: session.session_id,
        incidentId: incident?._id || session?.incident_id,
        rootCause: draftRootCause,
        repairInstructions: draftRepairSteps,
        rationale: draftRationale,
        reviewerRole: "Reliability Engineer",
        createIfMissing: true,
      });
      setCommitSuccess(true);
      if (res.lineage) {
        setLineageDoc(res.lineage);
      }
      if (onCommitted) {
        onCommitted(res.incident);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to commit incident report");
    } finally {
      setIsCommitting(false);
    }
  }, [
    draftRationale,
    draftRepairSteps,
    draftRootCause,
    incident?._id,
    onCommitted,
    session?.incident_id,
    session?.session_id,
  ]);

  const interventionCounts = useMemo(() => {
    return {
      accepted: argumentsList.filter((a) => a.human_action === "accept").length,
      rejected: argumentsList.filter((a) => a.human_action === "reject").length,
      modified: argumentsList.filter((a) => a.human_action === "modify").length,
      added: argumentsList.filter((a) => a.human_action === "add").length,
    };
  }, [argumentsList]);

  const phases = [
    { id: 1, label: "1. Evidence & Candidates" },
    { id: 2, label: "2. Specialist Agent Debate" },
    { id: 3, label: "3. Engineer Contestation" },
    { id: 4, label: "4. Refine Incident & Lineage" },
  ];

  const filteredCandidateArgs = useMemo(() => {
    return argumentsList.filter((a) => a.candidate === selectedCandidate);
  }, [argumentsList, selectedCandidate]);

  const supportArgsForSelected = filteredCandidateArgs.filter(
    (a) => (a.stance || a.type) === "support"
  );
  const challengeArgsForSelected = filteredCandidateArgs.filter(
    (a) => (a.stance || a.type) === "challenge"
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      {/* Top Workspace Header */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#D8E3DF] bg-[#F8FAF9] px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#E3FCF7] px-3 py-1 text-sm font-semibold text-[#00684A]">
            <Icon glyph="Person" size={16} />
            Contestable AI
          </span>
          <span className="text-base font-semibold text-[#112733]">
            {incident?.error_name ||
              session?.error_name ||
              "High Vibration & Thermal Alert"}{" "}
            ({incident?.machine_id || session?.machine_id || "M1"})
          </span>
          {session?.session_id && (
            <span className="rounded-md bg-white px-2.5 py-1 font-mono text-sm text-[#5C6C75] border border-[#D8E3DF]">
              session: {session.session_id}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            onPress={() => handleStartSession("benchmark")}
            isDisabled={isLoadingSession}
          >
            Reset Benchmark
          </Button>
          <Button
            variant="primary"
            onPress={() => handleStartSession("agent", 2)}
            isDisabled={isLoadingSession}
          >
            {isLoadingSession ? "Running Debate..." : "Run Live LLM Debate"}
          </Button>
        </div>
      </div>

      {/* Phase Navigation Tabs */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#D8E3DF] bg-white px-5 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {phases.map((p) => {
            const active = activePhase === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  if (p.id === 4 && !draftRootCause) {
                    handleProceedToResolution();
                  } else {
                    setActivePhase(p.id);
                  }
                }}
                className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#00684A] text-white"
                    : "bg-[#F1F5F3] text-[#3D4F58] hover:bg-[#E3FCF7] hover:text-[#00684A]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="mx-5 mt-3 rounded-lg border border-[#B1371F]/30 bg-[#FFEAE5] px-4 py-2.5 text-sm font-medium text-[#B1371F]">
          {errorMsg}
        </div>
      )}

      {/* Persistent Candidate Scoreboard across all phases */}
      <div className="shrink-0 border-b border-[#D8E3DF] bg-[#F8FAF9] px-5 py-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="relative flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-wider text-[#5C6C75]">
              Candidate Root Causes
            </span>
            <button
              type="button"
              onClick={() => setShowFormulaInfo((prev) => !prev)}
              aria-label="How candidate scores are calculated"
              title="How candidate scores are calculated"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[#5C6C75] transition-colors hover:bg-[#E3FCF7] hover:text-[#00684A]"
            >
              <Icon glyph="InfoWithCircle" size={16} />
            </button>
            {showFormulaInfo && (
              <div className="absolute left-0 top-full z-30 mt-1.5 w-[440px] max-w-[90vw] rounded-xl border border-[#D8E3DF] bg-white p-4 text-sm text-[#112733] shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#112733]">
                    Bipolar Argumentation Scoring
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
                <p className="mt-1.5 text-sm text-[#5C6C75]">
                  Each candidate&apos;s score combines active supporting and
                  challenging arguments:
                </p>
                <div className="mt-2.5 flex items-center justify-center rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] px-4 py-3 text-base text-[#112733]">
                  <span className="whitespace-nowrap font-serif tracking-wide">
                    <span className="italic font-semibold text-[#00684A]">
                      S
                    </span>
                    <sub className="italic">c</sub>
                    {" = "}
                    <span className="italic">σ</span>
                    <span className="mx-0.5 text-lg font-normal">(</span>
                    <span className="italic">τ</span>
                    {" + 0.3 "}
                    <span className="text-lg">∑</span>
                    {" "}
                    <span className="italic text-[#00684A]">w</span>
                    <sub>sup</sub>
                    {" − 0.3 "}
                    <span className="text-lg">∑</span>
                    {" "}
                    <span className="italic text-[#B1371F]">w</span>
                    <sub>chal</sub>
                    <span className="mx-0.5 text-lg font-normal">)</span>
                  </span>
                </div>
                <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-[#5C6C75]">
                  <span>
                    <strong className="font-serif italic text-[#112733]">
                      σ(x)
                    </strong>
                    : logistic sigmoid{" "}
                    <span className="font-serif">
                      1 / (1 + e<sup>−x</sup>)
                    </span>
                  </span>
                  <span>
                    <strong className="font-serif italic text-[#112733]">
                      τ = 0
                    </strong>
                    : base prior
                  </span>
                  <span>
                    <strong className="font-serif italic text-[#00684A]">
                      ∑ w<sub>sup</sub>
                    </strong>
                    : total support score
                  </span>
                  <span>
                    <strong className="font-serif italic text-[#B1371F]">
                      ∑ w<sub>chal</sub>
                    </strong>
                    : total challenge score
                  </span>
                </div>
              </div>
            )}
          </div>
          <span className="text-sm text-[#3D4F58]">
            Engineer Edits:{" "}
            <strong className="text-[#00684A]">
              {interventionCounts.accepted} accepted
            </strong>{" "}
            ·{" "}
            <strong className="text-[#B1371F]">
              {interventionCounts.rejected} rejected
            </strong>{" "}
            ·{" "}
            <strong className="text-[#944F01]">
              {interventionCounts.modified} modified
            </strong>{" "}
            ·{" "}
            <strong className="text-[#00684A]">
              {interventionCounts.added} added
            </strong>
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {candidates.map((cand) => (
            <CandidateScoreBar
              key={cand.id}
              candidateId={cand.id}
              scoreObj={scoresAfter[cand.id]}
              scoreBeforeObj={scoresBefore[cand.id]}
              isWinner={winningCandidate === cand.id}
              isSelected={selectedCandidate === cand.id}
              onSelect={setSelectedCandidate}
            />
          ))}
        </div>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {isLoadingSession ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <ProgressCircle size="large" aria-label="Loading Contestable AI" />
            <p className="text-base font-medium text-[#3D4F58]">
              Running independent Vibration Pattern and Maintenance History
              agents...
            </p>
          </div>
        ) : activePhase === 1 ? (
          /* ================= PHASE 1: EVIDENCE & 3 CANDIDATES ================= */
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {candidates.map((cand, idx) => (
                <div
                  key={cand.id}
                  className="flex flex-col justify-between rounded-xl border border-[#D8E3DF] bg-white p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-[#E3FCF7] px-2.5 py-1 text-sm font-semibold text-[#00684A]">
                        Candidate #{idx + 1}
                      </span>
                      <span className="font-mono text-sm text-[#5C6C75]">
                        Vector Match:{" "}
                        {Math.round((cand.similarity_score || 0.86) * 100)}%
                      </span>
                    </div>
                    <h4 className="mt-2.5 text-lg font-semibold text-[#112733]">
                      {cand.label}
                    </h4>
                    <p className="mt-1.5 text-sm leading-6 text-[#5C6C75]">
                      {cand.summary}
                    </p>
                  </div>
                  {cand.historical_case && (
                    <div className="mt-3.5 rounded-lg bg-[#F8FAF9] p-3 text-sm text-[#3D4F58]">
                      <div className="font-semibold text-[#112733]">
                        Precedent: {cand.historical_case.title}
                      </div>
                      <div className="mt-1">
                        {cand.historical_case.observations}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Vibration Spectrum Evidence Card */}
              <div className="rounded-xl border border-[#D8E3DF] bg-white p-4">
                <div className="flex items-center justify-between mb-3">
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
                        subtitle: "Input payload for vibration_pattern_agent",
                        value: session?.evidence_summary?.vibration_spectrum,
                      })
                    }
                    className="rounded-md border border-[#D8E3DF] px-3 py-1.5 text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
                  >
                    {"{}"} View JSON
                  </button>
                </div>
                <div className="space-y-2.5">
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

              {/* Maintenance History Evidence Card */}
              <div className="rounded-xl border border-[#D8E3DF] bg-white p-4">
                <div className="flex items-center justify-between mb-3">
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
                        value: session?.evidence_summary?.maintenance_history,
                      })
                    }
                    className="rounded-md border border-[#D8E3DF] px-3 py-1.5 text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
                  >
                    {"{}"} View JSON
                  </button>
                </div>
                <div className="space-y-2.5">
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
                        <div className="flex items-center justify-between font-semibold text-[#112733]">
                          <span>
                            {log.work_order} · {log.component}
                          </span>
                          <span className="text-[#944F01]">{log.date}</span>
                        </div>
                        <p className="mt-1 text-[#5C6C75]">{log.action}</p>
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
                      <div className="flex items-center justify-between font-semibold text-[#112733]">
                        <span>
                          Sensor {cal.sensor_id} ({cal.sensor_type})
                        </span>
                        <span className="text-[#944F01]">
                          Replaced: {cal.replaced_at}
                        </span>
                      </div>
                      <p className="mt-1 text-[#5C6C75]">
                        {cal.stabilization_window} · {cal.factory_calibration}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="primary" onPress={() => setActivePhase(2)}>
                Next: Inspect Specialist Agent Debate
              </Button>
            </div>
          </div>
        ) : activePhase === 2 ? (
          /* ================= PHASE 2: SPECIALIST AGENT DEBATE ================= */
          <div className="flex flex-col gap-5">
            <div className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-4 text-sm leading-6 text-[#3D4F58]">
              <strong className="text-[#112733]">
                Independent Specialist Argumentation:
              </strong>{" "}
              Neither agent proposes its own separate hypothesis or sees the
              other agent&apos;s output while forming its arguments. Both argue{" "}
              <strong>support</strong> and <strong>challenge</strong> on every
              candidate, and each argument is persisted as an individual record
              in{" "}
              <code className="font-mono text-[#00684A]">argument_records</code>
              .
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {CONTESTABLE_AGENTS.map((agentCfg) => {
                const agentArgs = argumentsList.filter(
                  (a) => a.agent === agentCfg.id
                );
                return (
                  <div
                    key={agentCfg.id}
                    className="flex flex-col rounded-xl border border-[#D8E3DF] bg-white p-4"
                  >
                    <div className="border-b border-[#E8EDEB] pb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-[#112733]">
                          {agentCfg.name}
                        </h4>
                        <span className="rounded-md bg-[#F1F5F3] px-2.5 py-1 font-mono text-sm text-[#3D4F58]">
                          {agentCfg.id}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#5C6C75]">
                        {agentCfg.description}
                      </p>
                    </div>

                    <div className="mt-3 space-y-3">
                      {candidates.map((cand) => {
                        const candAgentArgs = agentArgs.filter(
                          (a) => a.candidate === cand.id
                        );
                        return (
                          <div
                            key={cand.id}
                            className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3.5"
                          >
                            <div className="mb-2.5 text-sm font-bold uppercase tracking-wide text-[#112733]">
                              {cand.label}
                            </div>
                            <div className="space-y-2.5">
                              {candAgentArgs.map((arg) => (
                                <ArgumentCard
                                  key={arg.argument_id}
                                  arg={arg}
                                  interactive={false}
                                  onInspectJson={(record) =>
                                    setInspectedDoc({
                                      title: `MongoDB Record: ${arg.argument_id}`,
                                      subtitle:
                                        "Stored in argument_records collection",
                                      value: record,
                                    })
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="secondary" onPress={() => setActivePhase(1)}>
                Back: Evidence
              </Button>
              <Button variant="primary" onPress={() => setActivePhase(3)}>
                Next: Reliability Engineer Contestation
              </Button>
            </div>
          </div>
        ) : activePhase === 3 ? (
          /* ================= PHASE 3: ENGINEER CONTESTATION ================= */
          <div className="flex flex-col gap-5">
            {/* Candidate Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-[#3D4F58]">
                  Reviewing Candidate:
                </span>
                {candidates.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => setSelectedCandidate(cand.id)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      selectedCandidate === cand.id
                        ? "bg-[#112733] text-white"
                        : "bg-white text-[#3D4F58] border border-[#D8E3DF] hover:bg-[#E8EDEB]"
                    }`}
                  >
                    {cand.label} (
                    {(scoresAfter[cand.id]?.score ?? 0.5).toFixed(3)})
                  </button>
                ))}
              </div>
              <span className="text-sm text-[#5C6C75]">
                Accept, reject, or modify any single argument — rejecting
                recalculates the candidate&apos;s score immediately.
              </span>
            </div>

            {/* Two-column Support vs Challenge for the selected candidate */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-3 rounded-xl border border-[#D8E3DF] bg-[#F8FAF9]/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-base font-semibold text-[#00684A]">
                    <Icon glyph="CheckmarkWithCircle" size={18} />
                    Supporting Arguments ({supportArgsForSelected.length})
                  </span>
                  <span className="font-mono text-sm font-semibold text-[#00684A]">
                    total_support = +
                    {(
                      scoresAfter[selectedCandidate]?.total_support ?? 0
                    ).toFixed(2)}
                  </span>
                </div>
                {supportArgsForSelected.map((arg) => (
                  <ArgumentCard
                    key={arg.argument_id}
                    arg={arg}
                    isSaving={isSavingAction}
                    onAction={handleArgumentAction}
                    onInspectJson={(record) =>
                      setInspectedDoc({
                        title: `MongoDB Record: ${arg.argument_id}`,
                        subtitle: "Stored in argument_records collection",
                        value: record,
                      })
                    }
                  />
                ))}
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-[#D8E3DF] bg-[#F8FAF9]/60 p-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-base font-semibold text-[#B1371F]">
                    <Icon glyph="Warning" size={18} />
                    Challenging Arguments ({challengeArgsForSelected.length})
                  </span>
                  <span className="font-mono text-sm font-semibold text-[#B1371F]">
                    total_challenge = -
                    {(
                      scoresAfter[selectedCandidate]?.total_challenge ?? 0
                    ).toFixed(2)}
                  </span>
                </div>
                {challengeArgsForSelected.map((arg) => (
                  <ArgumentCard
                    key={arg.argument_id}
                    arg={arg}
                    isSaving={isSavingAction}
                    onAction={handleArgumentAction}
                    onInspectJson={(record) =>
                      setInspectedDoc({
                        title: `MongoDB Record: ${arg.argument_id}`,
                        subtitle: "Stored in argument_records collection",
                        value: record,
                      })
                    }
                  />
                ))}
              </div>
            </div>

            {/* Add Reliability Engineer Argument Box */}
            <div className="rounded-xl border border-[#D8E3DF] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="text-base font-semibold text-[#112733]">
                    Add Reliability Engineer Context / Override Argument
                  </h4>
                  <p className="text-sm text-[#5C6C75]">
                    Contribute shop-floor observations not captured in automated
                    telemetry or logs.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ENGINEER_PRESET_SUGGESTIONS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setNewArgCandidate(preset.candidate);
                        setNewArgStance(preset.stance);
                        setNewArgScore(String(preset.score));
                        setNewArgReason(preset.reason);
                        setSelectedCandidate(preset.candidate);
                      }}
                      className="rounded-md border border-[#D8E3DF] bg-[#F8FAF9] px-3 py-1.5 text-sm font-medium text-[#00684A] hover:bg-[#E3FCF7]"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3 mb-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-[#3D4F58]">
                  <span>Target Candidate</span>
                  <select
                    value={newArgCandidate}
                    onChange={(e) => setNewArgCandidate(e.target.value)}
                    className="rounded-lg border border-[#C1C7C6] bg-white px-3 py-2 text-sm text-[#112733]"
                  >
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>

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

              <TextArea
                label="Engineer Argument Reason"
                value={newArgReason}
                onChange={setNewArgReason}
              />

              <div className="mt-3 flex justify-end">
                <Button
                  variant="secondary"
                  isDisabled={!newArgReason.trim() || isSavingAction}
                  onPress={() => {
                    handleArgumentAction({
                      actionType: "add",
                      candidate: newArgCandidate,
                      stance: newArgStance,
                      score: Number(newArgScore),
                      reason: newArgReason,
                    });
                    setSelectedCandidate(newArgCandidate);
                  }}
                >
                  + Add Engineer Argument & Rescore
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="secondary" onPress={() => setActivePhase(2)}>
                Back: Specialist Debate
              </Button>
              <Button variant="primary" onPress={handleProceedToResolution}>
                Next: Refine Incident Report & View Audit Lineage
              </Button>
            </div>
          </div>
        ) : (
          /* ================= PHASE 4: REFINE INCIDENT & LINEAGE ================= */
          <div className="flex flex-col gap-5">
            {/* Before vs After Score Comparison */}
            <div className="rounded-xl border border-[#D8E3DF] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-sm font-semibold uppercase tracking-wider text-[#00684A]">
                    Verified Outcome
                  </span>
                  <h4 className="text-lg font-semibold text-[#112733]">
                    Winning Root Cause:{" "}
                    {scoresAfter[winningCandidate]?.label || winningCandidate}{" "}
                    (Score:{" "}
                    {(scoresAfter[winningCandidate]?.score ?? 0.5).toFixed(3)})
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {isGeneratingRefinement && (
                    <span className="text-sm text-[#5C6C75]">
                      Refining with AI...
                    </span>
                  )}
                  {lineageDoc && (
                    <button
                      type="button"
                      onClick={() =>
                        setInspectedDoc({
                          title: `Single-Query MongoDB Lineage (${session?.session_id})`,
                          subtitle:
                            "contestable_sessions $lookup with argument_records",
                          value: lineageDoc,
                        })
                      }
                      className="rounded-lg border border-[#00684A] bg-[#E3FCF7] px-3.5 py-1.5 text-sm font-semibold text-[#00684A] hover:bg-[#C5F6EC]"
                    >
                      {"{}"} Inspect Full MongoDB $lookup Lineage
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {candidates.map((cand) => {
                  const bScore = scoresBefore[cand.id]?.score ?? 0.5;
                  const aScore = scoresAfter[cand.id]?.score ?? 0.5;
                  const bPct = Math.round(bScore * 100);
                  const aPct = Math.round(aScore * 100);
                  return (
                    <div
                      key={cand.id}
                      className="rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3.5"
                    >
                      <div className="text-base font-semibold text-[#112733]">
                        {cand.label}
                      </div>
                      <div className="mt-2.5 space-y-2 text-sm">
                        <div>
                          <div className="flex justify-between text-[#5C6C75]">
                            <span>Before Contestation</span>
                            <span className="font-mono">
                              {bScore.toFixed(3)} ({bPct}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-[#E8EDEB]">
                            <div
                              className="h-full rounded-full bg-[#889397]"
                              style={{ width: `${bPct}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between font-semibold text-[#112733]">
                            <span>After Contestation</span>
                            <span className="font-mono text-[#00684A]">
                              {aScore.toFixed(3)} ({aPct}%)
                            </span>
                          </div>
                          <div className="mt-1 h-2 w-full rounded-full bg-[#E8EDEB]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${aPct}%`,
                                backgroundColor:
                                  CANDIDATE_COLORS[cand.id] || "#00684A",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Editable Incident Report Refinement Form */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-3.5 rounded-xl border border-[#D8E3DF] bg-white p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-[#112733]">
                    Refined Incident Report
                  </h4>
                  {commitSuccess && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E3FCF7] px-3 py-1 text-sm font-semibold text-[#00684A]">
                      <Icon glyph="CheckmarkWithCircle" size={16} />
                      Saved to incident_reports
                    </span>
                  )}
                </div>

                <TextArea
                  label="Refined Root Cause"
                  value={draftRootCause}
                  onChange={setDraftRootCause}
                />

                <TextArea
                  label="Refined Repair Instructions (1 step per line)"
                  value={draftRepairSteps}
                  onChange={setDraftRepairSteps}
                />

                <TextField
                  label="Contestation Rationale / Audit Summary"
                  value={draftRationale}
                  onChange={setDraftRationale}
                />

                <div className="mt-2 flex items-center justify-end gap-2">
                  <Button
                    variant="primary"
                    onPress={handleCommitToIncidentReport}
                    isDisabled={isCommitting || !draftRootCause.trim()}
                  >
                    {isCommitting
                      ? "Saving to MongoDB..."
                      : "Save Verified Incident Report to MongoDB"}
                  </Button>
                </div>
              </div>

              {/* MongoDB Single-Query Audit Lineage & Argument Records Preview */}
              <div className="flex flex-col gap-3 rounded-xl border border-[#D8E3DF] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-[#112733]">
                      MongoDB Governance & Argument Records
                    </h4>
                    <p className="text-sm text-[#5C6C75]">
                      Each argument is stored as its own document in{" "}
                      <code className="font-mono text-[#00684A]">
                        argument_records
                      </code>{" "}
                      and joined via{" "}
                      <code className="font-mono text-[#00684A]">$lookup</code>.
                    </p>
                  </div>
                </div>

                <div className="max-h-[320px] overflow-hidden">
                  <CodeBlock
                    language="json"
                    className="code-block-white h-full"
                  >
                    <CodeSnippet>
                      {JSON.stringify(
                        argumentsList.slice(0, 4).map((a) => ({
                          session_id: a.session_id,
                          candidate: a.candidate,
                          agent: a.agent,
                          stance: a.stance,
                          score: a.score,
                          reason: a.reason,
                          created_at: a.created_at,
                          ...(a.human_action
                            ? {
                                status: a.status,
                                human_action: a.human_action,
                              }
                            : {}),
                        })),
                        null,
                        2
                      )}
                    </CodeSnippet>
                    <CopyButton
                      copyText={JSON.stringify(argumentsList, null, 2)}
                    >
                      <Button aria-label="Copy argument records JSON">
                        <Icon glyph="Copy" />
                      </Button>
                    </CopyButton>
                  </CodeBlock>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="secondary" onPress={() => setActivePhase(3)}>
                Back: Engineer Contestation
              </Button>
            </div>
          </div>
        )}
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
