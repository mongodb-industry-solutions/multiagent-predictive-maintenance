import getMongoClientPromise from "../../integrations/mongodb/client.js";
import {
  KNOWLEDGE_GRAPH_COLLECTION,
  triggerKnowledgeGraphBackgroundInit,
} from "./seedData.js";

const MAX_TIME_MS = 10000;

async function getDb() {
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required but not set");
  }
  await triggerKnowledgeGraphBackgroundInit();
  const client = await getMongoClientPromise();
  return client.db(dbName);
}

function normalizeCode(value, prefix) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (prefix && trimmed.startsWith(`${prefix}:`)) {
    return trimmed.slice(prefix.length + 1);
  }
  return trimmed;
}

function formatIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value.$date) return String(value.$date);
  return String(value);
}

/**
 * Failure Agent traversal:
 * Resolves the alarm + canonical machine identity (legacy M1 <-> LTW-04),
 * walks alarm -> failure -> subsystem/sensor/manual via forward $graphLookup,
 * reverse-traverses edges.target to correlate sibling shopfloor edge alarms,
 * and joins live LTW-04 alerts + governing SOPs in a single MongoDB pipeline.
 */
export async function queryFailureDiagnosticsGraph({
  errorCode,
  machineId = "M1",
} = {}) {
  const db = await getDb();
  const col = db.collection(KNOWLEDGE_GRAPH_COLLECTION);
  const code = normalizeCode(errorCode, "alarm");
  const machineCode = normalizeCode(machineId, "machine") || "M1";

  const pipeline = [
    {
      $match: {
        node_type: "alarm",
        $or: [{ code }, { _id: `alarm:${code}` }],
      },
    },
    {
      $graphLookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        startWith: "$edges.target",
        connectFromField: "edges.target",
        connectToField: "_id",
        as: "diagnostic_path",
        maxDepth: 2,
        depthField: "hop",
        restrictSearchWithMatch: {
          node_type: { $in: ["failure", "subsystem", "sensor", "manual"] },
        },
      },
    },
    {
      $graphLookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "isa95_ancestors",
        maxDepth: 4,
        depthField: "ancestor_hop",
      },
    },
    {
      $set: {
        failure_ids: {
          $map: {
            input: {
              $filter: {
                input: "$diagnostic_path",
                as: "node",
                cond: { $eq: ["$$node.node_type", "failure"] },
              },
            },
            as: "f",
            in: "$$f._id",
          },
        },
        sop_ids: {
          $reduce: {
            input: "$isa95_ancestors",
            initialValue: [],
            in: {
              $concatArrays: [
                "$$value",
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ["$$this.edges", []] },
                        as: "e",
                        cond: { $eq: ["$$e.rel", "GOVERNED_BY"] },
                      },
                    },
                    as: "e",
                    in: "$$e.target",
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $graphLookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        startWith: "$failure_ids",
        connectFromField: "_id",
        connectToField: "edges.target",
        as: "correlated_alarm_nodes",
        maxDepth: 0,
        restrictSearchWithMatch: {
          node_type: "alarm",
          code: { $ne: code },
        },
      },
    },
    {
      $lookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        localField: "sop_ids",
        foreignField: "_id",
        as: "governing_sops",
      },
    },
    {
      $lookup: {
        from: "alerts",
        let: { alarmCodes: "$correlated_alarm_nodes.code" },
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$err_code", "$$alarmCodes"] },
              source: "edge-weld-monitor",
            },
          },
          { $sort: { ts: -1 } },
          { $limit: 5 },
          {
            $project: {
              _id: 0,
              alert_id: 1,
              err_code: 1,
              err_name: 1,
              machine_id: 1,
              priority: 1,
              ts: 1,
              details: 1,
            },
          },
        ],
        as: "recent_correlated_edge_alerts",
      },
    },
  ];

  const startedAt = performance.now();
  const [doc] = await col
    .aggregate(pipeline, { maxTimeMS: MAX_TIME_MS })
    .toArray();
  const roundTripMs = Math.round(performance.now() - startedAt);

  if (!doc) {
    return queryMachineFallback({
      col,
      machineCode,
      reason: `Alarm '${code || errorCode}' not found in knowledge_graph; resolved asset context instead.`,
    });
  }

  const ancestors = [...(doc.isa95_ancestors || [])].sort(
    (a, b) => (a.ancestor_hop ?? 0) - (b.ancestor_hop ?? 0)
  );
  const machineNode = ancestors.find((n) => n.node_type === "machine") || null;
  const stationNode = ancestors.find((n) => n.node_type === "station") || null;

  const diagnosticNodes = doc.diagnostic_path || [];
  const nodesById = new Map(diagnosticNodes.map((n) => [n._id, n]));

  const candidateFailures = diagnosticNodes
    .filter((n) => n.node_type === "failure")
    .map((failure) => {
      const affected = (failure.edges || [])
        .filter((e) => e.rel === "AFFECTS")
        .map((e) => {
          const target = nodesById.get(e.target);
          return target
            ? { id: target._id, label: target.label, type: target.node_type }
            : { id: e.target, label: e.label };
        });
      const manuals = (failure.edges || [])
        .filter((e) => e.rel === "DOCUMENTED_IN")
        .map((e) => {
          const target = nodesById.get(e.target);
          return target
            ? {
                id: target._id,
                section: target.attributes?.section || target.label,
                pages: target.attributes?.pages,
              }
            : { id: e.target };
        });
      return {
        id: failure._id,
        label: failure.label,
        summary: failure.summary,
        likelihood: failure.attributes?.likelihood || null,
        check_first: Boolean(failure.attributes?.check_first),
        affected_components: affected,
        manual_sections: manuals,
      };
    });

  const correlatedAlarms = (doc.correlated_alarm_nodes || []).map((alarm) => {
    const sharedFailures = (alarm.edges || [])
      .filter((e) => e.rel === "INDICATES" && doc.failure_ids.includes(e.target))
      .map((e) => e.target);
    return {
      id: alarm._id,
      code: alarm.code,
      label: alarm.label,
      machine_id: alarm.attributes?.machine_id || null,
      shared_failure_modes: sharedFailures,
      summary: alarm.summary,
    };
  });

  const recentEdgeAlerts = (doc.recent_correlated_edge_alerts || []).map((a) => ({
    ...a,
    ts: formatIsoDate(a.ts),
  }));

  const governingSops = (doc.governing_sops || []).map((sop) => ({
    code: sop.code,
    label: sop.label,
    approved_version: sop.attributes?.approved_version || null,
    doc_type: sop.attributes?.doc_type || null,
    summary: sop.summary,
  }));

  return {
    alarm: {
      id: doc._id,
      code: doc.code,
      label: doc.label,
      summary: doc.summary,
      threshold: doc.attributes?.threshold ?? null,
      unit: doc.attributes?.unit ?? null,
    },
    resolved_asset: machineNode
      ? {
          id: machineNode._id,
          shopfloor_id: machineNode.code,
          legacy_id: machineNode.attributes?.legacy_id || machineCode,
          label: machineNode.label,
          station: stationNode?.label || null,
          uns_topic: machineNode.uns_topic,
          isa95_path: [...ancestors].reverse().map((n) => n.label),
        }
      : { requested_machine_id: machineCode },
    candidate_failures: candidateFailures,
    correlated_shopfloor_alarms: correlatedAlarms,
    recent_correlated_edge_alerts: recentEdgeAlerts,
    governing_sops: governingSops,
    knowledge_graph_trace: {
      collection: KNOWLEDGE_GRAPH_COLLECTION,
      operation: "$graphLookup + reverse $graphLookup + $lookup",
      start_node: doc._id,
      nodes_traversed:
        diagnosticNodes.length +
        ancestors.length +
        correlatedAlarms.length +
        governingSops.length,
      round_trip_ms: roundTripMs,
      pipeline,
    },
  };
}

