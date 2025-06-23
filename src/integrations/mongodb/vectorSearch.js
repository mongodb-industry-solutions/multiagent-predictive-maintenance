import { clientPromise } from "./client.js";
import { generateEmbedding } from "../bedrock/embeddings.js";

/**
 * Perform a vector similarity search using Bedrock embeddings and MongoDB Atlas Vector Search.
 *
 * @param {string} query - The query string to search for.
 * @param {object} dbConfig - The MongoDB vector search configuration.
 * @param {string} dbConfig.collection - The name of the MongoDB collection to search in.
 * @param {string} dbConfig.indexName - The name of the vector index to use.
 * @param {string} dbConfig.textKey - The key for the text field in the collection.
 * @param {string} dbConfig.embeddingKey - The key for the embedding field in the collection.
 * @param {object} [options] - Optional parameters (e.g., filter, etc.)
 * @param {number} [n=10] - The number of results to return.
 * @returns {Promise<Array>} List of search results with similarity scores.
 */
export async function vectorSearch(query, dbConfig, n = 10, options = {}) {
  if (!dbConfig || !dbConfig.collection) {
    throw new Error("dbConfig with a valid collection string is required");
  }
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME);
  const collection = db.collection(dbConfig.collection);

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Build the vector search pipeline
  const pipeline = [
    {
      $vectorSearch: {
        index: dbConfig.indexName || "default",
        path: dbConfig.embeddingKey || "embedding",
        queryVector: queryEmbedding,
        numCandidates: options.numCandidates || n * 20,
        limit: n,
        ...(options.filter ? { filter: options.filter } : {}),
      },
    },
    {
      $project: {
        _id: 0,
        score: { $meta: "vectorSearchScore" },
        [dbConfig.textKey || "embedding_text"]: 1,
        ...(options.project || {}),
      },
    },
  ];

  try {
    const results = await collection.aggregate(pipeline).toArray();
    return results;
  } catch (error) {
    console.error("Error performing vector search:", error);
    throw error;
  }
}

/**
 * Create a vector search index on a MongoDB collection.
 * @param {string} collectionName - The MongoDB collection name.
 * @param {string} embeddingField - The field to index as a vector.
 * @param {string} indexName - The name of the index (default: "default").
 * @param {string} similarity - The similarity metric (default: "dotProduct").
 * @param {number} numDimensions - The number of embedding dimensions (default: 1536).
 * @returns {Promise<object>} The result of index creation.
 */
export async function createVectorSearchIndex(
  collectionName,
  embeddingField,
  indexName = "default",
  similarity = "dotProduct",
  numDimensions = 1536
) {
  const client = await clientPromise;
  const db = client.db(process.env.DATABASE_NAME);
  const collection = db.collection(collectionName);
  const index = {
    name: indexName,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: embeddingField,
          similarity,
          numDimensions,
        },
      ],
    },
  };
  try {
    const indexes = await collection.indexes();
    if (!indexes.some((idx) => idx.name === indexName)) {
      const result = await collection.createSearchIndex(index);
      console.log(
        `Created vector search index '${indexName}' on '${collectionName}':`,
        result
      );
      return result;
    } else {
      console.log(
        `Index '${indexName}' already exists on '${collectionName}'.`
      );
      return null;
    }
  } catch (error) {
    console.error(
      `Error creating vector search index on ${collectionName}:`,
      error
    );
    throw error;
  }
}
