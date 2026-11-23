"use client";

import { HighlightedJson } from "@/components/contextExplorer/ResultPane";
import { layerStyle } from "./graphModel";
import GraphQueryLab from "./GraphQueryLab";

const TABS = [
  { id: "query", label: "Graph traversal" },
  { id: "document", label: "Node view" },
  { id: "why", label: "Why MongoDB" },
];

const WHY_CARDS = [
  {
    title: "One operational memory",
    body: "The ontology sits in the same database as telemetry, alerts, inventory, manuals, and SOPs. There is no graph export to keep in sync with the factory.",
  },
  {
    title: "Documents, not just vertices",
    body: "Each entity keeps the fields a person or an agent actually needs: thresholds, recipes, UNS topics, and a pointer into the live collection.",
  },
  {
    title: "Traverse, then join",
    body: "$graphLookup walks the ontology. $lookup, time series, and vector search stay available in the same pipeline when the answer lives in operational data.",
  },
  {
    title: "Ready for the agents",
    body: "Failure, work-order, planning, contestable, and audit agents can call these traversals later. The codes they already use are the vertex ids.",
  },
];

function FieldNote({ title, body }) {
  return (
    <div className="rounded-xl border border-[#D8E3DF] bg-white px-3 py-2">
      <p className="text-sm font-semibold text-[#112733]">{title}</p>
      <p className="mt-0.5 text-sm leading-5 text-[#5C6C75]">{body}</p>
    </div>
  );
}

export default function GraphInspectorPane({
  tab,
  onTab,
  selectedNode,
  indexes,
  nodesById,
  onHighlight,
  onView,
  resetSignal = 0,
}) {
  const style = selectedNode ? layerStyle(selectedNode.layer) : null;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#D8E3DF] bg-white shadow-sm">
      <div className="flex shrink-0 gap-1 border-b border-[#D8E3DF] bg-[#F8FAF9] p-1.5">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTab(item.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                active
                  ? "bg-white font-semibold text-[#00684A] shadow-sm"
                  : "text-[#5C6C75]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className={tab === "query" ? "block" : "hidden"}>
          <GraphQueryLab
            active={tab === "query"}
            nodesById={nodesById}
            onHighlight={onHighlight}
            onView={onView}
            resetSignal={resetSignal}
          />
        </div>
        {tab === "document" && (
          <div className="space-y-3">
            {selectedNode ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-[#112733]">
                    {selectedNode.label}
                  </h2>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-sm font-medium"
                    style={{ backgroundColor: style.tint, color: style.color }}
                  >
                    {selectedNode.node_type}
                  </span>
                </div>
                <p className="text-sm leading-6 text-[#3D4F58]">
                  {selectedNode.summary}
                </p>
                <div className="overflow-hidden rounded-xl border border-[#D8E3DF]">
                  <HighlightedJson value={selectedNode} compact />
                </div>
              </>
            ) : (
              <p className="text-sm leading-6 text-[#5C6C75]">
                Select an entity on the graph to see the document MongoDB stores for it.
              </p>
            )}
            <div className="grid gap-2">
              <FieldNote
                title="_id and edges.target"
                body="Forward $graphLookup matches each edges.target value to another document's _id. The default _id index makes every hop a point lookup."
              />
              <FieldNote
                title="parent_id"
                body="The equipment tree is a parent reference. Drill from a station to cells, subsystems, and sensors without storing the whole subtree on one document."
              />
              <FieldNote
                title="external_ref"
                body="A vertex can point at inventory, manuals, materials, alerts, staff skills, or a controlled procedure. $lookup follows that pointer into the live collection."
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-[#112733]">
                Indexes on knowledge_graph
              </p>
              <div className="grid gap-1.5">
                {(indexes || []).map((index) => (
                  <div
                    key={index.name}
                    className="rounded-xl border border-[#D8E3DF] bg-[#F8FAF9] px-3 py-2 font-mono text-sm text-[#112733]"
                  >
                    {index.name}: {JSON.stringify(index.key)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === "why" && (
          <div className="grid gap-2">
            {WHY_CARDS.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-[#D8E3DF] bg-[#F8FAF9] px-4 py-3"
              >
                <h2 className="text-base font-semibold text-[#112733]">
                  {card.title}
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#3D4F58]">{card.body}</p>
              </article>
            ))}
            <p className="text-sm leading-6 text-[#5C6C75]">
              Depth on a $graphLookup result starts at 0 for the first document reached. The start entity is the pipeline root and is badged separately on the canvas.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
