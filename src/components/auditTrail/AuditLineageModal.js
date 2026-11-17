"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "@via-ds/icons";
import {
  Button,
  CodeBlock,
  CodeSnippet,
  CopyButton,
  H3,
} from "@via-ds/components";
import {
  CHANGE_RECORDS_VALIDATOR,
  GMP_ALIGNMENT_PILLARS,
} from "@/lib/auditTrail/constants";

const EXPECTED_REVISION_STAGES = [
  {
    v: 1,
    stepLabel: "Step 1 · Capture & context",
    stageTitle: "Captured & Context Reconstructed",
  },
  {
    v: 2,
    stepLabel: "Step 2 · Policy & SOPs",
    stageTitle: "Policy Checked & SOPs Retrieved",
  },
  {
    v: 3,
    stepLabel: "Step 3 · Review & sign",
    stageTitle: "Change Record Drafted & Routed",
  },
  {
    v: 4,
    stepLabel: "Step 4 · Outcome & audit trail",
    stageTitle: "Outcome Verified (or E-Signature + Outcome)",
  },
];

function ScrollableSnippet({ text, copyLabel }) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden [&>*]:flex [&>*]:h-full [&>*]:flex-col [&>*]:overflow-hidden [&_pre]:!h-full [&_pre]:!max-h-none [&_pre]:flex-1 [&_pre]:overflow-auto">
      <CodeBlock language="json" className="code-block-white">
        <CodeSnippet>{text}</CodeSnippet>
        <CopyButton copyText={text}>
          <Button aria-label={copyLabel}>
            <Icon glyph="Copy" />
          </Button>
        </CopyButton>
      </CodeBlock>
    </div>
  );
}

function formatAuditValue(val) {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) return val.join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

