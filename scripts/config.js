// Example configuration for embedding and vector search indexing
const config = [
  {
    collection: "interviews",
    textFields: ["text"],
    embeddingField: "embedding",
    indexName: "default",
    similarity: "cosine",
    numDimensions: 1024,
  },
  {
    collection: "manuals",
    textFields: ["section", "text"],
    embeddingField: "embedding",
    indexName: "default",
    similarity: "cosine",
    numDimensions: 1024,
  },
  {
    collection: "workorders",
    textFields: ["title", "instructions", "root_cause", "observations"],
    embeddingField: "embedding",
    indexName: "default",
    similarity: "cosine",
    numDimensions: 1024,
  },
];
export default config;
