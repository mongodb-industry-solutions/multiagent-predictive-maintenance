// Configuration for embedding and vector search indexing for logistics demo
const config = [
  {
    collection: "shipment_qa_reports",
    textFields: ["text"],
    embeddingField: "embedding",
    indexName: "default",
    similarity: "cosine",
    numDimensions: 1024,
  },
];
export default config;
