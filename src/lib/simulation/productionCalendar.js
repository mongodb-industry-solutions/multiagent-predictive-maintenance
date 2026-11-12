import getMongoClientPromise from "../../integrations/mongodb/client.js";

export const PRODUCTION_CALENDAR_COLLECTION = "production_calendar";

const LOCK_LEASE_MS = 60 * 1000;
const DEPLOY_TARGET_ENVIRONMENTS = new Set(["staging", "production"]);

let verifiedDeploymentKeyInProcess = null;
let activeSyncPromise = null;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function padTaskId(num) {
  return num.toString().padStart(4, "0");
}

function addDaysUTC(date, days) {
  const d = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days
    )
  );
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function setToUTCMidnight(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Build production calendar tasks starting at the 1st of the current UTC month
 * for the requested number of `months`.
 */
export function buildProductionCalendarTasks(
  months,
  { deploymentId, onProgress } = {}
) {
  if (!Number.isInteger(months) || months < 1) {
    throw new Error(
      `Invalid number of months (${months}); expected an integer >= 1.`
    );
  }

  const now = new Date();
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const endDate = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + months, 0)
  );

  let currentDate = new Date(startDate);
  let taskNum = getRandomInt(100, 1000);
  const tasks = [];
  let prevEndDate = new Date(currentDate);
  let taskIndex = 0;
  let lastLoggedPercent = -1;

  while (currentDate <= endDate) {
    let gap = getRandomInt(0, 2);
    if (taskIndex === 0) gap = 0;
    currentDate = addDaysUTC(prevEndDate, gap);
    if (currentDate > endDate) break;

    const duration = getRandomInt(1, 5);
    const initialStartDate = setToUTCMidnight(currentDate);
    const plannedStartDate = setToUTCMidnight(currentDate);
    const plannedEndDate = addDaysUTC(plannedStartDate, duration);
    const randomFactor = 2 + Math.random() * 2;
    const deadlineOffsetDays = Math.round(duration * randomFactor);
    const deadlineDate = addDaysUTC(plannedStartDate, deadlineOffsetDays);
    const piecesToProduce = getRandomInt(500, 5000);

    let delayFactor;
    let priority;
    if (taskIndex < 2) {
      delayFactor = 0;
      priority = "high";
    } else {
      delayFactor = getRandomInt(1, 3);
      priority = delayFactor === 1 ? "medium" : "low";
    }

    const task = {
      task_id: `PROD-${padTaskId(taskNum)}`,
      task_type: "production",
      initial_start_date: initialStartDate,
      planned_start_date: plannedStartDate,
      planned_end_date: plannedEndDate,
      deadline_date: deadlineDate,
      duration,
      delay_factor: delayFactor,
      priority,
      pieces_to_produce: piecesToProduce,
    };

    if (deploymentId) {
      task.deployment_id = deploymentId;
    }

    tasks.push(task);

    prevEndDate = addDaysUTC(initialStartDate, duration);
    taskNum += 1;
    taskIndex += 1;

    if (onProgress && endDate > startDate) {
      const percent = Math.floor(
        ((currentDate - startDate) / (endDate - startDate)) * 100
      );
      if (percent !== lastLoggedPercent && percent % 5 === 0) {
        onProgress({ percent, count: taskIndex, done: false });
        lastLoggedPercent = percent;
      }
    }
  }

  if (onProgress) {
    onProgress({ percent: 100, count: taskIndex, done: true });
  }

  return tasks;
}

/**
 * Regenerate `production_calendar` for `months` months without leaving the
 * collection empty mid-swap: inserts new tasks first, then removes prior docs.
 */
export async function replaceProductionCalendar(
  db,
  months,
  { deploymentId, onProgress } = {}
) {
  const collection = db.collection(PRODUCTION_CALENDAR_COLLECTION);
  const tasks = buildProductionCalendarTasks(months, {
    deploymentId,
    onProgress,
  });

  if (tasks.length === 0) {
    await collection.deleteMany({});
    return { insertedCount: 0, deletedCount: 0 };
  }

  const insertResult = await collection.insertMany(tasks);
  const keepIds = Object.values(insertResult.insertedIds);
  const deleteResult = await collection.deleteMany({
    _id: { $nin: keepIds },
  });

  return {
    insertedCount: insertResult.insertedCount,
    deletedCount: deleteResult.deletedCount,
  };
}

