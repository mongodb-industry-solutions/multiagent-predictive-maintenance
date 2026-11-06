// Incident Reports API

export async function fetchIncidentReports() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const res = await fetch("/api/action/find", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "find",
      collection: "incident_reports",
      filter: { ts: { $gte: { $date: oneHourAgo.toISOString() } } },
      sort: { ts: -1 },
      limit: 10,
    }),
  });
  if (res.ok) {
    return await res.json();
  }
  return [];
}

export async function updateIncidentReport(incidentId, { rootCause, repairInstructions }) {
  if (!incidentId) return null;
  const parsedSteps = Array.isArray(repairInstructions)
    ? repairInstructions
    : String(repairInstructions || "")
        .split("\n")
        .map((line) => line.replace(/^[-\s]*Step\s*\d+:\s*/i, "").trim())
        .filter(Boolean)
        .map((description, index) => ({
          step: index + 1,
          description,
        }));

  const strId =
    typeof incidentId === "object" && incidentId.$oid
      ? incidentId.$oid
      : String(incidentId);

  const filter =
    strId.length === 24 && /^[0-9a-fA-F]{24}$/.test(strId)
      ? { _id: { $oid: strId } }
      : { _id: strId };

  const res = await fetch("/api/action/updateOne", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "updateOne",
      collection: "incident_reports",
      filter,
      update: {
        $set: {
          root_cause: rootCause,
          repair_instructions: parsedSteps,
        },
      },
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

