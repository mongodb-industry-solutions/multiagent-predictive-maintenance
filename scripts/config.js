// Example configuration for embedding and vector search indexing

// Number of dimensions for the embedding vectors. Read from an env var so it
// can be changed in a single place to match the selected embedding model.
const numDimensions = parseInt(process.env.EMBEDDING_DIMENSIONS, 10) || 1024;

const config = [
  {
    collection: "interviews",
    textFields: ["text"],
    embeddingField: "embedding",
    indexName: "default",
    similarity: "cosine",
    numDimensions,
  },
  {
    collection: "manuals",
    textFields: ["section", "text"],
    embeddingField: "embedding",
    indexName: "default",
    similarity: "cosine",
    numDimensions,
  },
  {
    collection: "workorders",
    textFields: ["title", "instructions", "root_cause", "observations"],
    embeddingField: "embedding",
    indexName: "default",
    similarity: "cosine",
    numDimensions,
  },
];
export default config;
