// WorkOrders API

/**
 * Fetch the last 10 workorders created in the last hour from MongoDB.
 * @returns {Promise<Array>} Array of workorder objects
 */
export async function fetchWorkOrders() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const res = await fetch("/api/action/find", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "find",
      collection: "workorders",
      filter: { created_at: { $gte: { $date: oneHourAgo.toISOString() } } },
      projection: { embedding: 0 },
      sort: { created_at: -1 },
      limit: 10,
    }),
  });
  if (res.ok) {
    return await res.json();
  }
  return [];
}
