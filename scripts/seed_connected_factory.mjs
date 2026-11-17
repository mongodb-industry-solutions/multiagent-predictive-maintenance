import "dotenv/config";
import getMongoClientPromise, {
  closeMongoClient,
} from "../src/integrations/mongodb/client.js";
import {
  CF_COLLECTIONS,
  CF_VECTOR_INDEX_NAME,
  seedConnectedFactoryData,
} from "../src/lib/connectedFactory/seedData.js";

function log(msg) {
  process.stdout.write(`[seed:context] ${msg}\n`);
}

async function waitForVectorIndexReady(maxWaitMs = 45000) {
  const client = await getMongoClientPromise();
  const db = client.db(process.env.DATABASE_NAME);
  const collection = db.collection(CF_COLLECTIONS.EXCURSIONS);
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    try {
      const indexes = await collection.listSearchIndexes().toArray();
      const found = indexes.find((idx) => idx.name === CF_VECTOR_INDEX_NAME);
      if (found?.queryable || found?.status === "READY") {
        log(
          `Vector index '${CF_VECTOR_INDEX_NAME}' on '${CF_COLLECTIONS.EXCURSIONS}' is READY (queryable=${Boolean(
            found.queryable
          )}).`
        );
        return true;
      }
      log(
        `Waiting for '${CF_VECTOR_INDEX_NAME}' to finish building (status=${
          found?.status || "PENDING"
        })...`
      );
    } catch (err) {
      log(`Could not poll search index status: ${err.message}`);
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  log(
    `Vector index '${CF_VECTOR_INDEX_NAME}' is still building on Atlas; it will become queryable shortly.`
  );
  return false;
}

async function main() {
  // Default is strictly additive/idempotent (force=false); pass --force to refresh LTW-04 records.
  const force = process.argv.includes("--force");
  log(`Starting Connected Factory Context Explorer setup (force=${force})...`);
  const summary = await seedConnectedFactoryData({
    force,
    onProgress: log,
  });

  if (summary.skipped) {
    log("All Connected Factory collections and indexes are already provisioned.");
  } else {
    log(`Provisioned Connected Factory records: ${JSON.stringify(summary.counts)}`);
    log(
      `Live signature sanity check: ${summary.liveSignatureBins} bins, peak ${summary.livePeakTempC} degC`
    );
  }

  await waitForVectorIndexReady();
  await closeMongoClient();
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[seed:context] Fatal error: ${err.message}\n`);
  closeMongoClient().finally(() => process.exit(1));
});