/**
 * Work Order Agent traversal:
 * Walks alarm -> failure -> REQUIRES_PART / REQUIRES_SKILL / DOCUMENTED_IN
 * via $graphLookup, joins live `inventory` via $lookup on external_ref.value
 * for exact canonical part names, stock levels, and lead times, and resolves
 * governing SOPs from the machine/station hierarchy.
 */
export async function queryMaintenanceRequirementsGraph({
  errorCode,
  machineId = "M1",
} = {}) {
  const db = await getDb();
  const col = db.collection(KNOWLEDGE_GRAPH_COLLECTION);
  const code = normalizeCode(errorCode, "alarm");
  const machineCode = normalizeCode(machineId, "machine") || "M1";

  const matchStage = code
    ? {
        $match: {
          node_type: "alarm",
          $or: [{ code }, { _id: `alarm:${code}` }],
        },
      }
    : {
        $match: {
          node_type: "machine",
          $or: [
            { code: machineCode },
            { "attributes.legacy_id": machineCode },
            { _id: `machine:${machineCode}` },
          ],
        },
      };

  const pipeline = [
    matchStage,
    {
      $graphLookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        startWith: "$edges.target",
        connectFromField: "edges.target",
        connectToField: "_id",
        as: "repair_graph",
        maxDepth: code ? 2 : 3,
        depthField: "hop",
        restrictSearchWithMatch: {
          node_type: {
            $in: ["alarm", "failure", "part", "skill", "subsystem", "manual"],
          },
        },
      },
    },
    {
      $graphLookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        startWith: "$parent_id",
        connectFromField: "parent_id",
        connectToField: "_id",
        as: "isa95_ancestors",
        maxDepth: 2,
        depthField: "ancestor_hop",
      },
    },
    {
      $set: {
        part_ids: {
          $map: {
            input: {
              $filter: {
                input: "$repair_graph",
                as: "node",
                cond: { $eq: ["$$node.node_type", "part"] },
              },
            },
            as: "p",
            in: "$$p.external_ref.value",
          },
        },
        sop_ids: {
          $reduce: {
            input: { $concatArrays: [["$$ROOT"], "$isa95_ancestors"] },
            initialValue: [],
            in: {
              $concatArrays: [
                "$$value",
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ["$$this.edges", []] },
                        as: "e",
                        cond: { $eq: ["$$e.rel", "GOVERNED_BY"] },
                      },
                    },
                    as: "e",
                    in: "$$e.target",
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "inventory",
        localField: "part_ids",
        foreignField: "part_id",
        as: "live_inventory",
      },
    },
    {
      $lookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        localField: "sop_ids",
        foreignField: "_id",
        as: "governing_sops",
      },
    },
  ];

  const startedAt = performance.now();
  let [doc] = await col
    .aggregate(pipeline, { maxTimeMS: MAX_TIME_MS })
    .toArray();
  let executedPipeline = pipeline;

  // Fallback to machine traversal if an unknown error code was passed
  if (!doc && code) {
    const fallbackPipeline = [
      {
        $match: {
          node_type: "machine",
          $or: [
            { code: machineCode },
            { "attributes.legacy_id": machineCode },
            { _id: `machine:${machineCode}` },
          ],
        },
      },
      ...pipeline.slice(1),
    ];
    fallbackPipeline[1] = {
      $graphLookup: {
        ...pipeline[1].$graphLookup,
        maxDepth: 3,
      },
    };
    executedPipeline = fallbackPipeline;
    [doc] = await col
      .aggregate(fallbackPipeline, { maxTimeMS: MAX_TIME_MS })
      .toArray();
  }

  const roundTripMs = Math.round(performance.now() - startedAt);

  if (!doc) {
    return {
      error: `No knowledge graph entry found for error_code='${code}' or machine_id='${machineCode}'.`,
      knowledge_graph_trace: {
        collection: KNOWLEDGE_GRAPH_COLLECTION,
        operation: "$graphLookup + $lookup",
        round_trip_ms: roundTripMs,
        pipeline: executedPipeline,
      },
    };
  }

  const repairNodes = doc.repair_graph || [];
  const nodesById = new Map(repairNodes.map((n) => [n._id, n]));
  const inventoryByPartId = new Map(
    (doc.live_inventory || []).map((item) => [item.part_id, item])
  );

  const failureRequirements = repairNodes
    .filter((n) => n.node_type === "failure")
    .map((failure) => {
      const requiredParts = (failure.edges || [])
        .filter((e) => e.rel === "REQUIRES_PART")
        .map((e) => {
          const partNode = nodesById.get(e.target);
          const partId = partNode?.external_ref?.value || partNode?.code || e.target;
          const stock = inventoryByPartId.get(partId);
          return {
            part_id: partId,
            inventory_name: stock?.name || partNode?.label || e.label,
            reason: e.label,
            quantity_available: stock?.quantity_available ?? null,
            min_stock_level: stock?.min_stock_level ?? null,
            lead_time_days:
              stock?.lead_time_days ?? partNode?.attributes?.lead_time_days ?? null,
            location: stock?.location || null,
          };
        });

      const requiredSkills = (failure.edges || [])
        .filter((e) => e.rel === "REQUIRES_SKILL")
        .map((e) => {
          const skillNode = nodesById.get(e.target);
          return {
            skill: skillNode?.code || skillNode?.label || e.target,
            reason: e.label,
          };
        });

      const affectedSubsystems = (failure.edges || [])
        .filter((e) => e.rel === "AFFECTS")
        .map((e) => nodesById.get(e.target)?.label || e.label);

      return {
        failure_id: failure._id,
        failure_label: failure.label,
        summary: failure.summary,
        check_first: Boolean(failure.attributes?.check_first),
        affected_subsystems: affectedSubsystems,
        required_parts: requiredParts,
        required_skills: requiredSkills,
      };
    });

  const ancestors = [doc, ...(doc.isa95_ancestors || [])];
  const machineNode = ancestors.find((n) => n.node_type === "machine") || null;
  const governingSops = (doc.governing_sops || []).map((sop) => ({
    code: sop.code,
    label: sop.label,
    approved_version: sop.attributes?.approved_version || null,
    summary: sop.summary,
  }));

  return {
    start_node: {
      id: doc._id,
      code: doc.code,
      label: doc.label,
    },
    resolved_asset: machineNode
      ? {
          id: machineNode._id,
          shopfloor_id: machineNode.code,
          legacy_id: machineNode.attributes?.legacy_id || machineCode,
          label: machineNode.label,
        }
      : { requested_machine_id: machineCode },
    failure_requirements: failureRequirements,
    governing_sops: governingSops,
    knowledge_graph_trace: {
      collection: KNOWLEDGE_GRAPH_COLLECTION,
      operation: "$graphLookup + $lookup (inventory & SOPs)",
      start_node: doc._id,
      nodes_traversed: repairNodes.length + (doc.isa95_ancestors || []).length,
      live_inventory_joined: (doc.live_inventory || []).length,
      round_trip_ms: roundTripMs,
      pipeline: executedPipeline,
    },
  };
}

