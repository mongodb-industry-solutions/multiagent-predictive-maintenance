import * as bedrockChat from "./bedrock/chat.js";
import * as groveChat from "./grove/chat.js";

/**
 * Available chat providers keyed by name.
 */
const CHAT_PROVIDERS = {
  bedrock: bedrockChat,
  grove: groveChat,
};

/**
 * Singleton factory that resolves a chat provider once and exposes a
 * provider-agnostic chat interface to callers.
 */
class ChatClientFactory {
  static #instance = null;

  #providerName;
  #provider;

  constructor(providerName) {
    const provider = CHAT_PROVIDERS[providerName];
    if (!provider) {
      throw new Error(
        `Unknown chat provider "${providerName}". Expected one of: ${Object.keys(
          CHAT_PROVIDERS
        ).join(", ")}.`
      );
    }
    this.#providerName = providerName;
    this.#provider = provider;
  }

  /**
   * Get the singleton factory instance. The provider parameter is only read
   * the first time the instance is created; later calls ignore it.
   * @param {string} [providerName] - "bedrock" or "grove".
   * @returns {ChatClientFactory}
   */
  static getInstance(providerName) {
    if (!ChatClientFactory.#instance) {
      const selected = providerName || process.env.CHAT_PROVIDER || "bedrock";
      ChatClientFactory.#instance = new ChatClientFactory(selected);
    }
    return ChatClientFactory.#instance;
  }

  get providerName() {
    return this.#providerName;
  }

  createChatClient() {
    return this.#provider.createChatClient();
  }

  invokeChat(messages) {
    return this.#provider.invokeChat(messages);
  }

  streamChat(messages) {
    return this.#provider.streamChat(messages);
  }
}

export default ChatClientFactory;

/**
 * Create a chat client using the configured provider.
 * @returns {Object} Initialized chat client
 */
export function createChatClient() {
  return ChatClientFactory.getInstance().createChatClient();
}

/**
 * Send messages to the configured chat provider and get a response.
 * @param {Array} messages - Array of messages in LangChain format
 * @returns {Promise<Object>} Response from the model
 */
export function invokeChat(messages) {
  return ChatClientFactory.getInstance().invokeChat(messages);
}

/**
 * Stream responses from the configured chat provider.
 * @param {Array} messages - Array of messages in LangChain format
 * @returns {Promise<AsyncIterable>} Stream of responses
 */
export function streamChat(messages) {
  return ChatClientFactory.getInstance().streamChat(messages);
}