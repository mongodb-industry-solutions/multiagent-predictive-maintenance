import {
  CF_COLLECTIONS,
  CF_MACHINE_ID,
  CF_VECTOR_INDEX_NAME,
  getCurrentDemoDay,
} from "./constants.js";

export const CONTEXT_HIGHLIGHT_KEYS = [
  "area",
  "factory_id",
  "prod_line_id",
  "machine_id",
  "materialMaster",
  "material",
  "site",
  "workOrder",
  "product",
  "operatorId",
  "overLimit",
  "rootCause",
];

export function buildContextExplorerPrompts(dayStr = getCurrentDemoDay()) {
  return [
    {
      id: "most-alarms",
      label: "Which order had the most alarms today?",
      question: `Group the alerts on machine LTW-04 on ${dayStr} by the production work order that was running at the time of each alert (alerts with no running order form their own group). Per group: work order, product, number of alerts, number of priority-1 alerts. Sort by alerts descending.`,
    },
    {
      id: "step4-in-words",
      label: "Step 4, asked in words",
      question:
        "For every alert on machine LTW-04, find the production work order that was running on that machine at the time of the alert. Group by work order (alerts with no running order form their own group) and show per group: work order, product, operator id, number of alerts, number of priority-1 alerts, and the time of the first alert. Sort by number of alerts descending.",
    },
    {
      id: "before-0814",
      label: "What happened before the 08:14 alarm?",
      question: `How did the weld-zone temperature on LTW-04 behave in the 10 minutes before the alarm at 08:14:12 on ${dayStr}? When was the peak, and was it above the thermal limit of the tab material being welded at that moment?`,
    },
  ];
}