/**
 * Planning Agent traversal:
 * Resolves legacy M1 -> machine:LTW-04 -> parent station, checks machine
 * redundancy at the station, and runs a 6-hop $graphLookup along FEEDS_INTO
 * and RELEASES to determine downstream starved stations, blocked EV products,
 * and scheduling urgency (recommended_delay_factor).
 */
export async function queryDownstreamImpactGraph({ machineId = "M1" } = {}) {
  const db = await getDb();
  const col = db.collection(KNOWLEDGE_GRAPH_COLLECTION);
  const machineCode = normalizeCode(machineId, "machine") || "M1";

  const pipeline = [
    {
      $match: {
        node_type: "machine",
        $or: [
          { code: machineCode },
          { "attributes.legacy_id": machineCode },
          { _id: `machine:${machineCode}` },
        ],
      },
    },
    {
      $lookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        localField: "parent_id",
        foreignField: "_id",
        as: "station_docs",
      },
    },
    { $unwind: { path: "$station_docs", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        let: { stationId: "$station_docs._id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$parent_id", "$$stationId"] },
              node_type: "machine",
            },
          },
          { $project: { _id: 1, code: 1, label: 1 } },
        ],
        as: "station_machines",
      },
    },
    {
      $graphLookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        startWith: "$station_docs.edges.target",
        connectFromField: "edges.target",
        connectToField: "_id",
        as: "downstream_impact",
        maxDepth: 6,
        depthField: "hop",
        restrictSearchWithMatch: {
          node_type: { $in: ["station", "product"] },
        },
      },
    },
    {
      $set: {
        sop_ids: {
          $reduce: {
            input: ["$$ROOT", { $ifNull: ["$station_docs", {}] }],
            initialValue: [],
            in: {
              $concatArrays: [
                "$$value",
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ["$$this.edges", []] },
                        as: "e",
                        cond: { $eq: ["$$e.rel", "GOVERNED_BY"] },
                      },
                    },
                    as: "e",
                    in: "$$e.target",
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        localField: "sop_ids",
        foreignField: "_id",
        as: "governing_sops",
      },
    },
  ];

  const startedAt = performance.now();
  const [doc] = await col
    .aggregate(pipeline, { maxTimeMS: MAX_TIME_MS })
    .toArray();
  const roundTripMs = Math.round(performance.now() - startedAt);

  if (!doc) {
    return {
      error: `Machine '${machineCode}' not found in knowledge_graph.`,
      recommended_delay_factor: 0,
      knowledge_graph_trace: {
        collection: KNOWLEDGE_GRAPH_COLLECTION,
        operation: "$graphLookup",
        round_trip_ms: roundTripMs,
        pipeline,
      },
    };
  }

  const impactNodes = doc.downstream_impact || [];
  const downstreamStations = impactNodes
    .filter((n) => n.node_type === "station")
    .sort((a, b) => (a.hop ?? 0) - (b.hop ?? 0))
    .map((s) => ({
      hop: s.hop,
      id: s._id,
      label: s.label,
      summary: s.summary,
    }));

  const blockedProducts = impactNodes
    .filter((n) => n.node_type === "product")
    .sort((a, b) => (a.hop ?? 0) - (b.hop ?? 0))
    .map((p) => ({
      hop: p.hop,
      code: p.code,
      label: p.label,
      recipe: p.attributes?.recipe || null,
      config: p.attributes?.config || null,
    }));

  const stationMachines = doc.station_machines || [];
  const hasRedundantMachine = stationMachines.length > 1;
  const isCriticalBottleneck =
    !hasRedundantMachine && blockedProducts.length > 0;

  const governingSops = (doc.governing_sops || []).map((sop) => ({
    code: sop.code,
    label: sop.label,
    approved_version: sop.attributes?.approved_version || null,
  }));

  return {
    resolved_asset: {
      id: doc._id,
      shopfloor_id: doc.code,
      legacy_id: doc.attributes?.legacy_id || machineCode,
      label: doc.label,
      station: doc.station_docs
        ? { id: doc.station_docs._id, label: doc.station_docs.label }
        : null,
    },
    station_redundancy: {
      machines_at_station: stationMachines.length,
      has_redundant_standby: hasRedundantMachine,
      is_single_point_of_failure: !hasRedundantMachine,
    },
    downstream_stations: downstreamStations,
    blocked_products: blockedProducts,
    scheduling_guidance: {
      criticality: isCriticalBottleneck ? "critical_bottleneck" : "standard",
      recommended_delay_factor: isCriticalBottleneck ? 0 : 1,
      rationale: isCriticalBottleneck
        ? `${doc.label} (${doc.code} / legacy ${doc.attributes?.legacy_id || machineCode}) is the sole machine at ${doc.station_docs?.label || "its station"}; downtime starves ${downstreamStations.length} downstream stations and blocks release of ${blockedProducts.length} EV products (${blockedProducts.map((p) => p.code).join(", ")}). Schedule with highest priority (delay_factor = 0).`
        : `${doc.label} has station redundancy or limited downstream blast radius.`,
    },
    governing_sops: governingSops,
    knowledge_graph_trace: {
      collection: KNOWLEDGE_GRAPH_COLLECTION,
      operation: "$graphLookup (FEEDS_INTO & RELEASES blast radius)",
      start_node: doc.station_docs?._id || doc._id,
      nodes_traversed: impactNodes.length + stationMachines.length,
      round_trip_ms: roundTripMs,
      pipeline,
    },
  };
}

