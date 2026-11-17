import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { createChatClient, invokeChat } from "@/integrations/chat_factory.js";
import { createActivityLog } from "@/lib/contestable/activityLog.js";
import { getAuditScenarioByKey } from "@/lib/auditTrail/scenarios.js";
import { StateAnnotation } from "./state.js";
import {
  executeEpisodicRecall,
  executeGovernedRetrieval,
  getTools,
} from "./tools.js";

const tools = getTools();
const toolNode = new ToolNode(tools);

function extractJson(text = "") {
  const trimmed = String(text).trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlock) {
    return JSON.parse(codeBlock[1].trim());
  }
  const objMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objMatch) {
    return JSON.parse(objMatch[0]);
  }
  return JSON.parse(trimmed);
}

export async function runGovernedRetrievalStep({
  recordDoc,
  scenarioKey,
  log,
}) {
  const activity = log || createActivityLog();
  const scenario = getAuditScenarioByKey(scenarioKey || recordDoc?.scenario_key);
  const intervention = recordDoc?.intervention || {};
  const policyEvaluation = recordDoc?.policy_evaluation || {};

  const ragQuery =
    scenario.rag_query ||
    `${policyEvaluation.classification || "change"} on ${intervention.machine_id} ${intervention.parameter} for ${intervention.product}`;

  const ragRunId = await activity.toolStart("retrieve_governed_procedures", {
    index: "change_procedures_governed_idx",
    query: ragQuery,
    prefilter: {
      status: "approved",
      site: intervention.site,
      station: intervention.machine_id,
      product: [intervention.product, "ALL"],
    },
  });

  const governedRequirements = await executeGovernedRetrieval({
    query: ragQuery,
    site: intervention.site,
    station: intervention.machine_id,
    product: intervention.product,
    limit: 3,
  });

  await activity.toolEnd(ragRunId, "retrieve_governed_procedures", {
    retrieval_method: governedRequirements.retrieval_method,
    approved_matches: governedRequirements.approved_procedures.map(
      (p) => `${p.doc_id} v${p.version} (score ${p.score})`
    ),
    excluded_uncontrolled: governedRequirements.excluded_uncontrolled_docs.map(
      (p) => `${p.doc_id} v${p.version} [${p.status}]`
    ),
  });

  const recallRunId = await activity.toolStart("recall_prior_interventions", {
    collection: "change_records",
    machine_id: intervention.machine_id,
    product: intervention.product,
    parameter: intervention.parameter,
  });

  const episodicRecall = await executeEpisodicRecall({
    station: intervention.machine_id,
    product: intervention.product,
    parameter: intervention.parameter,
    scenarioKey: scenario.key,
    excludeInterventionId: recordDoc?.intervention_id,
    limit: 2,
  });

  await activity.toolEnd(recallRunId, "recall_prior_interventions", {
    recalled_count: episodicRecall.length,
    precedents: episodicRecall.map(
      (r) => `${r.intervention_id} (${r.status}: ${r.change})`
    ),
  });

  return {
    governed_requirements: governedRequirements,
    episodic_recall: episodicRecall,
  };
}

