// Client API wrapper for Agentic Audit Trail endpoints

async function readNdjson(res, onEvent) {
  if (!res.body) {
    throw new Error("Audit Trail request returned an empty response");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;
  let streamError = null;

  const take = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const event = JSON.parse(trimmed);
    if (event.type === "result") result = event;
    else if (event.type === "error") {
      streamError = new Error(event.message || "Audit Trail request failed");
    } else if (onEvent) {
      onEvent(event);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach(take);
  }
  if (buffer.trim()) take(buffer);
  if (streamError) throw streamError;
  if (!result) throw new Error("Audit Trail stream ended without a result");
  return result;
}

async function postAuditTrail(
  body,
  { onEvent, stream = false, fallbackMessage = "Audit Trail request failed" } = {}
) {
  const res = await fetch("/api/audit-trail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") || "";
  if (!stream || contentType.includes("application/json")) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || fallbackMessage);
    return data;
  }
  if (!res.ok) throw new Error(fallbackMessage);
  return readNdjson(res, onEvent);
}

export async function fetchAuditTrailStatus({ signal } = {}) {
  const res = await fetch("/api/audit-trail", { cache: "no-store", signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch Audit Trail status");
  }
  return data;
}

export async function captureInterventionStep({
  scenarioKey,
  dataSource = "leafy",
  factorySnapshot = null,
  onEvent,
}) {
  return postAuditTrail(
    {
      action: "capture_context",
      scenario_key: scenarioKey,
      data_source: dataSource,
      factory_snapshot: factorySnapshot,
    },
    {
      onEvent,
      stream: true,
      fallbackMessage: "Failed to capture intervention and context",
    }
  );
}

export async function checkPolicyAndRetrieveStep({ interventionId, onEvent }) {
  return postAuditTrail(
    {
      action: "check_policy_and_retrieve",
      intervention_id: interventionId,
    },
    {
      onEvent,
      stream: true,
      fallbackMessage: "Failed to check policy and retrieve governed SOPs",
    }
  );
}

export async function draftAndRouteStep({ interventionId, onEvent }) {
  return postAuditTrail(
    {
      action: "draft_and_route",
      intervention_id: interventionId,
    },
    {
      onEvent,
      stream: true,
      fallbackMessage: "Failed to draft Change Record",
    }
  );
}

export async function submitHumanReviewSignature({
  interventionId,
  decision,
  reviewerName,
  reviewerRole,
  signerUserId,
  signingPin,
  rationale,
}) {
  return postAuditTrail(
    {
      action: "submit_review",
      intervention_id: interventionId,
      decision,
      reviewer_name: reviewerName,
      reviewer_role: reviewerRole,
      signer_user_id: signerUserId,
      signing_pin: signingPin,
      rationale,
    },
    {
      stream: false,
      fallbackMessage: "Failed to apply electronic signature",
    }
  );
}

export async function closeAuditLoopStep({ interventionId, onEvent }) {
  return postAuditTrail(
    {
      action: "close_loop",
      intervention_id: interventionId,
    },
    {
      onEvent,
      stream: true,
      fallbackMessage: "Failed to verify outcomes and close the loop",
    }
  );
}

export async function fetchAuditLineage(interventionId) {
  return postAuditTrail(
    {
      action: "get_lineage",
      intervention_id: interventionId,
    },
    {
      stream: false,
      fallbackMessage: "Failed to load MongoDB audit lineage",
    }
  );
}

export async function testMongoSchemaGuard() {
  return postAuditTrail(
    {
      action: "test_schema_guard",
    },
    {
      stream: false,
      fallbackMessage: "Failed to run $jsonSchema guard test",
    }
  );
}
