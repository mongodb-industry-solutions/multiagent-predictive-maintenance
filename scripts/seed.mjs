import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { execa } from "execa";
import getMongoClientPromise, {
  closeMongoClient,
} from "../src/integrations/mongodb/client.js";
import { createTimeSeriesCollection } from "../src/integrations/mongodb/timeSeries.js";

async function logStep(msg) {
  process.stdout.write(`\n[seed] ${msg}\n`);
}

async function checkDbEmpty(db) {
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    if (count > 0) return false;
  }
  return true;
}

async function createCollectionsFromData(db) {
  const dataDir = path.resolve("data");
  const files = [
    "shipments.json",
    "warehouses.json",
    "carriers.json",
    "incidents.json",
    "shipment_qa_reports.json",
  ];
  for (const file of files) {
    const colName = path.basename(file, ".json");
    logStep(`Seeding collection: ${colName}`);
    const filePath = path.join(dataDir, file);
    const raw = await fs.readFile(filePath, "utf8");
    const docs = JSON.parse(raw);
    if (!Array.isArray(docs))
      throw new Error(`${file} does not contain a JSON array.`);
    if (docs.length === 0) continue;
    await db.collection(colName).insertMany(docs);
    process.stdout.write(
      `[seed] Inserted ${docs.length} docs into ${colName}\n`
    );
  }
}

async function runScript(command, args = []) {
  try {
    await execa(command, args, { stdio: "inherit" });
  } catch (err) {
    throw new Error(
      `${command} ${args.join(" ")} failed with code ${err.exitCode}`
    );
  }
}

async function main() {
  logStep("Connecting to MongoDB...");
  const client = await getMongoClientPromise();
  const db = client.db(process.env.DATABASE_NAME);
  logStep(`Checking if database '${process.env.DATABASE_NAME}' is empty...`);
  const isEmpty = await checkDbEmpty(db);
  if (!isEmpty) {
    logStep(
      "Database already contains documents. This script is for first-time setup only.\nIf you want to reinitialize, please remove existing collections or use the embed/generate_calendar scripts individually."
    );
    await closeMongoClient();
    process.exit(1);
  }
  logStep("Database is empty. Seeding collections from data/...");
  await createCollectionsFromData(db);
  logStep("Creating telemetry time series collection...");
  await createTimeSeriesCollection("telemetry", {
    expireAfterSeconds: 86400,
    timeseries: {
      timeField: "ts",
      metaField: "metadata",
      granularity: "minutes",
      bucketMaxSpanSeconds: 86400,
    },
  });
  
  logStep("Logistics data seeded successfully! 🚚📦");
  logStep("Note: Embeddings and calendar generation skipped for now.");
  logStep("You can run them separately when needed:");
  logStep("  npm run embed");
  logStep("  npm run generate_calendar 6");
  
  /*
  // Commenting out embeddings and calendar for now - will configure later
  logStep("Collections seeded. Running embedding script...");
  let currentStep = "embed";
  try {
    await runScript("npm", ["run", "embed"]);
    logStep(
      "Embedding completed. Running production calendar generation (6 months)..."
    );
    currentStep = "generate_calendar";
    await runScript("npm", ["run", "generate_calendar", "6"]);
    logStep("Production calendar generated. Initial setup complete!");
  } catch (err) {
    logStep(`Error: ${err.message}`);
    if (currentStep === "embed") {
      logStep("Embedding failed. You can retry with: npm run embed");
    } else if (currentStep === "generate_calendar") {
      logStep(
        "Calendar generation failed. You can retry with: npm run generate_calendar 6"
      );
    } else {
      logStep("You can try running the failed step manually.");
    }
    await closeMongoClient();
    process.exit(1);
  }
  */
  await closeMongoClient();
  process.exit(0);
}

main().catch((err) => {
  logStep(`Fatal error: ${err.message}`);
  closeMongoClient().finally(() => process.exit(1));
});
