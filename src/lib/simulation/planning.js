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

function toUtcMidnight(value) {
  const date = new Date(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function addUtcDays(date, days) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days
    )
  );
}

function normalizeDurationDays(duration) {
  const numeric = Number(duration);
  if (!Number.isFinite(numeric) || numeric < 1) {
    return 1;
  }
  return Math.ceil(numeric);
}

function normalizeCalendarTask(task) {
  const start = toUtcMidnight(task.planned_start_date);
  const duration = normalizeDurationDays(task.duration);
  const end = addUtcDays(start, duration);
  return { task, start, end, duration };
}

function insertIntervalSorted(intervals, interval) {
  let idx = intervals.length;
  while (idx > 0 && intervals[idx - 1].start > interval.start) {
    idx -= 1;
  }
  intervals.splice(idx, 0, interval);
}

/**
 * Find the earliest half-open UTC day interval [start, start + duration) with
 * start >= minStart that does not overlap any interval in blockedIntervals
 * (sorted ascending by start).
 */
function findEarliestFreeSlot(minStart, duration, blockedIntervals) {
  let candidateStart = toUtcMidnight(minStart);
  let candidateEnd = addUtcDays(candidateStart, duration);

  for (const interval of blockedIntervals) {
    if (interval.start >= candidateEnd) {
      break;
    }
    if (interval.end > candidateStart) {
      candidateStart = new Date(interval.end);
      candidateEnd = addUtcDays(candidateStart, duration);
    }
  }

  return { start: candidateStart, end: candidateEnd };
}

/**
 * Compute an optimal non-overlapping schedule for a new maintenance work order
 * without modifying input task objects or affecting past/active/fixed tasks.
 *
 * All task dates are modeled as half-open UTC day intervals [start, end), where
 * end = start + duration days:
 * - Past tasks (end <= today) are strictly immutable and ignored.
 * - Active tasks (start <= today < end), existing maintenance tasks, and future
 *   tasks with delay_factor <= delayFactor are fixed in place.
 * - The maintenance task is placed in the earliest slot >= today that does not
 *   overlap any fixed task (today if today is free, or immediately after any
 *   currently running task).
 * - Movable future tasks are only shifted forward if they collide with the new
 *   maintenance task or an earlier shifted task, naturally absorbing existing
 *   calendar gaps and hopping over fixed tasks without creating overlaps.
 *
 * @param {Array} calendarTasks - Production calendar task documents
 * @param {number} duration - Duration in days (>= 1)
 * @param {number} [delayFactor=0] - Priority delay factor (0 = highest priority)
 * @param {Date|string} [referenceDate=new Date()] - Reference date for "today"
 * @returns {{ startDate: Date, endDate: Date, updates: Array, affectedCount: number }}
 */
export function planMaintenanceSchedule(
  calendarTasks,
  duration,
  delayFactor = 0,
  referenceDate = new Date()
) {
  const today = toUtcMidnight(referenceDate);
  const normalizedDuration = normalizeDurationDays(duration);
  const normalizedDelayFactor = Number.isFinite(Number(delayFactor))
    ? Number(delayFactor)
    : 0;

  const fixedIntervals = [];
  const movableEntries = [];

  for (const rawTask of calendarTasks || []) {
    if (!rawTask?.planned_start_date) continue;
    const entry = normalizeCalendarTask(rawTask);

    // Past tasks (exclusive end <= today) are strictly untouched.
    if (entry.end <= today) {
      continue;
    }

    const isActive = entry.start <= today && today < entry.end;
    const isMaintenance = rawTask.task_type === "maintenance";
    const isHigherOrEqualPriority =
      typeof rawTask.delay_factor === "number" &&
      rawTask.delay_factor <= normalizedDelayFactor;

    if (isActive || isMaintenance || isHigherOrEqualPriority) {
      fixedIntervals.push({ start: entry.start, end: entry.end });
    } else {
      movableEntries.push(entry);
    }
  }

  fixedIntervals.sort((a, b) => a.start - b.start);
  movableEntries.sort(
    (a, b) =>
      a.start - b.start ||
      String(a.task.task_id || "").localeCompare(String(b.task.task_id || ""))
  );

  // Place the new maintenance work order in the earliest free slot >= today.
  const maintenanceSlot = findEarliestFreeSlot(
    today,
    normalizedDuration,
    fixedIntervals
  );

  // Track all occupied intervals (fixed tasks + new maintenance + placed movable tasks).
  const occupied = [...fixedIntervals];
  insertIntervalSorted(occupied, {
    start: maintenanceSlot.start,
    end: maintenanceSlot.end,
  });

  const updates = [];
  for (const entry of movableEntries) {
    const slot = findEarliestFreeSlot(entry.start, entry.duration, occupied);
    insertIntervalSorted(occupied, { start: slot.start, end: slot.end });

    if (
      slot.start.getTime() !== entry.start.getTime() ||
      slot.end.getTime() !== entry.end.getTime()
    ) {
      updates.push({
        _id: entry.task._id,
        task_id: entry.task.task_id,
        previous_start_date: entry.start,
        planned_start_date: slot.start,
        planned_end_date: slot.end,
      });
    }
  }

  return {
    startDate: maintenanceSlot.start,
    endDate: maintenanceSlot.end,
    updates,
    affectedCount: updates.length,
  };
}

