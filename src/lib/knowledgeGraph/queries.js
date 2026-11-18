const GRAPH = "knowledge_graph";

function slimNode(alias, depthField) {
  return {
    _id: `$$${alias}._id`,
    code: `$$${alias}.code`,
    label: `$$${alias}.label`,
    node_type: `$$${alias}.node_type`,
    layer: `$$${alias}.layer`,
    [depthField]: `$$${alias}.${depthField}`,
  };
}

export function buildFaultToResolutionPipeline(
  startId = "alarm:E12",
  { maxDepth = 2, layers = null, nodeTypes = null, asField = "path" } = {}
) {
  const lookup = {
    from: GRAPH,
    startWith: "$edges.target",
    connectFromField: "edges.target",
    connectToField: "_id",
    as: asField,
    maxDepth,
    depthField: "hop",
  };
  const restrict = {};
  if (Array.isArray(layers) && layers.length > 0) {
    restrict.layer = { $in: layers };
  }
  if (Array.isArray(nodeTypes) && nodeTypes.length > 0) {
    restrict.node_type = { $in: nodeTypes };
  }
  if (Object.keys(restrict).length > 0) {
    lookup.restrictSearchWithMatch = restrict;
  }
  return [
    { $match: { _id: startId } },
    { $graphLookup: lookup },
    {
      $project: {
        _id: 1,
        label: 1,
        code: 1,
        [asField]: {
          $map: {
            input: `$${asField}`,
            as: "node",
            in: slimNode("node", "hop"),
          },
        },
      },
    },
  ];
}

export function buildDownstreamImpactPipeline(startId = "station:laser-welding") {
  return [
    { $match: { _id: startId } },
    {
      $graphLookup: {
        from: GRAPH,
        startWith: "$edges.target",
        connectFromField: "edges.target",
        connectToField: "_id",
        as: "downstream",
        maxDepth: 6,
        depthField: "hop",
        restrictSearchWithMatch: { node_type: { $in: ["station", "product"] } },
      },
    },
    {
      $project: {
        _id: 1,
        label: 1,
        downstream: {
          $map: {
            input: "$downstream",
            as: "node",
            in: slimNode("node", "hop"),
          },
        },
      },
    },
  ];
}

export function buildIsa95SubtreePipeline(startId = "station:laser-welding") {
  return [
    { $match: { _id: startId } },
    {
      $graphLookup: {
        from: GRAPH,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "parent_id",
        as: "equipment",
        maxDepth: 2,
        depthField: "isa95_depth",
        restrictSearchWithMatch: {
          node_type: { $in: ["machine", "subsystem", "sensor"] },
        },
      },
    },
    {
      $project: {
        _id: 1,
        label: 1,
        equipment: {
          $map: {
            input: "$equipment",
            as: "node",
            in: slimNode("node", "isa95_depth"),
          },
        },
      },
    },
  ];
}

export function buildReverseDependencyPipeline(startId = "part:P-001") {
  return [
    { $match: { _id: startId } },
    {
      $graphLookup: {
        from: GRAPH,
        startWith: "$_id",
        connectFromField: "_id",
        connectToField: "edges.target",
        as: "referenced_by",
        maxDepth: 2,
        depthField: "provenance_depth",
      },
    },
    {
      $project: {
        _id: 1,
        label: 1,
        referenced_by: {
          $map: {
            input: "$referenced_by",
            as: "node",
            in: slimNode("node", "provenance_depth"),
          },
        },
      },
    },
  ];
}

export function buildHybridInventoryReadinessPipeline(startId = "alarm:E12") {
  return [
    { $match: { _id: startId } },
    {
      $graphLookup: {
        from: GRAPH,
        startWith: "$edges.target",
        connectFromField: "edges.target",
        connectToField: "_id",
        as: "path",
        maxDepth: 2,
        depthField: "hop",
      },
    },
    {
      $set: {
        parts: {
          $filter: {
            input: "$path",
            as: "node",
            cond: { $eq: ["$$node.node_type", "part"] },
          },
        },
        manuals: {
          $filter: {
            input: "$path",
            as: "node",
            cond: { $eq: ["$$node.node_type", "manual"] },
          },
        },
      },
    },
    {
      $lookup: {
        from: "inventory",
        localField: "parts.external_ref.value",
        foreignField: "part_id",
        as: "stock",
      },
    },
    {
      $lookup: {
        from: "manuals",
        localField: "manuals.external_ref.value",
        foreignField: "pages",
        as: "guidance",
      },
    },
    {
      $project: {
        _id: 1,
        label: 1,
        path: {
          $map: {
            input: "$path",
            as: "node",
            in: slimNode("node", "hop"),
          },
        },
        stock: {
          $map: {
            input: "$stock",
            as: "item",
            in: {
              part_id: "$$item.part_id",
              name: "$$item.name",
              quantity_available: "$$item.quantity_available",
              location: "$$item.location",
              lead_time_days: "$$item.lead_time_days",
            },
          },
        },
        guidance: {
          $map: {
            input: "$guidance",
            as: "doc",
            in: { pages: "$$doc.pages", section: "$$doc.section" },
          },
        },
      },
    },
  ];
}

export const QUERY_PRESETS = [
  {
    id: "fault-to-repair",
    num: "1",
    title: "Alarm to repair",
    view: {
      layers: ["uns_hierarchy", "diagnostics", "maintenance"],
      depth: 12,
    },
    sentence:
      "From E12, $graphLookup walks two hops: failure modes, then the parts, skills, and manual sections that close the repair.",
    pipeline: buildFaultToResolutionPipeline("alarm:E12", {
      nodeTypes: ["failure", "part", "skill", "manual"],
    }),
  },
  {
    id: "scoped-maintenance",
    num: "2",
    title: "Scoped traversal",
    view: {
      layers: ["uns_hierarchy", "diagnostics", "maintenance"],
      depth: 12,
    },
    sentence:
      "restrictSearchWithMatch keeps the welding cell's walk inside diagnostics and maintenance, so recipes and SOPs never enter the result.",
    pipeline: buildFaultToResolutionPipeline("machine:LTW-04", {
      layers: ["diagnostics", "maintenance"],
      asField: "scope",
    }),
  },
  {
    id: "downstream-impact",
    num: "3",
    title: "Downstream blast radius",
    view: {
      layers: ["uns_hierarchy", "production_governance"],
      depth: 13,
    },
    sentence:
      "From Laser Tab Welding, follow FEEDS_INTO through the rest of the line and stop on the products Pack EOL Test can release.",
    pipeline: buildDownstreamImpactPipeline("station:laser-welding"),
  },
  {
    id: "isa95-subtree",
    num: "4",
    title: "ISA-95 drilldown",
    view: {
      layers: ["uns_hierarchy"],
      depth: 7,
    },
    sentence:
      "parent_id is the equipment tree. One $graphLookup from the welding station returns the welding cell, its subsystems, and sensors.",
    pipeline: buildIsa95SubtreePipeline("station:laser-welding"),
  },
  {
    id: "hybrid-readiness",
    num: "5",
    title: "Graph plus live stock",
    view: {
      layers: ["uns_hierarchy", "diagnostics", "maintenance"],
      depth: 12,
    },
    sentence:
      "The ontology names the parts and manual pages. $lookup then reads live inventory and the manual text in the same pipeline.",
    pipeline: buildHybridInventoryReadinessPipeline("alarm:E12"),
  },
];
