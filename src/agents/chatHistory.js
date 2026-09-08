import "server-only";

import {
  isAIMessage,
  isHumanMessage,
  isToolMessage,
} from "@langchain/core/messages";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import getMongoClientPromise from "@/integrations/mongodb/client";

const RECENT_THREAD_LIMIT = 10;
const CHECKPOINT_SCAN_LIMIT = 40;

function messageContent(message) {
  if (typeof message?.content === "string") return message.content.trim();
  if (!Array.isArray(message?.content)) return "";
  return message.content
    .map((part) => {
      if (typeof part === "string") return part;
      return typeof part?.text === "string" ? part.text : "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function transcriptFrom(tuple) {
  const messages = tuple?.checkpoint?.channel_values?.messages;
  if (!Array.isArray(messages)) return [];
  const toolCalls = new Map();
  return messages.flatMap((message) => {
    const content = messageContent(message);
    if (isHumanMessage(message)) return [{ role: "user", content }];
    if (isAIMessage(message)) {
      if (message.tool_calls?.length) {
        message.tool_calls.forEach((call) => {
          toolCalls.set(call.id, {
            name: call.name,
            input: call.args || {},
          });
        });
        return [];
      }
      return content ? [{ role: "assistant", content }] : [];
    }
    if (isToolMessage(message)) {
      const call = toolCalls.get(message.tool_call_id) || {};
      return content
        ? [
            {
              role: "tool",
              name: message.name || call.name || "factory_tool",
              input: call.input || {},
              content,
            },
          ]
        : [];
    }
    return [];
  });
}

async function checkpointSaver() {
  const dbName = process.env.DATABASE_NAME;
  if (!dbName) throw new Error("DATABASE_NAME is required");
  const client = await getMongoClientPromise();
  return {
    client,
    saver: new MongoDBSaver({ client, dbName }),
    db: client.db(dbName),
  };
}

export async function getChatThread(threadId, agentId = "uns-chat") {
  if (!threadId.startsWith(`${agentId}:`)) return null;
  const { saver } = await checkpointSaver();
  const tuple = await saver.getTuple({
    configurable: { thread_id: threadId },
  });
  if (!tuple) return null;
  return {
    threadId,
    updatedAt: tuple.checkpoint?.ts || null,
    messages: transcriptFrom(tuple),
  };
}

export async function listRecentChatThreads(
  agentId = "uns-chat",
  limit = RECENT_THREAD_LIMIT
) {
  const { db, saver } = await checkpointSaver();
  const threadRows = await db
    .collection("checkpoints")
    .aggregate([
      { $match: { thread_id: { $regex: `^${agentId}:` } } },
      {
        $group: {
          _id: "$thread_id",
          latestCheckpointId: { $max: "$checkpoint_id" },
        },
      },
      { $sort: { latestCheckpointId: -1 } },
      { $limit: Math.min(Math.max(limit, 1), CHECKPOINT_SCAN_LIMIT) },
    ])
    .toArray();

  const threads = await Promise.all(
    threadRows.map(async ({ _id: threadId }) => {
      const tuple = await saver.getTuple({
        configurable: { thread_id: threadId },
      });
      if (!tuple) return null;
      const messages = transcriptFrom(tuple);
      const firstUser = messages.find((message) => message.role === "user");
      const lastAssistant = [...messages]
        .reverse()
        .find((message) => message.role === "assistant");
      return {
        threadId,
        title: firstUser?.content.slice(0, 72) || "Factory Chat session",
        preview: lastAssistant?.content.slice(0, 100) || "No answer yet",
        updatedAt: tuple.checkpoint?.ts || null,
        messageCount: messages.filter((message) => message.role !== "tool")
          .length,
      };
    })
  );

  return threads.filter(Boolean).slice(0, RECENT_THREAD_LIMIT);
}
