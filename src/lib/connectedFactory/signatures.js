export const SIGNATURE_BINS = 24;
export const SIGNATURE_BIN_SECONDS = 10;
export const SIGNATURE_WINDOW_SECONDS = SIGNATURE_BINS * SIGNATURE_BIN_SECONDS;
export const DEFAULT_SIGNAL = "weld-zone-temp";

/**
 * Build the MongoDB aggregation pipeline that converts a 4-minute telemetry
 * window in `telemetry` into a 24-point z-scored shape signature inside the database.
 */
export function signaturePipeline(
  machineId,
  start,
  end,
  signal = DEFAULT_SIGNAL
) {
  const startDate = start instanceof Date ? start : new Date(start);
  const endDate = end instanceof Date ? end : new Date(end);

  return [
    {
      $match: {
        "metadata.machine_id": machineId,
        "metadata.signal": signal,
        ts: { $gte: startDate, $lt: endDate },
      },
    },
    {
      $group: {
        _id: {
          $dateTrunc: {
            date: "$ts",
            unit: "second",
            binSize: SIGNATURE_BIN_SECONDS,
          },
        },
        v: { $avg: "$value" },
      },
    },
    { $sort: { _id: 1 } },
    { $group: { _id: null, bins: { $push: "$v" } } },
    {
      $set: {
        mu: { $avg: "$bins" },
        sd: { $stdDevPop: "$bins" },
      },
    },
    {
      $project: {
        _id: 0,
        peakTempC: { $round: [{ $max: "$bins" }, 1] },
        signature: {
          $map: {
            input: "$bins",
            as: "v",
            in: {
              $round: [
                {
                  $divide: [
                    { $subtract: ["$$v", "$mu"] },
                    { $cond: [{ $eq: ["$sd", 0] }, 1, "$sd"] },
                  ],
                },
                4,
              ],
            },
          },
        },
      },
    },
  ];
}

/**
 * Format the same signature aggregation pipeline as mongosh text for display
 * when the user clicks "How the vector is computed".
 */
export function signaturePipelineText(
  machineId,
  start,
  end,
  signal = DEFAULT_SIGNAL
) {
  const startIso = (start instanceof Date ? start : new Date(start))
    .toISOString()
    .replace(".000Z", "Z");
  const endIso = (end instanceof Date ? end : new Date(end))
    .toISOString()
    .replace(".000Z", "Z");

  return `[
  { $match: {
      "metadata.machine_id": "${machineId}",
      "metadata.signal": "${signal}",
      ts: { $gte: ISODate("${startIso}"),
            $lt:  ISODate("${endIso}") }
  }},
  { $group: {
      _id: { $dateTrunc: { date: "$ts", unit: "second", binSize: ${SIGNATURE_BIN_SECONDS} } },
      v: { $avg: "$value" }
  }},
  { $sort: { _id: 1 } },
  { $group: { _id: null, bins: { $push: "$v" } } },
  { $set: { mu: { $avg: "$bins" }, sd: { $stdDevPop: "$bins" } } },
  { $project: {
      _id: 0,
      peakTempC: { $round: [{ $max: "$bins" }, 1] },
      signature: { $map: { input: "$bins", as: "v",
                    in: { $divide: [{ $subtract: ["$$v", "$mu"] }, "$sd"] } } }
  }}
]`;
}
