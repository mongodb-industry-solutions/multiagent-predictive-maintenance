import "dotenv/config";
import getMongoClientPromise, {
  closeMongoClient,
} from "../src/integrations/mongodb/client.js";

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function padTaskId(num) {
  return num.toString().padStart(4, "0");
}

function addDaysUTC(date, days) {
  // date is a Date object in UTC
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

async function main() {
  const months = parseInt(process.argv[2], 10);
  if (isNaN(months) || months < 1) {
    console.error("Usage: npm run generate_calendar <number of months>");
    process.exit(1);
  }

  const client = await getMongoClientPromise();
  const db = client.db(process.env.DATABASE_NAME);
  const collection = db.collection("production_calendar");

  // Delete all existing documents
  await collection.deleteMany({});
  console.log("Cleared existing production_calendar data.");

  // Generate tasks
  const now = new Date();
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const endDate = new Date(
    Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + months, 0)
  );

  let currentDate = new Date(startDate);
  let taskNum = getRandomInt(100, 1000);
  let tasks = [];
  let prevEndDate = new Date(currentDate);

  let taskIndex = 0;
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  let lastLoggedPercent = -1;
  while (currentDate <= endDate) {
    // Random gap between 0 and 2 days
    let gap = getRandomInt(0, 2);
    if (taskIndex === 0) gap = 0; // No gap for first task
    currentDate = addDaysUTC(prevEndDate, gap);
    if (currentDate > endDate) break;

    // Duration 1-5 days
    const duration = getRandomInt(1, 5);
    const initialStartDate = setToUTCMidnight(currentDate);
    const plannedStartDate = setToUTCMidnight(currentDate);
    const plannedEndDate = addDaysUTC(plannedStartDate, duration);
    const deadlineBase = addDaysUTC(initialStartDate, duration * 2);
    const deadlineDate = setToUTCMidnight(
      addDaysUTC(deadlineBase, getRandomInt(0, 3))
    );
    const piecesToProduce = getRandomInt(500, 5000);

    let delayFactor, priority;
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
      duration: duration,
      delay_factor: delayFactor,
      priority: priority,
      pieces_to_produce: piecesToProduce,
    };
    tasks.push(task);
    prevEndDate = addDaysUTC(initialStartDate, duration);
    taskNum++;
    taskIndex++;
    // Progress logging
    const percent = Math.floor(
      ((currentDate - startDate) / (endDate - startDate)) * 100
    );
    if (percent !== lastLoggedPercent && percent % 5 === 0) {
      process.stdout.write(
        `\rGenerating tasks: ${percent}% (${taskIndex} tasks)`
      );
      lastLoggedPercent = percent;
    }
  }
  process.stdout.write(`\rGenerating tasks: 100% (${taskIndex} tasks)\n`);

  if (tasks.length > 0) {
    await collection.insertMany(tasks);
    console.log(`Inserted ${tasks.length} production tasks.`);
  } else {
    console.log("No tasks generated.");
  }

  await closeMongoClient();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in generate_production_calendar script:", err);
  closeMongoClient().finally(() => process.exit(1));
});
