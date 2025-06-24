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
