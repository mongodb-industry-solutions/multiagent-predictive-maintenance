"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, TextArea } from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import EditableField, {
  EditSlot,
  FormEditButton,
} from "@/components/forms/EditableField";
import { updateIncidentReport } from "@/lib/api/incidentReports";
import {
  computeCandidateScores,
  DEFAULT_CANDIDATES,
  isArgumentActive,
} from "@/lib/contestable/scoring";
import {
  buildInitialClientSession,
  DEFAULT_REFINEMENT_BY_CANDIDATE,
} from "@/lib/contestable/scenarios";
import {
  commitContestableIncident,
  startContestableSession,
  submitContestableAction,
} from "@/lib/api/contestable";
import { useIncidentResponseForm } from "./hooks";

const AGENT_LABELS = {
  vibration_pattern_agent: "Vibration Pattern Agent",
  maintenance_history_agent: "Maintenance History Agent",
  reliability_engineer: "Reliability Engineer",
};

function formatSteps(steps) {
  if (!Array.isArray(steps)) return String(steps || "");
  return steps
    .map((step, idx) => `- Step ${step.step || idx + 1}: ${step.description}`)
    .join("\n");
}

export default function IncidentResponseForm({
  incidentId,
  item,
  rootCause,
  repairInstructions,
  editSlotId,
  onIncidentSaved,
  className = "",
}) {
  useIncidentResponseForm();
  const [saved, setSaved] = useState({
    rootCause: rootCause || "",
    repairInstructions: repairInstructions || "",
  });
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Inline Contestable AI state
  const initialBundle = useMemo(
    () => buildInitialClientSession({ incident: item }),
    [item]
  );
  const [sessionId, setSessionId] = useState(initialBundle.session.session_id);
  const [argumentsList, setArgumentsList] = useState(initialBundle.arguments);
  const [selectedCandidate, setSelectedCandidate] = useState(
    initialBundle.winningCandidate || "bearing_degradation"
  );
  const [editingArgId, setEditingArgId] = useState(null);
  const [editArgReason, setEditArgReason] = useState("");
  const [editArgScore, setEditArgScore] = useState("0.5");
  const [showAddArg, setShowAddArg] = useState(false);
  const [newArgStance, setNewArgStance] = useState("support");
  const [newArgScore, setNewArgScore] = useState("0.85");
  const [newArgReason, setNewArgReason] = useState("");
  const [applying, setApplying] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const sessionSyncedRef = useRef(false);

  useEffect(() => {
    const next = {
      rootCause: rootCause || "",
      repairInstructions: repairInstructions || "",
    };
    setSaved(next);
    setDraft(next);
    setEditing(false);
  }, [rootCause, repairInstructions]);

  // Sync contestable session to MongoDB once when Advanced Analysis is opened
  useEffect(() => {
    if (!advancedOpen || sessionSyncedRef.current) return;
    sessionSyncedRef.current = true;
    startContestableSession({
      incident: item,
      machineId: item?.machine_id || "M1",
      mode: "benchmark",
    })
      .then((res) => {
        if (res?.session?.session_id) {
          setSessionId(res.session.session_id);
          if (Array.isArray(res.arguments) && res.arguments.length > 0) {
            setArgumentsList(res.arguments);
          }
        }
      })
      .catch(() => {});
  }, [advancedOpen, item]);

  const scored = useMemo(
    () => computeCandidateScores(argumentsList, DEFAULT_CANDIDATES),
    [argumentsList]
  );

  const winningCandidate = scored.winningCandidate || "bearing_degradation";
  const winningInfo = scored.candidateScores[winningCandidate];

  const candidateArgs = useMemo(
    () => argumentsList.filter((a) => a.candidate === selectedCandidate),
    [argumentsList, selectedCandidate]
  );

  const handleArgumentAction = (actionType, arg, extra = {}) => {
    setArgumentsList((prev) => {
      if (actionType === "add") {
        return [
          ...prev,
          {
            argument_id: `${sessionId}_eng_${Date.now().toString().slice(-4)}`,
            session_id: sessionId,
            candidate: selectedCandidate,
            agent: "reliability_engineer",
            stance: extra.stance || "support",
            score: Number(extra.score ?? 0.85),
            reason: extra.reason || "",
            created_at: new Date().toISOString(),
            status: "active",
            human_action: "add",
          },
        ];
      }
      return prev.map((itemArg) => {
        if (itemArg.argument_id !== arg.argument_id) return itemArg;
        if (actionType === "reject") {
          return { ...itemArg, status: "rejected", human_action: "reject" };
        }
        if (actionType === "accept") {
          return { ...itemArg, status: "active", human_action: "accept" };
        }
        if (actionType === "restore") {
          return {
            ...itemArg,
            status: "active",
            human_action: null,
            reason: itemArg.original_reason || itemArg.reason,
            score: itemArg.original_score ?? itemArg.score,
          };
        }
        if (actionType === "modify") {
          return {
            ...itemArg,
            status: "active",
            human_action: "modify",
            original_reason: itemArg.original_reason || itemArg.reason,
            original_score: itemArg.original_score ?? itemArg.score,
            reason: extra.reason ?? itemArg.reason,
            score:
              extra.score !== undefined ? Number(extra.score) : itemArg.score,
          };
        }
        return itemArg;
      });
    });

    submitContestableAction({
      sessionId,
      actionType,
      argumentId: arg?.argument_id,
      candidate: selectedCandidate,
      stance: extra.stance,
      reason: extra.reason,
      score: extra.score,
    }).catch(() => {});
  };

  const handleApplyContestedDiagnosis = async () => {
    setApplying(true);
    const refinement =
      DEFAULT_REFINEMENT_BY_CANDIDATE[winningCandidate] ||
      DEFAULT_REFINEMENT_BY_CANDIDATE.misalignment;

    const nextRootCause = refinement.root_cause;
    const nextInstructionsText = formatSteps(refinement.repair_instructions);

    const nextSaved = {
      rootCause: nextRootCause,
      repairInstructions: nextInstructionsText,
    };
    setSaved(nextSaved);
    setDraft(nextSaved);
    setAdvancedOpen(false);

    try {
      await commitContestableIncident({
        sessionId,
        incidentId: incidentId || item?._id,
        rootCause: nextRootCause,
        repairInstructions: refinement.repair_instructions,
        rationale: `Refined via Contestable AI (${winningInfo?.label || winningCandidate}, score ${(winningInfo?.score ?? 0.5).toFixed(3)})`,
      });
    } catch {
      if (incidentId) {
        await updateIncidentReport(incidentId, nextSaved).catch(() => null);
      }
    } finally {
      setApplying(false);
      if (onIncidentSaved) {
        onIncidentSaved();
      }
    }
  };

  const handleSave = async () => {
    setSaved(draft);
    setEditing(false);
    if (incidentId) {
      await updateIncidentReport(incidentId, {
        rootCause: draft.rootCause,
        repairInstructions: draft.repairInstructions,
      }).catch(() => null);
      if (onIncidentSaved) {
        onIncidentSaved();
      }
    }
  };

  const values = editing ? draft : saved;

  return (
    <div
      className={`incident-form form-fields flex w-full flex-col gap-3 ${className}`}
    >
      <EditSlot slotId={editSlotId}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAdvancedOpen((prev) => !prev);
              setEditing(false);
            }}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1 text-sm font-semibold transition-colors ${
              advancedOpen
                ? "border-[#112733] bg-[#112733] text-white"
                : "border-[#00684A] bg-[#E3FCF7] text-[#00684A] hover:bg-[#C5F6EC]"
            }`}
          >
            <Icon glyph="Person" size={14} />
            {advancedOpen ? "Back to report" : "Advanced analysis"}
          </button>
          {!advancedOpen && (
            <FormEditButton
              editing={editing}
              onEdit={() => {
                setDraft(saved);
                setEditing(true);
              }}
              onSave={handleSave}
            />
          )}
        </div>
      </EditSlot>

      {advancedOpen ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-3.5">
          {/* Candidate Selector & Live Scores */}
          <div>
            <div className="relative mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-[#112733]">
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
                <div className="absolute right-0 top-full z-30 mt-1.5 w-[420px] max-w-[90vw] rounded-xl border border-[#D8E3DF] bg-white p-4 text-sm text-[#112733] shadow-lg">
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
                      : sigmoid{" "}
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
                      : support sum
                    </span>
                    <span>
                      <strong className="font-serif italic text-[#B1371F]">
                        ∑ w<sub>chal</sub>
                      </strong>
                      : challenge sum
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {DEFAULT_CANDIDATES.map((cand) => {
                const cScore = scored.candidateScores[cand.id];
                const isSelected = selectedCandidate === cand.id;
                const isWinner = winningCandidate === cand.id;
                return (
                  <button
                    key={cand.id}
                    type="button"
                    onClick={() => setSelectedCandidate(cand.id)}
                    className={`flex flex-col rounded-lg border p-3 text-left transition-all ${
                      isSelected
                        ? "border-[#00684A] bg-white shadow-sm"
                        : "border-[#D8E3DF] bg-white/70 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-[#112733]">
                        {cand.shortLabel}
                      </span>
                      {isWinner && (
                        <span className="rounded-full bg-[#E3FCF7] px-2 py-0.5 text-sm font-semibold text-[#00684A]">
                          Leading
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      <span className="text-lg font-bold text-[#112733]">
                        {(cScore?.score ?? 0.5).toFixed(3)}
                      </span>
                      <span className="text-sm text-[#5C6C75]">
                        ({Math.round((cScore?.score ?? 0.5) * 100)}%)
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Arguments List for the Selected Candidate */}
          <div className="flex flex-col gap-2.5">
            {candidateArgs.map((arg) => {
              const active = isArgumentActive(arg);
              const isSupport = (arg.stance || arg.type) === "support";
              const isEditingThis = editingArgId === arg.argument_id;

              return (
                <div
                  key={arg.argument_id}
                  className={`rounded-lg border p-3 ${
                    !active
                      ? "border-dashed border-[#C1C7C6] bg-white/50 opacity-60"
                      : "border-[#D8E3DF] bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[#112733]">
                        {AGENT_LABELS[arg.agent] || arg.agent}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-sm font-semibold ${
                          isSupport
                            ? "bg-[#E3FCF7] text-[#00684A]"
                            : "bg-[#FFEAE5] text-[#B1371F]"
                        }`}
                      >
                        {isSupport
                          ? `Support (+${Number(arg.score).toFixed(2)})`
                          : `Challenge (-${Number(arg.score).toFixed(2)})`}
                      </span>
                    </div>

                    {!isEditingThis && (
                      <div className="flex items-center gap-1.5">
                        {active ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleArgumentAction("accept", arg)}
                              className={`rounded border px-2.5 py-1 text-sm font-medium ${
                                arg.human_action === "accept"
                                  ? "border-[#00684A] bg-[#E3FCF7] text-[#00684A]"
                                  : "border-[#D8E3DF] text-[#00684A] hover:bg-[#E3FCF7]"
                              }`}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => handleArgumentAction("reject", arg)}
                              className="rounded border border-[#D8E3DF] px-2.5 py-1 text-sm font-medium text-[#B1371F] hover:bg-[#FFEAE5]"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingArgId(arg.argument_id);
                                setEditArgReason(arg.reason);
                                setEditArgScore(String(arg.score));
                              }}
                              className="rounded border border-[#D8E3DF] px-2.5 py-1 text-sm font-medium text-[#3D4F58] hover:bg-[#F1F5F3]"
                            >
                              Modify
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArgumentAction("restore", arg)}
                            className="rounded border border-[#C1C7C6] bg-white px-2.5 py-1 text-sm font-medium text-[#112733] hover:bg-[#F1F5F3]"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditingThis ? (
                    <div className="mt-2.5 flex flex-col gap-2.5 border-t border-[#E8EDEB] pt-2.5">
                      <TextArea
                        label="Reason"
                        value={editArgReason}
                        onChange={setEditArgReason}
                      />
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-sm text-[#3D4F58]">
                          <span>Score (0–1):</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            max="1"
                            value={editArgScore}
                            onChange={(e) => setEditArgScore(e.target.value)}
                            className="w-20 rounded border border-[#C1C7C6] px-2 py-1 text-sm text-[#112733]"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingArgId(null)}
                            className="rounded border border-[#C1C7C6] px-2.5 py-1 text-sm text-[#3D4F58]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleArgumentAction("modify", arg, {
                                reason: editArgReason,
                                score: Number(editArgScore),
                              });
                              setEditingArgId(null);
                            }}
                            className="rounded bg-[#00684A] px-3 py-1 text-sm font-semibold text-white"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`mt-2 text-sm leading-5 text-[#112733] ${
                        !active ? "line-through" : ""
                      }`}
                    >
                      {arg.reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Optional Add Engineer Argument */}
          {showAddArg ? (
            <div className="flex flex-col gap-2.5 rounded-lg border border-[#D8E3DF] bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#112733]">
                  New Engineer Argument ({selectedCandidate.replace(/_/g, " ")})
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={newArgStance}
                    onChange={(e) => setNewArgStance(e.target.value)}
                    className="rounded border border-[#C1C7C6] px-2.5 py-1 text-sm text-[#112733]"
                  >
                    <option value="support">Support (+)</option>
                    <option value="challenge">Challenge (-)</option>
                  </select>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={newArgScore}
                    onChange={(e) => setNewArgScore(e.target.value)}
                    className="w-20 rounded border border-[#C1C7C6] px-2 py-1 text-sm text-[#112733]"
                  />
                </div>
              </div>
              <TextArea
                label="Observation"
                value={newArgReason}
                onChange={setNewArgReason}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddArg(false)}
                  className="rounded border border-[#C1C7C6] px-3 py-1 text-sm text-[#3D4F58]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newArgReason.trim()) return;
                    handleArgumentAction("add", null, {
                      stance: newArgStance,
                      score: Number(newArgScore),
                      reason: newArgReason.trim(),
                    });
                    setNewArgReason("");
                    setShowAddArg(false);
                  }}
                  className="rounded bg-[#00684A] px-3 py-1 text-sm font-semibold text-white"
                >
                  Add & Rescore
                </button>
              </div>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setShowAddArg(true)}
                className="text-sm font-semibold text-[#00684A] hover:underline"
              >
                + Add engineer argument for this candidate
              </button>
            </div>
          )}

          {/* Bottom Bar: Apply Contested Root Cause to Incident Report */}
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-[#D8E3DF] pt-3">
            <div className="text-sm text-[#3D4F58]">
              Winning root cause:{" "}
              <strong className="text-[#112733]">
                {winningInfo?.label || winningCandidate}
              </strong>
            </div>
            <Button
              variant="primary"
              onPress={handleApplyContestedDiagnosis}
              isDisabled={applying}
            >
              {applying
                ? "Updating Report..."
                : "Update Incident Report with Contested Root Cause"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {item?.contestation && (
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#00A35C]/30 bg-[#E3FCF7]/60 px-3 py-2 text-sm text-[#00684A]">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Icon glyph="CheckmarkWithCircle" size={16} />
                Contested & Verified (
                {item.contestation.winning_label ||
                  item.contestation.winning_candidate}
                )
              </span>
              <span className="font-mono text-sm text-[#3D4F58]">
                score: {Number(item.contestation.score ?? 0.5).toFixed(3)}
              </span>
            </div>
          )}
          <EditableField
            label="Root cause"
            value={values.rootCause}
            onChange={(value) =>
              setDraft((current) => ({ ...current, rootCause: value }))
            }
            editing={editing}
            multiline
          />
          <EditableField
            label="Repair instructions"
            value={values.repairInstructions}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                repairInstructions: value,
              }))
            }
            editing={editing}
            multiline
          />
        </>
      )}
    </div>
  );
}