/**
 * Find the optimal start date and number of affected tasks for a new workorder.
 * @param {Array} calendarTasks - Array of production calendar tasks
 * @param {number} duration - Duration in days of the new workorder
 * @param {number} [delayFactor=0] - Delay factor of the new workorder (0 = highest priority)
 * @param {Date|string} [referenceDate=new Date()] - Reference date for "today"
 * @returns {{ start_date: Date, affected_tasks: number }}
 */
export function findProductionSlot(
  calendarTasks,
  duration,
  delayFactor = 0,
  referenceDate = new Date()
) {
  const plan = planMaintenanceSchedule(
    calendarTasks,
    duration,
    delayFactor,
    referenceDate
  );
  return {
    start_date: plan.startDate,
    affected_tasks: plan.affectedCount,
  };
}

/**
 * Schedules a new maintenance workorder, updates affected tasks, and inserts the new task into the production calendar.
 * @param {Array} tasks - Array of production calendar tasks (active and future)
 * @param {Object} db - MongoDB database instance
 * @param {Object} maintenanceTask - The maintenance task object to insert
 * @param {number} duration - Duration in days
 * @param {number} [delayFactor=0] - Delay factor
 * @param {Date|string} [referenceDate=new Date()] - Reference date for "today"
 * @returns {Promise<{start_date: string, end_date: string, affected_tasks: number, maintenance_task_id: string|null}>}
 */
export async function scheduleMaintenanceWorkOrder(
  tasks,
  db,
  maintenanceTask,
  duration,
  delayFactor = 0,
  referenceDate = new Date()
) {
  const collection = db.collection("production_calendar");
  const normalizedDuration = normalizeDurationDays(duration);
  const normalizedDelayFactor = Number.isFinite(Number(delayFactor))
    ? Number(delayFactor)
    : 0;

  const plan = planMaintenanceSchedule(
    tasks,
    normalizedDuration,
    normalizedDelayFactor,
    referenceDate
  );

  if (plan.updates.length > 0) {
    await collection.bulkWrite(
      plan.updates.map((update) => ({
        updateOne: {
          filter: { _id: update._id },
          update: {
            $set: {
              planned_start_date: update.planned_start_date,
              planned_end_date: update.planned_end_date,
            },
          },
        },
      })),
      { ordered: false }
    );
  }

  const priority =
    maintenanceTask?.priority ??
    (normalizedDelayFactor <= 0
      ? "high"
      : normalizedDelayFactor === 1
      ? "medium"
      : "low");

  const maintenanceDoc = {
    ...maintenanceTask,
    task_type: "maintenance",
    planned_start_date: plan.startDate,
    planned_end_date: plan.endDate,
    initial_start_date: plan.startDate,
    duration: normalizedDuration,
    delay_factor: normalizedDelayFactor,
    priority,
  };
  const insertResult = await collection.insertOne(maintenanceDoc);
  return {
    start_date: plan.startDate.toISOString().slice(0, 10),
    end_date: plan.endDate.toISOString().slice(0, 10),
    affected_tasks: plan.affectedCount,
    maintenance_task_id:
      maintenanceDoc.task_id || insertResult.insertedId || null,
  };
}
