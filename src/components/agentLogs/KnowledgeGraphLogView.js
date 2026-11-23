import React, { useMemo, useState } from "react";
import { Body, Button, CodeBlock, CodeSnippet, CopyButton } from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import { layerStyle } from "@/components/knowledgeGraph/graphModel";

function NodePill({ layer, code, label, meta }) {
  const style = layerStyle(layer);
  return (
    <div
      className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm shadow-[0_1px_2px_rgba(17,39,51,0.06)]"
      style={{
        backgroundColor: style.tint,
        borderColor: style.border,
        color: "#112733",
      }}
    >
      {code && (
        <span
          className="font-mono font-semibold"
          style={{ color: style.color }}
        >
          {code}
        </span>
      )}
      {label && <span className="font-medium">{label}</span>}
      {meta && <span className="text-[#5C6C75]">· {meta}</span>}
    </div>
  );
}

function EdgeTag({ label }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm font-medium text-[#5C6C75]">
      <span aria-hidden="true">→</span>
      <span>{label}</span>
    </span>
  );
}

function LayerLegend({ layers }) {
  const names = {
    uns_hierarchy: "UNS / Asset",
    diagnostics: "Diagnostics",
    maintenance: "Maintenance",
    production_governance: "Governance",
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-[#E8EDEB] pt-2.5">
      {layers.map((layerId) => {
        const style = layerStyle(layerId);
        return (
          <span
            key={layerId}
            className="inline-flex items-center gap-1.5 text-sm text-[#5C6C75]"
          >
            <span
              className="h-2.5 w-2.5 rounded-full border"
              style={{
                backgroundColor: style.tint,
                borderColor: style.color,
              }}
            />
            {names[layerId] || layerId}
          </span>
        );
      })}
    </div>
  );
}

function AssetHeader({ asset }) {
  if (!asset) return null;
  const isa95 = Array.isArray(asset.isa95_path) ? asset.isa95_path : [];
  return (
    <div className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <NodePill
          layer="uns_hierarchy"
          code={asset.shopfloor_id || asset.requested_machine_id}
          label={asset.label || "Asset"}
          meta={asset.legacy_id ? `legacy ${asset.legacy_id}` : null}
        />
        {asset.station && (
          <>
            <EdgeTag label="PART_OF" />
            <NodePill
              layer="uns_hierarchy"
              label={
                typeof asset.station === "string"
                  ? asset.station
                  : asset.station.label
              }
            />
          </>
        )}
      </div>
      {isa95.length > 0 && (
        <p className="mt-2 text-sm text-[#5C6C75]">
          {isa95.join(" → ")}
        </p>
      )}
    </div>
  );
}

function GoverningSopsRow({ sops }) {
  if (!Array.isArray(sops) || sops.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <EdgeTag label="GOVERNED_BY" />
      <div className="flex flex-wrap gap-2 pl-3">
        {sops.map((sop) => (
          <NodePill
            key={sop.code}
            layer="production_governance"
            code={sop.code}
            label={sop.approved_version ? `v${sop.approved_version}` : sop.label}
          />
        ))}
      </div>
    </div>
  );
}

function FailureGraphDiagram({ doc }) {
  const failures = doc.candidate_failures || [];
  const correlated = doc.correlated_shopfloor_alarms || [];
  const liveAlerts = doc.recent_correlated_edge_alerts || [];

  return (
    <div className="space-y-3">
      <AssetHeader asset={doc.resolved_asset} />

      {/* Root alarm node */}
      {doc.alarm && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <NodePill
              layer="diagnostics"
              code={doc.alarm.code}
              label={doc.alarm.label?.replace(new RegExp(`^${doc.alarm.code}\\s*`), "")}
              meta={
                doc.alarm.threshold != null
                  ? `> ${doc.alarm.threshold} ${doc.alarm.unit || ""}`.trim()
                  : null
              }
            />
          </div>

          {/* Forward branches: INDICATES -> failures -> AFFECTS / DOCUMENTED_IN */}
          {failures.length > 0 && (
            <div className="ml-3 space-y-2.5 border-l-2 border-[#EBCB9B] pl-3">
              <EdgeTag label="INDICATES" />
              {failures.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-[#E8EDEB] bg-white p-2.5 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <NodePill
                      layer="diagnostics"
                      label={f.label}
                      meta={
                        f.check_first
                          ? "check first"
                          : f.likelihood
                            ? `${f.likelihood} likelihood`
                            : null
                      }
                    />
                  </div>
                  {(f.affected_components?.length > 0 ||
                    f.manual_sections?.length > 0) && (
                    <div className="ml-2 space-y-1.5 border-l-2 border-[#D8E3DF] pl-3">
                      {f.affected_components?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <EdgeTag label="AFFECTS" />
                          {f.affected_components.map((comp) => (
                            <NodePill
                              key={comp.id}
                              layer="uns_hierarchy"
                              label={comp.label}
                            />
                          ))}
                        </div>
                      )}
                      {f.manual_sections?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <EdgeTag label="DOCUMENTED_IN" />
                          {f.manual_sections.map((m) => (
                            <NodePill
                              key={m.id}
                              layer="maintenance"
                              code={m.pages != null ? `p.${m.pages}` : null}
                              label={m.section}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reverse traversal: correlated LTW-04 edge alarms + live $lookup */}
      {correlated.length > 0 && (
        <div className="rounded-xl border border-[#EBCB9B] bg-[#FFFDF7] p-3 space-y-2">
          <p className="font-mono text-sm font-medium text-[#944F01]">
            ← Reverse $graphLookup · Correlated LTW-04 shopfloor alarms
          </p>
          <div className="flex flex-wrap gap-2">
            {correlated.map((alarm) => (
              <NodePill
                key={alarm.id}
                layer="diagnostics"
                code={alarm.code}
                label={alarm.machine_id || null}
              />
            ))}
          </div>
          {liveAlerts.length > 0 && (
            <p className="text-sm text-[#5C6C75]">
              Joined {liveAlerts.length} live edge alert
              {liveAlerts.length === 1 ? "" : "s"} via <span className="font-mono">$lookup alerts</span> (
              {[...new Set(liveAlerts.map((a) => a.err_code))].join(", ")}).
            </p>
          )}
        </div>
      )}

      <GoverningSopsRow sops={doc.governing_sops} />
      <LayerLegend
        layers={[
          "uns_hierarchy",
          "diagnostics",
          "maintenance",
          "production_governance",
        ]}
      />
    </div>
  );
}

function WorkOrderGraphDiagram({ doc }) {
  const reqs = doc.failure_requirements || [];

  return (
    <div className="space-y-3">
      <AssetHeader asset={doc.resolved_asset} />

      {doc.start_node && (
        <div className="flex flex-wrap items-center gap-2">
          <NodePill
            layer="diagnostics"
            code={doc.start_node.code}
            label={doc.start_node.label?.replace(
              new RegExp(`^${doc.start_node.code}\\s*`),
              ""
            )}
          />
        </div>
      )}

      {reqs.length > 0 && (
        <div className="ml-3 space-y-2.5 border-l-2 border-[#EBCB9B] pl-3">
          <EdgeTag label="INDICATES → BOM & SKILLS" />
          {reqs.map((req) => (
            <div
              key={req.failure_id}
              className="rounded-xl border border-[#E8EDEB] bg-white p-2.5 space-y-2"
            >
              <NodePill
                layer="diagnostics"
                label={req.failure_label}
                meta={req.check_first ? "check first" : null}
              />
              <div className="ml-2 space-y-1.5 border-l-2 border-[#B9D7E8] pl-3">
                {req.required_parts?.length > 0 ? (
                  <div className="space-y-1.5">
                    <EdgeTag label="REQUIRES_PART + $lookup inventory" />
                    <div className="flex flex-wrap gap-1.5">
                      {req.required_parts.map((part) => (
                        <NodePill
                          key={part.part_id}
                          layer="maintenance"
                          code={part.part_id}
                          label={part.inventory_name}
                          meta={
                            part.quantity_available != null
                              ? `${part.quantity_available} in stock · ${part.lead_time_days}d lead`
                              : null
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#5C6C75]">
                    No replacement spare parts required (calibration / inspection only).
                  </p>
                )}

                {req.required_skills?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <EdgeTag label="REQUIRES_SKILL" />
                    {req.required_skills.map((s) => (
                      <NodePill
                        key={s.skill}
                        layer="maintenance"
                        label={s.skill}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <GoverningSopsRow sops={doc.governing_sops} />
      <LayerLegend
        layers={[
          "uns_hierarchy",
          "diagnostics",
          "maintenance",
          "production_governance",
        ]}
      />
    </div>
  );
}

function PlanningGraphDiagram({ doc }) {
  const stations = doc.downstream_stations || [];
  const products = doc.blocked_products || [];
  const redundancy = doc.station_redundancy || {};
  const guidance = doc.scheduling_guidance || {};

  return (
    <div className="space-y-3">
      <AssetHeader asset={doc.resolved_asset} />

      {/* Redundancy & priority callout */}
      <div className="rounded-xl border border-[#B8E4D2] bg-[#F4FBF8] px-3 py-2 text-sm text-[#112733]">
        <span className="font-semibold text-[#00684A]">
          {redundancy.is_single_point_of_failure
            ? "Single point of failure"
            : "Redundant station"}
        </span>
        {" · "}
        {redundancy.machines_at_station ?? 1} machine at station
        {guidance.recommended_delay_factor != null && (
          <>
            {" · "}
            <span className="font-mono font-semibold text-[#00684A]">
              delay_factor = {guidance.recommended_delay_factor}
            </span>
          </>
        )}
      </div>

      {/* Linear FEEDS_INTO chain */}
      {stations.length > 0 && (
        <div className="space-y-2">
          <EdgeTag label={`FEEDS_INTO (${stations.length} downstream stations)`} />
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E8EDEB] bg-white p-3">
            {doc.resolved_asset?.station?.label && (
              <NodePill
                layer="uns_hierarchy"
                code="start"
                label={doc.resolved_asset.station.label}
              />
            )}
            {stations.map((station) => (
              <React.Fragment key={station.id}>
                <span className="font-mono text-sm text-[#5C6C75]" aria-hidden="true">
                  →
                </span>
                <NodePill
                  layer="uns_hierarchy"
                  code={`hop ${station.hop}`}
                  label={station.label}
                />
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Blocked product releases */}
      {products.length > 0 && (
        <div className="ml-3 space-y-2 border-l-2 border-[#D9C8EE] pl-3">
          <EdgeTag label={`RELEASES (${products.length} EV products blocked)`} />
          <div className="flex flex-wrap gap-2">
            {products.map((product) => (
              <NodePill
                key={product.code}
                layer="production_governance"
                code={product.code}
                label={product.label?.replace(
                  new RegExp(`^${product.code}\\s*`),
                  ""
                )}
                meta={product.config || null}
              />
            ))}
          </div>
        </div>
      )}

      <GoverningSopsRow sops={doc.governing_sops} />
      <LayerLegend layers={["uns_hierarchy", "production_governance"]} />
    </div>
  );
}

function FallbackGraphDiagram({ doc }) {
  return (
    <div className="space-y-3">
      <AssetHeader asset={doc.resolved_asset} />
      {doc.note && <p className="text-sm text-[#5C6C75]">{doc.note}</p>}
      {doc.subsystems?.length > 0 && (
        <div className="space-y-1.5">
          <EdgeTag label="CONTAINS" />
          <div className="flex flex-wrap gap-2 pl-3">
            {doc.subsystems.map((s) => (
              <NodePill key={s.id} layer="uns_hierarchy" label={s.label} />
            ))}
          </div>
        </div>
      )}
      {doc.known_alarms?.length > 0 && (
        <div className="space-y-1.5">
          <EdgeTag label="RAISES" />
          <div className="flex flex-wrap gap-2 pl-3">
            {doc.known_alarms.map((a) => (
              <NodePill key={a.id} layer="diagnostics" code={a.code} label={a.label} />
            ))}
          </div>
        </div>
      )}
      <GoverningSopsRow sops={doc.governing_sops} />
    </div>
  );
}

export default function KnowledgeGraphLogView({ doc, inputArgs }) {
  const [viewMode, setViewMode] = useState("visual"); // "visual" | "json"
  const trace = doc?.knowledge_graph_trace || null;
  const pipeline = Array.isArray(trace?.pipeline) ? trace.pipeline : null;

  const queryDisplay = useMemo(() => {
    if (pipeline) {
      return `db.${trace.collection || "knowledge_graph"}.aggregate(${JSON.stringify(
        pipeline,
        null,
        2
      )})`;
    }
    if (inputArgs) {
      return typeof inputArgs === "string"
        ? inputArgs
        : JSON.stringify(inputArgs, null, 2);
    }
    return null;
  }, [inputArgs, pipeline, trace?.collection]);

  const cleanResultJson = useMemo(() => {
    if (!doc || typeof doc !== "object") return "";
    const { knowledge_graph_trace, ...rest } = doc;
    const summaryTrace = knowledge_graph_trace
      ? {
          collection: knowledge_graph_trace.collection,
          operation: knowledge_graph_trace.operation,
          start_node: knowledge_graph_trace.start_node,
          nodes_traversed: knowledge_graph_trace.nodes_traversed,
          round_trip_ms: knowledge_graph_trace.round_trip_ms,
        }
      : undefined;
    return JSON.stringify(
      summaryTrace ? { ...rest, trace: summaryTrace } : rest,
      null,
      2
    );
  }, [doc]);

  const diagramType = useMemo(() => {
    if (Array.isArray(doc?.candidate_failures)) return "failure";
    if (Array.isArray(doc?.failure_requirements)) return "workorder";
    if (Array.isArray(doc?.downstream_stations)) return "planning";
    return "fallback";
  }, [doc]);

  return (
    <div className="space-y-4">
      {/* Query section: actual MongoDB $graphLookup aggregation */}
      {queryDisplay && (
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <Body className="font-semibold">
              {pipeline ? "MongoDB Pipeline ($graphLookup):" : "Query:"}
            </Body>
            {trace && (
              <span className="font-mono text-sm text-[#5C6C75]">
                {trace.nodes_traversed != null
                  ? `${trace.nodes_traversed} nodes · `
                  : ""}
                {trace.round_trip_ms != null ? `${trace.round_trip_ms} ms` : ""}
              </span>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto rounded-lg">
            <CodeBlock language="javascript">
              <CodeSnippet>{queryDisplay}</CodeSnippet>
              <CopyButton copyText={queryDisplay}>
                <Button aria-label="Copy pipeline">
                  <Icon glyph="Copy" />
                </Button>
              </CopyButton>
            </CodeBlock>
          </div>
        </div>
      )}

      {/* Result section with View (eye) / JSON ({}) toggle */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Body className="font-semibold">Result:</Body>
          <div
            role="group"
            aria-label="Result display mode"
            className="inline-flex items-center rounded-lg border border-[#D8E3DF] bg-[#F8FAF9] p-0.5"
          >
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              aria-pressed={viewMode === "visual"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition ${
                viewMode === "visual"
                  ? "bg-white text-[#00684A] shadow-sm"
                  : "text-[#5C6C75] hover:text-[#112733]"
              }`}
            >
              <Icon glyph="Visibility" size={16} aria-hidden="true" />
              <span>View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("json")}
              aria-pressed={viewMode === "json"}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium transition ${
                viewMode === "json"
                  ? "bg-white text-[#00684A] shadow-sm"
                  : "text-[#5C6C75] hover:text-[#112733]"
              }`}
            >
              <Icon glyph="CurlyBraces" size={16} aria-hidden="true" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {viewMode === "visual" ? (
          <div className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] p-3">
            {diagramType === "failure" && <FailureGraphDiagram doc={doc} />}
            {diagramType === "workorder" && <WorkOrderGraphDiagram doc={doc} />}
            {diagramType === "planning" && <PlanningGraphDiagram doc={doc} />}
            {diagramType === "fallback" && <FallbackGraphDiagram doc={doc} />}
          </div>
        ) : (
          <div className="max-h-[440px] overflow-y-auto rounded-lg">
            <CodeBlock language="json">
              <CodeSnippet>{cleanResultJson}</CodeSnippet>
              <CopyButton copyText={cleanResultJson}>
                <Button aria-label="Copy result JSON">
                  <Icon glyph="Copy" />
                </Button>
              </CopyButton>
            </CodeBlock>
          </div>
        )}
      </div>
    </div>
  );
}
