import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import getMongoClientPromise, {
  closeMongoClient,
} from "../src/integrations/mongodb/client.js";

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
    "interviews.json",
    "inventory.json",
    "maintenance_staff.json",
    "manuals.json",
    "workorders.json",
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
  return new Promise((resolve, reject) => {
    const { spawn } = require("child_process");
    const proc = spawn(command, args, { stdio: "inherit", shell: true });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`${command} ${args.join(" ")} failed with code ${code}`)
        );
    });
  });
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
  logStep("Collections seeded. Running embedding script...");
  try {
    await runScript("npm", ["run", "embed"]);
    logStep(
      "Embedding completed. Running production calendar generation (6 months)..."
    );
    await runScript("npm", ["run", "generate_calendar", "6"]);
    logStep("Production calendar generated. Initial setup complete!");
  } catch (err) {
    logStep(`Error: ${err.message}`);
    if (err.message.includes("embed")) {
      logStep("Embedding failed. You can retry with: npm run embed");
    } else if (err.message.includes("generate_calendar")) {
      logStep(
        "Calendar generation failed. You can retry with: npm run generate_calendar 6"
      );
    }
    await closeMongoClient();
    process.exit(1);
  }
  await closeMongoClient();
  process.exit(0);
}

main().catch((err) => {
  logStep(`Fatal error: ${err.message}`);
  closeMongoClient().finally(() => process.exit(1));
});