export async function runDraftChangeRecordStep({
  recordDoc,
  scenarioKey,
  log,
}) {
  const activity = log || createActivityLog();
  const scenario = getAuditScenarioByKey(scenarioKey || recordDoc?.scenario_key);
  const intervention = recordDoc?.intervention || {};
  const policyEvaluation = recordDoc?.policy_evaluation || {};
  const reconstructedContext = recordDoc?.reconstructed_context || {};
  const governedRequirements = recordDoc?.governed_requirements || {};
  const episodicRecall = recordDoc?.episodic_recall || [];

  const systemPrompt = `You are the Documentation Agent at Leafy Factory.
Your role is bounded:
1. You DO NOT decide whether a parameter change is permitted — deterministic control rules have already classified this event as "${policyEvaluation.classification}" (routing_mode="${policyEvaluation.routing_mode}").
2. You DO NOT approve deviations — human sign-off belongs to the Quality Engineer.
3. Write a concise, clear Change Record grounded strictly in the captured shopfloor context, approved SOPs, and recalled historical outcomes. Keep each field short (1–2 clear sentences) and free of filler.`;

  const userPrompt = `INTERVENTION ID: ${recordDoc?.intervention_id}
INTERVENTION EVENT:
${JSON.stringify(intervention, null, 2)}

OPERATIONAL CONTEXT:
${JSON.stringify(
    {
      order_context: reconstructedContext.order_context,
      material_spec: reconstructedContext.material_spec,
      recipe_envelope: reconstructedContext.recipe_envelope,
      telemetry_window: reconstructedContext.telemetry_window,
      shift_intervention_count: reconstructedContext.shift_intervention_count,
    },
    null,
    2
  )}

DETERMINISTIC POLICY EVALUATION:
${JSON.stringify(policyEvaluation, null, 2)}

GOVERNED SOP RETRIEVAL:
${JSON.stringify(governedRequirements, null, 2)}

PRIOR SIMILAR INTERVENTIONS:
${JSON.stringify(episodicRecall, null, 2)}

Return ONLY valid JSON with this exact shape:
{
  "change_summary": "1-2 clear sentences stating which agent acted, what setpoint changed on LTW-04, and the current PLC state.",
  "impact_assessment": "1-2 clear sentences evaluating thermal/quality/security impact using the material limit and recalled precedent.",
  "compliance_rationale": "1-2 clear sentences citing the approved SOP/Policy IDs + versions and noting which superseded/draft versions were excluded.",
  "recommended_actions": [
    "Short action 1",
    "Short action 2",
    "Short action 3"
  ]
}`;

  await activity.addMessage("system", systemPrompt);
  await activity.addMessage("user", userPrompt);

  const draftRunId = await activity.toolStart("draft_change_record", {
    intervention_id: recordDoc?.intervention_id,
    classification: policyEvaluation.classification,
    routing_mode: policyEvaluation.routing_mode,
  });

  const fallbackDraft = scenario.fallback_draft;

  try {
    const response = await invokeChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ]);

    const rawText =
      typeof response?.content === "string"
        ? response.content
        : Array.isArray(response?.content)
          ? response.content.map((part) => part.text || "").join("")
          : "";

    await activity.addMessage("assistant", rawText);
    const parsed = extractJson(rawText);

    const draftRecord = {
      authored_by: "Documentation Agent",
      generated_via: "llm_governed_synthesis",
      change_summary:
        typeof parsed?.change_summary === "string" &&
        parsed.change_summary.trim()
          ? parsed.change_summary.trim()
          : fallbackDraft.change_summary,
      impact_assessment:
        typeof parsed?.impact_assessment === "string" &&
        parsed.impact_assessment.trim()
          ? parsed.impact_assessment.trim()
          : fallbackDraft.impact_assessment,
      compliance_rationale:
        typeof parsed?.compliance_rationale === "string" &&
        parsed.compliance_rationale.trim()
          ? parsed.compliance_rationale.trim()
          : fallbackDraft.compliance_rationale,
      recommended_actions:
        Array.isArray(parsed?.recommended_actions) &&
        parsed.recommended_actions.length >= 2
          ? parsed.recommended_actions.map((item) => String(item))
          : fallbackDraft.recommended_actions,
    };

    await activity.toolEnd(draftRunId, "draft_change_record", {
      authored_by: draftRecord.authored_by,
      recommended_actions: draftRecord.recommended_actions.length,
    });

    return draftRecord;
  } catch (error) {
    console.warn("Documentation Agent LLM fallback:", error?.message);
    await activity.toolError(
      draftRunId,
      "draft_change_record",
      error?.message || "Model unavailable; using deterministic template"
    );
    await activity.addStatus(
      "fallback",
      "Used deterministic Change Record template because the completion model was unreachable."
    );
    return {
      authored_by: "Documentation Agent",
      generated_via: "deterministic_template_fallback",
      ...fallbackDraft,
    };
  }
}

export async function runDocumentationAgent({ recordDoc, scenarioKey, log }) {
  const retrieval = await runGovernedRetrievalStep({
    recordDoc,
    scenarioKey,
    log,
  });
  const draftRecord = await runDraftChangeRecordStep({
    recordDoc: { ...recordDoc, ...retrieval },
    scenarioKey,
    log,
  });
  return {
    ...retrieval,
    draft_record: draftRecord,
  };
}

export async function callModel(state) {
  const model = createChatClient().bindTools(tools);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are the Documentation Agent for Leafy Factory's EV Module Assembly Line (Station LTW-04 Laser Tab Welding).
You help engineering and quality teams inspect shopfloor AI interventions, retrieve approved SOPs/Control Plans/OT Security Policies (filtering out superseded or draft versions via governed $vectorSearch), and recall prior intervention outcomes from MongoDB change_records.
Always distinguish deterministic policy rules from AI-drafted documentation, and remind reviewers when an out-of-range deviation requires a Quality Engineer electronic signature.`,
    ],
    new MessagesPlaceholder("messages"),
  ]);

  const formattedPrompt = await prompt.formatMessages({
    messages: state.messages,
  });

  try {
    const result = await model.invoke(formattedPrompt);
    return { messages: [result] };
  } catch (error) {
    console.error("Error calling Documentation Agent:", error);
    return {
      messages: [
        {
          role: "ai",
          content:
            "I encountered an error while running the Documentation Agent. Please check your model provider configuration and try again.",
        },
      ],
    };
  }
}

export function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "__end__";
}

export function createAgentGraph(client, dbName) {
  const builder = new StateGraph(StateAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  let checkpointer = null;
  if (client && dbName) {
    checkpointer = new MongoDBSaver({ client, dbName });
  }

  const graph = builder.compile({ checkpointer });
  graph.name = "Documentation Agent";
  return graph;
}
