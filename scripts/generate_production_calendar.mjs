import "dotenv/config";
import getMongoClientPromise, {
  closeMongoClient,
} from "../src/integrations/mongodb/client.js";
import { replaceProductionCalendar } from "../src/lib/simulation/productionCalendar.js";

async function main() {
  const months = parseInt(process.argv[2], 10);
  if (isNaN(months) || months < 1) {
    console.error("Usage: npm run generate_calendar <number of months>");
    process.exit(1);
  }

  const client = await getMongoClientPromise();
  const db = client.db(process.env.DATABASE_NAME);

  const { insertedCount, deletedCount } = await replaceProductionCalendar(
    db,
    months,
    {
      onProgress: ({ percent, count, done }) => {
        process.stdout.write(
          `\rGenerating tasks: ${percent}% (${count} tasks)${done ? "\n" : ""}`
        );
      },
    }
  );

  console.log(`Cleared ${deletedCount} existing production_calendar task(s).`);
  if (insertedCount > 0) {
    console.log(`Inserted ${insertedCount} production tasks.`);
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