export default function AuditLineageModal({
  open,
  initialTab = "validator",
  lineageBundle,
  onClose,
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    if (open && initialTab) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  const lineage = lineageBundle?.lineage || null;
  const revisions = useMemo(
    () => (Array.isArray(lineage?.revisions) ? lineage.revisions : []),
    [lineage?.revisions]
  );

  useEffect(() => {
    if (revisions.length > 0) {
      setSelectedVersion(revisions[revisions.length - 1].v);
    } else {
      setSelectedVersion(null);
    }
  }, [lineage?.intervention_id, revisions]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const activeRevision =
    revisions.find((rev) => rev.v === selectedVersion) ||
    revisions[revisions.length - 1] ||
    null;

  const pendingStages = EXPECTED_REVISION_STAGES.filter(
    (expected) => !revisions.some((rev) => rev.v === expected.v)
  );

  const missingLineageSections = [];
  if (!lineage?.policy_evaluation) {
    missingLineageSections.push("Step 2 · Policy & SOPs");
  }
  if (!lineage?.draft_record) {
    missingLineageSections.push("Step 3 · Review & sign");
  }
  if (!lineage?.outcome) {
    missingLineageSections.push("Step 4 · Outcome & audit trail");
  }

  const isLineageComplete = Boolean(lineage?.outcome);

  const schemaValidatorJson = JSON.stringify(
    {
      collection: "change_records",
      validationLevel: "strict",
      validationAction: "error",
      validator: lineageBundle?.validator || CHANGE_RECORDS_VALIDATOR,
    },
    null,
    2
  );

  const revisionJson = JSON.stringify(activeRevision || {}, null, 2);

  const fullLineageJson = JSON.stringify(
    {
      aggregation_pipeline: lineageBundle?.pipeline || [],
      joined_document: lineage || null,
    },
    null,
    2
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-lineage-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061E2E]/80 p-4 sm:p-6"
    >
      <div className="flex h-[88vh] min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#D8E3DF] bg-[#F8FAF9] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <H3
                id="audit-lineage-modal-title"
                className="truncate text-[#112733]"
              >
                MongoDB Audit Lineage & Governance
              </H3>
              {lineage?.intervention_id && (
                <span className="rounded-full bg-[#E3FCF7] px-2.5 py-0.5 font-mono text-sm font-semibold text-[#00684A]">
                  {lineage.intervention_id} · v{lineage.v}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#5C6C75]">
              <code>$jsonSchema</code> attribution enforcement, hash-chained{" "}
              <code>change_record_revisions</code> snapshots, single-query{" "}
              <code>$lookup</code> lineage, and GMP / ALCOA+ alignment.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close lineage inspector"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C1C7C6] bg-white text-[#112733] hover:bg-[#F1F5F3]"
          >
            <Icon glyph="X" size={18} />
          </button>
        </header>

        {/* Logical Story Order Tabs */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E8EDEB] px-5 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {[
              {
                id: "validator",
                label: "1 · $jsonSchema Guard",
                icon: "CheckmarkWithCircle",
              },
              {
                id: "revisions",
                label: `2 · Revision Snapshots (${revisions.length})`,
                icon: "Clock",
              },
              {
                id: "lookup",
                label: "3 · Single-Query $lookup Lineage",
                icon: "Database",
              },
              {
                id: "gmp",
                label: "4 · GMP & ALCOA+ Alignment",
                icon: "Checkmark",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "border-[#00684A] bg-[#E3FCF7] text-[#00684A]"
                    : "border-[#D8E3DF] bg-white text-[#3D4F58] hover:bg-[#F8FAF9]"
                }`}
              >
                <Icon glyph={tab.icon} size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Non-scrolling modal body; snippets handle their own vertical scroll */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
          {activeTab === "validator" && (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="shrink-0 rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-3.5 text-sm text-[#3D4F58]">
                MongoDB enforces <code>validationLevel: &quot;strict&quot;</code>{" "}
                on <code>change_records</code> so every document must carry
                valid agent credentials and required shopfloor fields.
              </div>

              <ScrollableSnippet
                text={schemaValidatorJson}
                copyLabel="Copy validator JSON"
              />
            </div>
          )}

          {activeTab === "revisions" && (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {revisions.length === 0 ? (
                <div className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-6 text-center text-sm text-[#5C6C75]">
                  Complete <strong>Step 1 · Capture &amp; context</strong> to
                  record the initial immutable snapshot in{" "}
                  <code>change_record_revisions</code>.
                </div>
              ) : (
                <>
                  <div className="grid shrink-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                    {revisions.map((rev) => {
                      const active = rev.v === activeRevision?.v;
                      return (
                        <button
                          key={rev.v}
                          type="button"
                          onClick={() => setSelectedVersion(rev.v)}
                          className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                            active
                              ? "border-[#00684A] bg-[#E3FCF7]/60 shadow-sm"
                              : "border-[#D8E3DF] bg-[#F8FAF9] hover:bg-white"
                          }`}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="rounded-md bg-[#00684A] px-2 py-0.5 font-mono text-sm font-bold text-white">
                              v{rev.v}
                            </span>
                            <span className="font-mono text-sm text-[#5C6C75]">
                              {String(rev.snapshot_sha256 || "").slice(0, 10)}…
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-1 text-sm font-semibold text-[#112733]">
                            {rev.stage}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm text-[#5C6C75]">
                            {rev.change_note}
                          </p>
                        </button>
                      );
                    })}

                    {pendingStages.map((pending) => (
                      <div
                        key={`pending-${pending.v}`}
                        className="flex flex-col items-start rounded-xl border border-dashed border-[#D8E3DF] bg-[#F8FAF9]/60 p-3 text-left opacity-80"
                      >
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="rounded-md bg-[#E8EDEB] px-2 py-0.5 font-mono text-sm font-bold text-[#5C6C75]">
                            v{pending.v}
                          </span>
                          <span className="text-sm font-medium text-[#889397]">
                            Pending
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-[#5C6C75]">
                          {pending.stageTitle}
                        </p>
                        <p className="mt-1 text-sm text-[#889397]">
                          Complete {pending.stepLabel} to populate.
                        </p>
                      </div>
                    ))}
                  </div>

                  {activeRevision && (
                    <>
                      <div className="shrink-0 rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] px-3.5 py-2.5 text-sm text-[#3D4F58]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-semibold text-[#112733]">
                            EU GMP Annex 11 (Sec. 9) · Field-Level Change Summary
                            (v{activeRevision.v})
                          </span>
                          <span className="font-mono text-[#00684A]">
                            Chain:{" "}
                            {activeRevision.prev_snapshot_sha256
                              ? `${activeRevision.prev_snapshot_sha256.slice(0, 10)}…`
                              : "GENESIS"}{" "}
                            →{" "}
                            {String(
                              activeRevision.snapshot_sha256 || ""
                            ).slice(0, 10)}
                            …
                          </span>
                        </div>
                        {Array.isArray(activeRevision.field_changes) &&
                          activeRevision.field_changes.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {activeRevision.field_changes.map((chg, idx) => (
                                <span
                                  key={`${chg.field}-${idx}`}
                                  className="inline-flex items-center gap-1 rounded-md border border-[#D8E3DF] bg-white px-2 py-0.5 font-mono text-sm text-[#112733]"
                                >
                                  <span className="text-[#5C6C75]">
                                    {chg.field}:
                                  </span>
                                  <span>{formatAuditValue(chg.before)}</span>
                                  <span className="text-[#00684A]">→</span>
                                  <strong className="text-[#00684A]">
                                    {formatAuditValue(chg.after)}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          )}
                      </div>

                      <ScrollableSnippet
                        text={revisionJson}
                        copyLabel="Copy revision JSON"
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "lookup" && (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {!lineage ? (
                <div className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-6 text-center text-sm text-[#5C6C75]">
                  Start an intervention in <strong>Step 1 · Capture &amp; context</strong> to inspect live single-query <code>$lookup</code> lineage across <code>change_records</code> and <code>change_record_revisions</code>.
                </div>
              ) : (
                <>
                  <div className="shrink-0 rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-3.5 text-sm text-[#3D4F58]">
                    Single-query MongoDB aggregation joining the active{" "}
                    <code>change_records</code> document with all append-only{" "}
                    <code>change_record_revisions</code> snapshots via{" "}
                    <code>$lookup</code>
                    {!isLineageComplete &&
                      missingLineageSections.length > 0 && (
                        <span className="ml-1 text-[#944F01]">
                          (Live at v{lineage.v} — remaining:{" "}
                          {missingLineageSections.join(" → ")})
                        </span>
                      )}
                    .
                  </div>

                  <ScrollableSnippet
                    text={fullLineageJson}
                    copyLabel="Copy lineage JSON"
                  />
                </>
              )}
            </div>
          )}

          {activeTab === "gmp" && (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
              <div className="shrink-0 rounded-xl border border-[#B8E4D2] bg-[#E3FCF7]/65 p-4 text-sm leading-6 text-[#112733]">
                <div className="font-bold text-[#00684A]">
                  GxP / GMP Controls Applied to High-Spec Shopfloor AI
                </div>
                <p className="mt-1 text-[#3D4F58]">
                  Whether manufacturing pharmaceuticals/medical devices (
                  <strong>FDA 21 CFR Part 11</strong>,{" "}
                  <strong>EU GMP Annex 11</strong>) or safety-critical EV battery
                  cells (<strong>IATF 16949</strong>,{" "}
                  <strong>EU Battery Passport</strong>), autonomous process
                  changes require <strong>ALCOA+</strong> data integrity. MongoDB
                  Atlas enforces these controls in one operational data layer
                  rather than stitching together historian, QMS, and vector silos.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {GMP_ALIGNMENT_PILLARS.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between rounded-xl border border-[#D8E3DF] bg-white p-4 shadow-2xs"
                  >
                    <div>
                      <span className="inline-block rounded-full border border-[#00684A]/25 bg-[#E3FCF7] px-2.5 py-0.5 font-mono text-sm font-semibold text-[#00684A]">
                        {item.standard}
                      </span>
                      <h4 className="mt-2 text-base font-bold text-[#112733]">
                        {item.principle}
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-[#3D4F58]">
                        {item.gmpRequirement}
                      </p>
                    </div>

                    <div className="mt-3 rounded-lg border border-[#E8EDEB] bg-[#F8FAF9] p-3">
                      <div className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-[#00684A]">
                        <Icon glyph="Database" size={13} />
                        <span>How MongoDB Helps · {item.mongoCapability}</span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#3D4F58]">
                        {item.mongoDetail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
