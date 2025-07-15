// Check inventory availability and lead times for a list of items
export function inventoryAvailabilityCheck(items, docs) {
  const unavailable = [];
  for (const item of items) {
    const doc = docs.find((d) => d.name === item);
    if (!doc || doc.quantity_available <= 0) {
      unavailable.push({
        name: item,
        lead_time_days: doc ? doc.lead_time_days : null,
      });
    }
  }
  if (unavailable.length === 0) {
    return { status: "all_available" };
  } else {
    return {
      status: "missing_items",
      unavailable,
    };
  }
}

// Given a list of staff documents and required skills, find the minimal set of staff to cover all skills and shifts
// Returns an array of assigned staff (employee_id, name), or a message if not possible

/**
 * Find the minimal set of staff to cover required skills and available shifts for any day in the week.
 * @param {Array} staffDocs - Array of staff documents from MongoDB
 * @param {Array} requiredSkills - Array of required skills
 * @returns {Object} { assigned: [{employee_id, name}], day, message }
 */
export function assignStaffToWorkorder(staffDocs, requiredSkills) {
  const daysOfWeek = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  for (const day of daysOfWeek) {
    // Filter staff available on the given day and not full_day
    const availableStaff = staffDocs.filter((s) => {
      const sched = s.weekly_schedule.find((d) => d.day === day && !d.full_day);
      return !!sched;
    });
    if (availableStaff.length === 0) continue;
    // Try to find a single staff member with all required skills
    for (const staff of availableStaff) {
      if (requiredSkills.every((skill) => staff.skills.includes(skill))) {
        return {
          assigned: [{ employee_id: staff.employee_id, name: staff.name }],
          message: "Staff available with all required skills.",
        };
      }
    }
    // Try to find a pair or trio that together cover all skills and are available on the same day
    function getCombos(arr, k) {
      if (k === 1) return arr.map((x) => [x]);
      const combos = [];
      arr.forEach((v, i) => {
        getCombos(arr.slice(i + 1), k - 1).forEach((tail) =>
          combos.push([v, ...tail])
        );
      });
      return combos;
    }
    for (let k = 2; k <= 3; k++) {
      const combos = getCombos(availableStaff, k);
      for (const combo of combos) {
        const allSkills = new Set(combo.flatMap((s) => s.skills));
        if (requiredSkills.every((skill) => allSkills.has(skill))) {
          // Check if their coverage overlaps (at least one shift in common)
          const coverages = combo.map((s) => {
            const sched = s.weekly_schedule.find(
              (d) => d.day === day && !d.full_day
            );
            return sched ? sched.coverage : null;
          });
          if (coverages.every((c) => c)) {
            const periods = ["morning", "afternoon", "night"];
            for (const period of periods) {
              if (coverages.every((c) => c.includes(period))) {
                return {
                  assigned: combo.map((s) => ({
                    employee_id: s.employee_id,
                    name: s.name,
                  })),
                  message:
                    "Staff available with required skills and overlapping coverage.",
                };
              }
            }
          }
        }
      }
    }
  }
  return {
    assigned: [],
    message:
      "No suitable staff combination found. Needs human intervention to reschedule shifts.",
  };
}

/**
 * Find the optimal start date and number of affected tasks for a new workorder.
 * @param {Array} calendarTasks - Array of production calendar tasks (sorted by planned_start_date)
 * @param {number} duration - Duration in days of the new workorder
 * @param {number} delayFactor - Delay factor of the new workorder (always 0 for this use case)
 * @returns {Object} { start_date: Date, affected_tasks: number }
 */
export function findProductionSlot(calendarTasks, duration, delayFactor) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const now = today;
  // Identify not-movable tasks: active/past or delay_factor <= new
  const notMovable = calendarTasks.filter((t) => {
    const start = new Date(t.planned_start_date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + (t.duration || 1));
    // Active or past: end < today OR (today >= start && today < end)
    const isPast = end < now;
    const isActive = start <= now && now < end;
    const isLowPriority = t.delay_factor <= delayFactor;
    return isPast || isActive || isLowPriority;
  });
  // Movable: future and delay_factor > new
  const movable = calendarTasks.filter((t) => !notMovable.includes(t));
  // Find the last not-movable task's end date (planned_start_date + duration)
  let lastNotMovableEnd = today;
  if (notMovable.length > 0) {
    lastNotMovableEnd = new Date(
      Math.max(
        ...notMovable.map((t) => {
          const start = new Date(t.planned_start_date);
          const end = new Date(start);
          end.setUTCDate(start.getUTCDate() + (t.duration || 1));
          return end.getTime();
        })
      )
    );
    lastNotMovableEnd.setUTCHours(0, 0, 0, 0);
  }
  // Earliest possible slot is the end date of the latest not-movable task, or today if that is in the past
  let slotStart;
  if (lastNotMovableEnd >= today) {
    slotStart = new Date(lastNotMovableEnd);
  } else {
    slotStart = today;
  }

  // Now, simulate inserting the new workorder and count affected movable tasks
  let affected = 0;
  let currentStart = new Date(slotStart);
  let currentEnd = new Date(currentStart);
  currentEnd.setUTCDate(currentEnd.getUTCDate() + duration);
  // Only consider movable tasks, sorted by planned_start_date
  const movableSorted = [...movable].sort(
    (a, b) => new Date(a.planned_start_date) - new Date(b.planned_start_date)
  );
  for (let i = 0; i < movableSorted.length; i++) {
    const t = movableSorted[i];
    const tStart = new Date(t.planned_start_date);
    const tEnd = new Date(tStart);
    tEnd.setUTCDate(tStart.getUTCDate() + (t.duration || 1));
    if (tStart < currentEnd) {
      // This movable task would be pushed
      affected++;
      // Move this task to after the new workorder
      currentStart = new Date(currentEnd);
      currentEnd = new Date(currentStart);
      currentEnd.setUTCDate(currentEnd.getUTCDate() + (t.duration || 1));
    } else {
      // There is a gap, so the rest can stay
      currentStart = new Date(tEnd);
      currentEnd = new Date(currentStart);
      currentEnd.setUTCDate(currentEnd.getUTCDate() + (t.duration || 1));
    }
  }
  return {
    start_date: slotStart,
    affected_tasks: affected,
  };
}