async function queryMachineFallback({ col, machineCode, reason }) {
  const startedAt = performance.now();
  const pipeline = [
    {
      $match: {
        node_type: "machine",
        $or: [
          { code: machineCode },
          { "attributes.legacy_id": machineCode },
          { _id: `machine:${machineCode}` },
        ],
      },
    },
    {
      $graphLookup: {
        from: KNOWLEDGE_GRAPH_COLLECTION,
        startWith: "$edges.target",
        connectFromField: "edges.target",
        connectToField: "_id",
        as: "connected",
        maxDepth: 1,
        depthField: "hop",
        restrictSearchWithMatch: {
          node_type: { $in: ["alarm", "subsystem", "manual", "sop"] },
        },
      },
    },
  ];
  const [machine] = await col
    .aggregate(pipeline, { maxTimeMS: MAX_TIME_MS })
    .toArray();
  const roundTripMs = Math.round(performance.now() - startedAt);

  if (!machine) {
    return {
      note: reason,
      resolved_asset: null,
      knowledge_graph_trace: {
        collection: KNOWLEDGE_GRAPH_COLLECTION,
        operation: "$graphLookup",
        round_trip_ms: roundTripMs,
        pipeline,
      },
    };
  }

  const connected = machine.connected || [];
  return {
    note: reason,
    resolved_asset: {
      id: machine._id,
      shopfloor_id: machine.code,
      legacy_id: machine.attributes?.legacy_id || machineCode,
      label: machine.label,
      uns_topic: machine.uns_topic,
    },
    subsystems: connected
      .filter((n) => n.node_type === "subsystem")
      .map((n) => ({ id: n._id, label: n.label, summary: n.summary })),
    known_alarms: connected
      .filter((n) => n.node_type === "alarm")
      .map((n) => ({ id: n._id, code: n.code, label: n.label })),
    governing_sops: connected
      .filter((n) => n.node_type === "sop")
      .map((n) => ({
        code: n.code,
        label: n.label,
        approved_version: n.attributes?.approved_version || null,
      })),
    knowledge_graph_trace: {
      collection: KNOWLEDGE_GRAPH_COLLECTION,
      operation: "$graphLookup",
      start_node: machine._id,
      nodes_traversed: connected.length,
      round_trip_ms: roundTripMs,
      pipeline,
    },
  };
}
