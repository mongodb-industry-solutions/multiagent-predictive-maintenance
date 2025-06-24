// Alerts API

export async function fetchAlerts() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const res = await fetch("/api/action/find", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "find",
      collection: "alerts",
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

export async function persistAlert(alert) {
  const { _id, ts, ...rest } = alert;
  const doc = {
    ...rest,
    ts: { $date: new Date().toISOString() },
    status: "new",
  };
  await fetch("/api/action/insertOne", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "insertOne",
      collection: "alerts",
      document: doc,
    }),
  });
}
