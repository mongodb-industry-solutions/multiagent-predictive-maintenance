import "dotenv/config";
import path from "path";
import config from "./config.js";
import { clientPromise } from "../src/integrations/mongodb/client.js";
import { generateEmbedding } from "../src/integrations/bedrock/embeddings.js";
import { createVectorSearchIndex } from "../src/integrations/mongodb/vectorSearch.js";

async function embedCollection({
  collection: collectionName,
  textFields,
  embeddingField,
  indexName,
  similarity,
  numDimensions,
}) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME);
  const collection = db.collection(collectionName);
  const cursor = collection.find({});
  const concurrency = 5; // Tune this for your API rate limits
  const docs = await cursor.toArray();
  let processed = 0;

  // Progress bar setup
  const total = docs.length;
  function printProgress() {
    const percent = Math.floor((processed / total) * 100);
    const bar =
      "[" + "#".repeat(percent / 2) + "-".repeat(50 - percent / 2) + "]";
    process.stdout.write(
      `\r${collectionName} ${bar} ${percent}% (${processed}/${total})`
    );
    if (processed === total) process.stdout.write("\n");
  }

  async function processDoc(doc) {
    const text = textFields.map((f) => doc[f] || "").join("\n\n");
    if (!text.trim()) return;
    try {
      const embedding = await generateEmbedding(text);
      await collection.updateOne(
        { _id: doc._id },
        { $set: { [embeddingField]: embedding } }
      );
      processed++;
      printProgress();
    } catch (err) {
      console.error(
        `\n[${collectionName}] Error embedding doc _id=${doc._id}:`,
        err
      );
    }
  }

  // Parallelize with concurrency limit
  for (let i = 0; i < docs.length; i += concurrency) {
    const batch = docs.slice(i, i + concurrency).map(processDoc);
    await Promise.all(batch);
  }
  printProgress();
  await createVectorSearchIndex(
    collectionName,
    embeddingField,
    indexName,
    similarity,
    numDimensions
  );
}

async function main() {
  for (const colConfig of config) {
    await embedCollection(colConfig);
  }
  console.log("All collections processed.");
  // Close MongoDB connection and exit
  const client = await clientPromise;
  await client.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in embedding script:", err);
  process.exit(1);
});