/**
 * Regenerate `production_calendar` strictly once per staging/production deployment,
 * using `deployment_id` stamped directly on `production_calendar` tasks (no extra collection).
 *
 * - Runs ONLY when `NEXT_PUBLIC_ENV` is `staging` or `production`, `DEPLOYMENT_ID`
 *   is injected by CI/CD, and `PRODUCTION_CALENDAR_MONTHS` is configured (>= 1).
 * - Never runs on local `npm run dev`, `npm start`, or Docker Compose.
 * - Never re-runs on pod restarts or scaling within the same release because existing
 *   `production_calendar` tasks already carry `deployment_id === DEPLOYMENT_ID`.
 */
export async function syncProductionCalendarForDeployment() {
  const envName = process.env.NEXT_PUBLIC_ENV?.trim();
  const deploymentId = process.env.DEPLOYMENT_ID?.trim();
  const months = parseInt(process.env.PRODUCTION_CALENDAR_MONTHS ?? "", 10);

  if (
    !DEPLOY_TARGET_ENVIRONMENTS.has(envName) ||
    !deploymentId ||
    !Number.isInteger(months) ||
    months < 1
  ) {
    return { skipped: true, reason: "not_a_managed_deployment" };
  }

  const cacheKey = `${envName}:${deploymentId}`;
  if (verifiedDeploymentKeyInProcess === cacheKey) {
    return { skipped: true, reason: "already_verified_in_process" };
  }

  const dbName = process.env.DATABASE_NAME;
  if (!dbName) {
    throw new Error("DATABASE_NAME environment variable is required but not set");
  }

  const client = await getMongoClientPromise();
  const db = client.db(dbName);
  const collection = db.collection(PRODUCTION_CALENDAR_COLLECTION);

  const alreadySynced = await collection.findOne(
    { deployment_id: deploymentId },
    { projection: { _id: 1 } }
  );
  if (alreadySynced) {
    verifiedDeploymentKeyInProcess = cacheKey;
    return {
      skipped: true,
      environment: envName,
      deploymentId,
      reason: "already_generated_for_deployment",
    };
  }

  // Coordinate across concurrent pods (if any) using an existing calendar doc
  // that will be deleted as soon as the new tasks are inserted.
  const anchorDoc = await collection.findOne({}, { projection: { _id: 1 } });
  if (anchorDoc) {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + LOCK_LEASE_MS);
    const claimed = await collection.findOneAndUpdate(
      {
        _id: anchorDoc._id,
        deployment_id: { $ne: deploymentId },
        $or: [
          { _syncLockUntil: { $exists: false } },
          { _syncLockUntil: { $lt: now } },
        ],
      },
      { $set: { _syncLockUntil: leaseUntil } },
      { returnDocument: "after" }
    );

    if (!claimed) {
      return {
        skipped: true,
        environment: envName,
        deploymentId,
        reason: "locked_or_completed_by_peer",
      };
    }
  }

  try {
    const { insertedCount, deletedCount } = await replaceProductionCalendar(
      db,
      months,
      { deploymentId }
    );

    verifiedDeploymentKeyInProcess = cacheKey;
    console.log(
      `[production-calendar] Generated ${insertedCount} tasks for the next ${months} months (replaced ${deletedCount} prior docs) on ${envName} deployment '${deploymentId}'.`
    );

    return {
      skipped: false,
      environment: envName,
      deploymentId,
      months,
      tasksGenerated: insertedCount,
    };
  } catch (error) {
    if (anchorDoc) {
      await collection
        .updateOne({ _id: anchorDoc._id }, { $unset: { _syncLockUntil: "" } })
        .catch(() => {});
    }
    throw error;
  }
}

export function triggerDeploymentCalendarSync() {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = syncProductionCalendarForDeployment()
    .catch((err) => {
      console.error(
        "[production-calendar] Deployment calendar sync error:",
        err?.message || err
      );
      return { error: err?.message || "Deployment calendar sync failed" };
    })
    .finally(() => {
      activeSyncPromise = null;
    });

  return activeSyncPromise;
}
