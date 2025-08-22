import getMongoClientPromise from "./client.js";

/**
 * Create a time series collection in MongoDB.
 * @param {string} collectionName - Name of the collection to create.
 * @param {object} options - Options for the time series collection.
 * @returns {Promise<void>}
 */
export async function createTimeSeriesCollection(collectionName, options) {
  const client = await getMongoClientPromise();
  const dbName = process.env.DATABASE_NAME;
  if (!dbName)
    throw new Error(
      "DATABASE_NAME environment variable is required but not set"
    );
  const db = client.db(dbName);
  // Check if collection exists
  const collections = await db
    .listCollections({ name: collectionName })
    .toArray();
  if (collections.length > 0) {
    // Already exists, do nothing
    return;
  }
  await db.createCollection(collectionName, options);
}
