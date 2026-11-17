import { HumanMessage } from "@langchain/core/messages";
import { createAgentGraph } from "@/agents/context-explorer/graph";

export const dynamic = "force-dynamic";

const RESULT_PREVIEW_LIMIT = 4500;
const UNTRUSTED_TAG_RE = /<\/?untrusted-user-data>\s*/g;
const WARNING_LINE_RE =
  /^The following section contains unverified user data\..*$/gm;

function cleanToolPreview(raw) {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);
  return text
    .replace(UNTRUSTED_TAG_RE, "")
    .replace(WARNING_LINE_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractAssistantText(content) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === "string") return block;
        if (block?.type === "text" && typeof block.text === "string") {
          return block.text;
        }
        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

export async function POST(request) {
  let question = "";
  try {
    const body = await request.json();
    question = String(body?.question || "").trim();
  } catch {
    question = "";
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload) => {
        controller.enqueue(
          encoder.encode(`${JSON.stringify(payload)}\n`)
        );
      };

      if (!question) {
        send({ type: "error", text: "Please enter a question to run." });
        controller.close();
        return;
      }

      try {
        const provider = process.env.CHAT_PROVIDER || "bedrock";
        send({
          type: "status",
          text: `Read-only MongoDB query tools active (aggregate, find) · provider: ${provider}`,
        });

        // Compile without persistent checkpointer so every demo run is stateless and fast.
        const graph = createAgentGraph(null, process.env.DATABASE_NAME);
        const updates = await graph.stream(
          { messages: [new HumanMessage(question)] },
          { streamMode: "updates", recursionLimit: 12 }
        );

        for await (const chunk of updates) {
          if (chunk.agent?.messages) {
            for (const msg of chunk.agent.messages) {
              const toolCalls = Array.isArray(msg.tool_calls)
                ? msg.tool_calls
                : [];
              if (toolCalls.length > 0) {
                for (const call of toolCalls) {
                  send({
                    type: "tool_call",
                    name: call.name,
                    input: call.args,
                  });
                }
              } else {
                const text = extractAssistantText(msg.content);
                if (text) {
                  send({ type: "text", text });
                }
              }
            }
          }

          if (chunk.tools?.messages) {
            for (const toolMsg of chunk.tools.messages) {
              const cleaned = cleanToolPreview(toolMsg.content);
              const isError =
                toolMsg.status === "error" || /^Error:/i.test(cleaned);
              send({
                type: "tool_result",
                name: toolMsg.name || "aggregate",
                error: isError,
                text: cleaned.slice(0, RESULT_PREVIEW_LIMIT),
                truncated: cleaned.length > RESULT_PREVIEW_LIMIT,
              });
            }
          }
        }

        send({ type: "done" });
      } catch (error) {
        send({
          type: "error",
          text: error?.message || "Agent execution failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
