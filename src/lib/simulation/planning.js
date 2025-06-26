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
  // Only consider tasks after today
  const tasks = calendarTasks.filter(
    (t) => new Date(t.planned_end_date || t.deadline_date) > today
  );
  // Sort by planned_start_date ascending
  tasks.sort(
    (a, b) => new Date(a.planned_start_date) - new Date(b.planned_start_date)
  );

  // Find the first task with a higher delay factor
  const firstHigherDelayIdx = tasks.findIndex(
    (t) => t.delay_factor > delayFactor
  );
  // If all tasks have delay_factor <= new, we can start today if no tasks, or after the last one
  let slotStart = today;
  if (firstHigherDelayIdx === 0 || tasks.length === 0) {
    slotStart = today;
  } else if (firstHigherDelayIdx > 0) {
    // Start after the last task with delay_factor <= new
    const prevTask = tasks[firstHigherDelayIdx - 1];
    slotStart = new Date(prevTask.planned_end_date || prevTask.deadline_date);
    slotStart.setUTCHours(0, 0, 0, 0);
    slotStart = new Date(slotStart.getTime() + 24 * 60 * 60 * 1000); // next day
  } else {
    // All tasks have delay_factor <= new, so start after the last one
    const lastTask = tasks[tasks.length - 1];
    slotStart = new Date(lastTask.planned_end_date || lastTask.deadline_date);
    slotStart.setUTCHours(0, 0, 0, 0);
    slotStart = new Date(slotStart.getTime() + 24 * 60 * 60 * 1000);
  }

  // Now, simulate inserting the new workorder and count affected tasks
  let affected = 0;
  let currentStart = new Date(slotStart);
  let currentEnd = new Date(currentStart);
  currentEnd.setUTCDate(currentEnd.getUTCDate() + duration);
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const tStart = new Date(t.planned_start_date);
    if (tStart < currentEnd) {
      // This task would be pushed
      affected++;
      // Move this task to after the new workorder
      currentStart = new Date(currentEnd);
      currentEnd = new Date(currentStart);
      currentEnd.setUTCDate(currentEnd.getUTCDate() + (t.duration || 1));
    } else {
      // There is a gap, so the rest can stay
      currentStart = new Date(t.planned_end_date || t.deadline_date);
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
  // Simulate the rearrangement and collect affected task ids and new dates
  let currentStart = new Date(newEnd);
  let currentEnd = new Date(currentStart);
  let affectedTaskIds = [];
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const tStart = new Date(t.planned_start_date);
    // If this task starts before the current available slot, it must be pushed
    if (tStart < currentStart) {
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
      currentStart = new Date(t.planned_end_date || t.deadline_date);
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
