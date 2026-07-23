import * as bedrockEmbeddings from "./bedrock/embeddings.js";
import { VoyageAIEmbeddings } from "./voyageai/embeddings.js";

/**
 * Available embedding providers keyed by name. Each entry builds an embedding
 * client exposing a `generateEmbedding(text, options)` method.
 */
const EMBEDDING_PROVIDERS = {
  bedrock: () => bedrockEmbeddings,
  voyage: () => new VoyageAIEmbeddings(),
};

/**
 * Singleton factory that resolves an embedding provider once and exposes a
 * provider-agnostic embedding interface to callers.
 */
class EmbeddingClientFactory {
  static #instance = null;

  #providerName;
  #client;

  constructor(providerName) {
    const create = EMBEDDING_PROVIDERS[providerName];
    if (!create) {
      throw new Error(
        `Unknown embedding provider "${providerName}". Expected one of: ${Object.keys(
          EMBEDDING_PROVIDERS
        ).join(", ")}.`
      );
    }
    this.#providerName = providerName;
    this.#client = create();
  }

  /**
   * Get the singleton factory instance. The provider parameter is only read
   * the first time the instance is created; later calls ignore it.
   * @param {string} [providerName] - "bedrock" or "voyage".
   * @returns {EmbeddingClientFactory}
   */
  static getInstance(providerName) {
    if (!EmbeddingClientFactory.#instance) {
      const selected =
        providerName || process.env.EMBEDDING_PROVIDER || "bedrock";
      EmbeddingClientFactory.#instance = new EmbeddingClientFactory(selected);
    }
    return EmbeddingClientFactory.#instance;
  }

  get providerName() {
    return this.#providerName;
  }

  createEmbeddingClient() {
    return this.#client;
  }

  generateEmbedding(text, options = {}) {
    return this.#client.generateEmbedding(text, options);
  }
}

export default EmbeddingClientFactory;

/**
 * Get the embedding client for the configured provider.
 * @returns {Object} Embedding client exposing generateEmbedding
 */
export function createEmbeddingClient() {
  return EmbeddingClientFactory.getInstance().createEmbeddingClient();
}

/**
 * Generate an embedding for a given text using the configured provider.
 * @param {string} text - The text to embed.
 * @param {object} [options] - Optional provider-specific options.
 * @returns {Promise<Array<number>>} The embedding vector.
 */
export function generateEmbedding(text, options = {}) {
  return EmbeddingClientFactory.getInstance().generateEmbedding(text, options);
}