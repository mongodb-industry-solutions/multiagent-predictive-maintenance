// Fetch and transform production calendar events for FullCalendar

export async function fetchProductionCalendarEvents() {
  // Fetch from the Next.js API route for actions
  const res = await fetch("/api/action/find", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      collection: "production_calendar",
      filter: {},
      sort: { initial_start_date: 1 },
    }),
  });
  if (!res.ok) throw new Error("Failed to fetch production calendar events");
  const data = await res.json();

  // Transform to FullCalendar event objects
  // https://fullcalendar.io/docs/event-object
  return data.map((task) => {
    // Calculate end date as planned_start_date + duration days (exclusive)
    const startDate = new Date(task.planned_start_date);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + (task.duration || 1));
    return {
      id: task.task_id,
      title: `${task.task_id}: ${task.pieces_to_produce} pcs (${task.priority})`,
      start: startDate,
      end: endDate, // exclusive
      allDay: true,
      extendedProps: {
        ...task,
      },
    };
  });
}