export function buildContextExplorerSteps(dayStr = getCurrentDemoDay()) {
  const alarmIso = `${dayStr}T08:14:12Z`;
  const sigStartIso = `${dayStr}T08:12:30Z`;
  const sigEndIso = `${dayStr}T08:16:30Z`;

  return [
    {
      id: "data",
      num: "0",
      kind: "data",
      title: "The data",
      visualSlideId: "overview",
      sentence:
        "Four operational collections in Leafy Factory: time-series telemetry (with 24h TTL), alerts, production workorders, and ERP tab material specs.",
    },
    {
      id: "reading",
      num: "1",
      kind: "query",
      title: "The reading",
      visualSlideId: "reading",
      sentence:
        "One reading on LTW-04: 235.2 degC, work order WO-1001234, material code MAT-CU-020. Whether 235.2 degC is acceptable is not in the document.",
      collection: CF_COLLECTIONS.TELEMETRY,
      view: "json",
      pipeline: `[
  { $match: {
      "metadata.machine_id": "${CF_MACHINE_ID}",
      "metadata.signal": "weld-zone-temp",
      ts: ISODate("${alarmIso}")
  }}
]`,
    },
    {
      id: "limit",
      num: "2",
      kind: "query",
      title: "The limit",
      visualSlideId: "limit",
      sentence:
        "One lookup resolves MAT-CU-020 to nickel-plated C11000 copper tab foil, max limit 230 degC. The weld reading is over the limit.",
      collection: CF_COLLECTIONS.TELEMETRY,
      view: "json",
      pipeline: `[
  { $match: {
      "metadata.machine_id": "${CF_MACHINE_ID}",
      "metadata.signal": "weld-zone-temp",
      ts: ISODate("${alarmIso}")
  }},
  { $lookup: {
      from: "${CF_COLLECTIONS.MATERIALS}",
      localField: "metadata.materialMaster",
      foreignField: "materialMaster",
      as: "material"
  }},
  { $unwind: "$material" },
  { $project: {
      _id: 0,
      ts: 1,
      machine_id: "$metadata.machine_id",
      workOrder: "$metadata.workOrder",
      weldTempC: "$value",
      materialMaster: "$metadata.materialMaster",
      material: "$material.name",
      maxWeldTempC: "$material.maxWeldTempC",
      overLimit: { $gt: ["$value", "$material.maxWeldTempC"] }
  }}
]`,
    },
    {
      id: "alert",
      num: "3",
      kind: "query",
      title: "The alert",
      star: true,
      visualSlideId: "alert",
      sentence:
        "The alert payload carries no order reference. The only common attribute is time, so the join resolves the active work order over its time span.",
      collection: CF_COLLECTIONS.ALERTS,
      view: "json",
      pipeline: `[
  { $match: { machine_id: "${CF_MACHINE_ID}", ts: ISODate("${alarmIso}") }},

  { $lookup: {
      from: "${CF_COLLECTIONS.ORDERS}",
      localField: "machine_id", foreignField: "machine_id",
      let: { t: "$ts" },
      pipeline: [
        { $match: { $expr: { $and: [
            { $lte: ["$startedAt", "$$t"] },
            { $gt:  ["$endedAt",   "$$t"] }
        ]}}}
      ],
      as: "order"
  }},
  { $unwind: { path: "$order", preserveNullAndEmptyArrays: true }},

  { $project: {
      _id: 0,
      ts: 1,
      machine_id: 1,
      alert: "$err_name",
      priority: 1,
      workOrder: "$order.workOrder",
      product: "$order.product",
      plannedQty: "$order.plannedQty",
      operatorId: "$order.operatorId"
  }}
]`,
    },
    {
      id: "day",
      num: "4",
      kind: "query",
      title: "The whole day",
      visualSlideId: "day",
      sentence:
        "The same interval join, grouped by order. Alerts per battery module work order across the whole day — including the 22:47 fault during unscheduled downtime.",
      collection: CF_COLLECTIONS.ALERTS,
      view: "table",
      pipeline: `[
  { $match: { machine_id: "${CF_MACHINE_ID}" }},

  { $lookup: {
      from: "${CF_COLLECTIONS.ORDERS}",
      localField: "machine_id", foreignField: "machine_id",
      let: { t: "$ts" },
      pipeline: [
        { $match: { $expr: { $and: [
            { $lte: ["$startedAt", "$$t"] },
            { $gt:  ["$endedAt",   "$$t"] }
        ]}}}
      ],
      as: "order"
  }},
  { $unwind: { path: "$order", preserveNullAndEmptyArrays: true }},

  { $group: {
      _id: "$order.workOrder",
      product: { $first: "$order.product" },
      operatorId: { $first: "$order.operatorId" },
      alerts: { $sum: 1 },
      highPriority: { $sum: { $cond: [{ $eq: ["$priority", 1] }, 1, 0] }},
      firstAlert: { $min: "$ts" }
  }},
  { $project: {
      _id: 0,
      workOrder: "$_id",
      product: "$product",
      operatorId: "$operatorId",
      alerts: "$alerts",
      highPriority: "$highPriority",
      firstAlert: "$firstAlert"
  }},
  { $sort: { alerts: -1 }}
]`,
    },
    {
      id: "agent",
      num: "5",
      kind: "agent",
      title: "Ask in words",
      visualSlideId: "agent",
      sentence:
        "The same operational question in natural language. A read-only LangGraph agent writes and executes the MongoDB aggregation pipeline live.",
    },
    {
      id: "before",
      num: "6",
      kind: "query",
      title: "Has this happened before?",
      visualSlideId: "before",
      signatureWindow: {
        machineId: CF_MACHINE_ID,
        start: sigStartIso,
        end: sigEndIso,
      },
      sentence:
        "The 4-minute weld temperature curve around the alarm, searched across past fleet excursions. Same curve shape, same optics spatter root cause — one case still open.",
      collection: CF_COLLECTIONS.EXCURSIONS,
      view: "table",
      pipeline: `[
  { $vectorSearch: {
      index: "${CF_VECTOR_INDEX_NAME}",
      path: "signature",
      queryVector: SIGNATURE_OF("${CF_MACHINE_ID}", "${sigStartIso}", "${sigEndIso}"),
      filter: { signal: "weld-zone-temp" },
      numCandidates: 100,
      limit: 6
  }},
  { $project: {
      _id: 0,
      similarity: { $round: [{ $meta: "vectorSearchScore" }, 3] },
      shape: "$signature",
      machine_id: "$machine_id",
      site: "$site",
      start: "$start",
      material: "$material",
      rootCause: "$rootCause",
      status: "$status"
  }}
]`,
    },
    {
      id: "before-material",
      num: "6.1",
      kind: "query",
      title: "Only this material",
      visualSlideId: "before",
      signatureWindow: {
        machineId: CF_MACHINE_ID,
        start: sigStartIso,
        end: sigEndIso,
      },
      sentence:
        "The same vector search restricted to copper foil MAT-CU-020. Vector and metadata live in one document, so pre-filtering happens before similarity scoring.",
      collection: CF_COLLECTIONS.EXCURSIONS,
      view: "table",
      pipeline: `[
  { $vectorSearch: {
      index: "${CF_VECTOR_INDEX_NAME}",
      path: "signature",
      queryVector: SIGNATURE_OF("${CF_MACHINE_ID}", "${sigStartIso}", "${sigEndIso}"),
      filter: { signal: "weld-zone-temp", materialMaster: "MAT-CU-020" },
      numCandidates: 100,
      limit: 6
  }},
  { $project: {
      _id: 0,
      similarity: { $round: [{ $meta: "vectorSearchScore" }, 3] },
      shape: "$signature",
      machine_id: "$machine_id",
      site: "$site",
      start: "$start",
      material: "$material",
      rootCause: "$rootCause",
      status: "$status"
  }}
]`,
    },
  ];
}
