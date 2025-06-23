require("dotenv").config();

// Script to embed documents and create vector search indexes for specified collections
const path = require("path");
const config = require("./config.js");
const { clientPromise } = require("../src/integrations/mongodb/client");
const { generateEmbedding } = require("../src/integrations/bedrock/embeddings");
const {
  createVectorSearchIndex,
} = require("../src/integrations/mongodb/vectorSearch");

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
}

main().catch((err) => {
  console.error("Fatal error in embedding script:", err);
  process.exit(1);
});