/**
 * Schedules a new maintenance workorder, updates affected tasks, and inserts the new task into the production calendar.
 * @param {Array} tasks - Array of production calendar tasks (future 2 months)
 * @param {Object} db - MongoDB database instance
 * @param {Object} maintenanceTask - The maintenance task object to insert
 * @param {number} duration - Duration in days
 * @param {number} delayFactor - Delay factor
 * @returns {Promise<{start_date: string, affected_tasks: number, maintenance_task_id: string|null}>}
 */
export async function scheduleMaintenanceWorkOrder(
  tasks,
  db,
  maintenanceTask,
  duration,
  delayFactor
) {
  const collection = db.collection("production_calendar");
  // Use helper to find slot and affected tasks
  const result = findProductionSlot(tasks, duration, delayFactor);
  const newStart = new Date(result.start_date);
  const newEnd = new Date(newStart);
  newEnd.setUTCDate(newEnd.getUTCDate() + duration);

  // Identify not-movable and movable tasks
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const now = today;
  const notMovable = tasks.filter((t) => {
    const start = new Date(t.planned_start_date);
    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + (t.duration || 1));
    const isPast = end < now;
    const isActive = start <= now && now < end;
    const isLowPriority = t.delay_factor <= delayFactor;
    return isPast || isActive || isLowPriority;
  });
  const movable = tasks.filter((t) => !notMovable.includes(t));
  // Only reschedule movable tasks that overlap with the new maintenance task
  let currentStart = new Date(newEnd);
  let currentEnd = new Date(currentStart);
  let affectedTaskIds = [];
  // Sort movable by planned_start_date
  const movableSorted = [...movable].sort(
    (a, b) => new Date(a.planned_start_date) - new Date(b.planned_start_date)
  );
  for (let i = 0; i < movableSorted.length; i++) {
    const t = movableSorted[i];
    const tStart = new Date(t.planned_start_date);
    const tEnd = new Date(tStart);
    tEnd.setUTCDate(tStart.getUTCDate() + (t.duration || 1));
    if (tStart < currentEnd) {
      // This movable task would be pushed
      affectedTaskIds.push(t._id);
      t.planned_start_date = new Date(currentStart);
      t.planned_end_date = new Date(currentStart);
      t.planned_end_date.setUTCDate(
        t.planned_end_date.getUTCDate() + (t.duration || 1)
      );
      // Move the slot forward to after this task
      currentStart = new Date(t.planned_end_date);
      currentEnd = new Date(currentStart);
      currentEnd.setUTCDate(currentEnd.getUTCDate() + (t.duration || 1));
    } else {
      // If this task is already after the current slot, move the slot forward to after this task
      currentStart = new Date(tEnd);
      currentEnd = new Date(currentStart);
      currentEnd.setUTCDate(currentEnd.getUTCDate() + (t.duration || 1));
    }
  }
  // Update affected tasks in DB
  for (const t of tasks) {
    if (affectedTaskIds.includes(t._id)) {
      await collection.updateOne(
        { _id: t._id },
        {
          $set: {
            planned_start_date: t.planned_start_date,
            planned_end_date: t.planned_end_date,
          },
        }
      );
    }
  }
  // Insert the new maintenance task
  const maintenanceDoc = {
    ...maintenanceTask,
    task_type: "maintenance",
    planned_start_date: newStart,
    planned_end_date: newEnd,
    initial_start_date: newStart,
    duration,
    delay_factor: delayFactor,
  };
  const insertResult = await collection.insertOne(maintenanceDoc);
  return {
    start_date: newStart.toISOString().slice(0, 10),
    affected_tasks: result.affected_tasks,
    maintenance_task_id:
      maintenanceDoc.task_id || insertResult.insertedId || null,
  };
}
