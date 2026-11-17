import crypto from "crypto";
import {
  AUDIT_AGENT_REGISTRY,
  AUDIT_COLLECTIONS,
  AUDIT_SHOPFLOOR,
  RECIPE_CONTROL_ENVELOPES,
} from "./constants.js";
import { getAuditScenarioByKey } from "./scenarios.js";

function canonicalizeForHash(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeForHash);
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        if (value[key] !== undefined) {
          acc[key] = canonicalizeForHash(value[key]);
        }
        return acc;
      }, {});
  }
  return value;
}

export function computeEvidenceSha256(payload) {
  const canonical = JSON.stringify(canonicalizeForHash(payload));
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

async function resolveLiveLeafyOrderContext(scenario) {
  try {
    const { listActiveOrders, getProductionUnits } = await import(
      "../factory/serverFactoryClient.js"
    );
    const activeOrders = await listActiveOrders();
    const matchingOrder =
      activeOrders.find((order) =>
        String(order?.product_name || order?.product_code || "").includes(
          scenario.product
        )
      ) || activeOrders[0];

    if (!matchingOrder) return null;

    let latestUnit = null;
    try {
      const units = await getProductionUnits({
        orderId: matchingOrder.order_id,
        limit: 5,
      });
      latestUnit = units[0] || null;
    } catch {
      latestUnit = null;
    }

    const cellIds =
      Array.isArray(latestUnit?.cells) && latestUnit.cells.length > 0
        ? latestUnit.cells
            .slice(0, 4)
            .map((c) => c?.cell_id ?? c)
            .filter(Boolean)
        : [73, 74, 75, 76];

    return {
      origin: "leafy_factory_live_api",
      order_id: String(matchingOrder.order_id || "ORD-LIVE-01"),
      mes_order_id: String(
        matchingOrder.mes_order_id || `MES-${matchingOrder.order_id || "123456"}`
      ),
      batch_unit_id: String(
        latestUnit?.unit_id ||
          latestUnit?.serial_number ||
          `MOD-${scenario.product.slice(-4)}-${matchingOrder.order_id || "01"}`
      ),
      customer: matchingOrder.customer || "Leafy EV Powertrain GmbH",
      planned_qty: Number(matchingOrder.quantity || 40),
      status: matchingOrder.status || "running",
      cell_ids: cellIds,
    };
  } catch {
    return null;
  }
}

function resolveSnapshotOrderContext(factorySnapshot, scenario) {
  if (!factorySnapshot || typeof factorySnapshot !== "object") return null;
  const orders = Array.isArray(factorySnapshot.orders)
    ? factorySnapshot.orders
    : [];
  const active =
    factorySnapshot.selectedOrder ||
    orders.find((o) => o?.status === "running") ||
    orders[0];
  if (!active) return null;

  const units = Array.isArray(factorySnapshot.productionUnits)
    ? factorySnapshot.productionUnits
    : [];
  const unit =
    factorySnapshot.liveProductionUnit ||
    units.find((u) => u?.order_id === active.order_id) ||
    units[0];

  const cellIds =
    Array.isArray(unit?.cells) && unit.cells.length > 0
      ? unit.cells
          .slice(0, 4)
          .map((c) => c?.cell_id ?? c)
          .filter(Boolean)
      : [41, 42, 43, 44];

  return {
    origin: "local_factory_simulation",
    order_id: String(active.order_id || "LOCAL-DEMO-001"),
    mes_order_id: String(active.mes_order_id || "MES-LOCAL-1001"),
    batch_unit_id: String(
      unit?.unit_id ||
        unit?.serial_number ||
        `MOD-${scenario.product.slice(-4)}-B${unit?.batch_id || 16}`
    ),
    customer: active.customer || "Leafy EV Module Line (Sim)",
    planned_qty: Number(active.quantity || 20),
    status: active.status || "running",
    cell_ids: cellIds,
  };
}

/**
 * Deterministic Context Reconstruction
 * Pulls operational evidence from MongoDB (`materials`, `telemetry`, `workorders`, `alerts`, `change_records`)
 * alongside live Leafy Factory or Local Simulation order state.
 */
export async function reconstructInterventionContext({
  db,
  scenarioKey,
  dataSource = "leafy",
  factorySnapshot = null,
}) {
  const scenario = getAuditScenarioByKey(scenarioKey);
  const recipe =
    RECIPE_CONTROL_ENVELOPES[scenario.product] ||
    RECIPE_CONTROL_ENVELOPES["EV-PM-4C-S"];

  const [materialDoc, recentTelemetry, prodOrderSpan, recentAlerts, dbPriorTrims] =
    await Promise.all([
      db
        .collection("materials")
        .findOne(
          { materialMaster: scenario.material_master },
          { projection: { _id: 0 } }
        )
        .catch(() => null),
      db
        .collection("telemetry")
        .find(
          {
            "metadata.machine_id": AUDIT_SHOPFLOOR.machineId,
            "metadata.signal": "weld-zone-temp",
          },
          { projection: { _id: 0, ts: 1, value: 1, metadata: 1 } }
        )
        .sort({ ts: -1 })
        .limit(24)
        .toArray()
        .catch(() => []),
      db
        .collection("workorders")
        .findOne(
          {
            machine_id: AUDIT_SHOPFLOOR.machineId,
            orderType: "production",
            product: scenario.product,
          },
          { projection: { _id: 0 } }
        )
        .catch(() => null),
      db
        .collection("alerts")
        .find(
          { machine_id: AUDIT_SHOPFLOOR.machineId },
          {
            projection: {
              _id: 0,
              alert_id: 1,
              err_code: 1,
              err_name: 1,
              priority: 1,
              ts: 1,
            },
          }
        )
        .sort({ ts: -1 })
        .limit(3)
        .toArray()
        .catch(() => []),
      db
        .collection(AUDIT_COLLECTIONS.CHANGE_RECORDS)
        .countDocuments({
          "intervention.machine_id": AUDIT_SHOPFLOOR.machineId,
          "intervention.product": scenario.product,
          "intervention.parameter": scenario.parameter,
          is_seed_precedent: { $ne: true },
        })
        .catch(() => 0),
    ]);

  let orderContext = null;
  if (dataSource === "leafy") {
    orderContext = await resolveLiveLeafyOrderContext(scenario);
  }
  if (!orderContext) {
    orderContext = resolveSnapshotOrderContext(factorySnapshot, scenario);
  }
  if (!orderContext) {
    orderContext = {
      origin: prodOrderSpan ? "mongodb_workorders_span" : "seeded_uns_context",
      order_id: prodOrderSpan?.workOrder || "WO-1001234",
      mes_order_id:
        prodOrderSpan?.mesOrderId || prodOrderSpan?.legacyRef || "MES-123456",
      batch_unit_id:
        scenario.product === "EV-PM-4C-P"
          ? "MOD-4C-P-0419"
          : "MOD-4C-S-0818",
      customer: "Leafy EV Powertrain GmbH",
      planned_qty: prodOrderSpan?.plannedQty || 100,
      operator_id: prodOrderSpan?.operatorId || "A. Vogel",
      status: "running",
      cell_ids: [101, 102, 103, 104],
    };
  }

  const effectiveMesOrderId = scenario.unbind_mes_order
    ? ""
    : orderContext.mes_order_id;
  const effectiveBatchUnitId = scenario.unbind_mes_order
    ? "UNBOUND"
    : orderContext.batch_unit_id;

  const materialSpec = materialDoc || {
    materialMaster: scenario.material_master,
    name:
      scenario.material_master === "MAT-AL-030"
        ? "AA1050 high-purity aluminum cathode tab"
        : "Nickel-plated C11000 copper tab foil",
    supplier: scenario.material_master === "MAT-AL-030" ? "Hydro" : "Aurubis",
    thicknessMm: scenario.material_master === "MAT-AL-030" ? "0.30" : "0.20",
    maxShieldO2Ppm: scenario.material_master === "MAT-AL-030" ? 60 : 80,
    maxWeldTempC: scenario.material_master === "MAT-AL-030" ? 215 : 230,
  };

  const dbTemps = recentTelemetry
    .map((doc) => Number(doc?.value))
    .filter((v) => Number.isFinite(v));

  const telemetryWindow = {
    source_collection: "telemetry",
    db_samples_inspected: dbTemps.length,
    uns_topic: AUDIT_SHOPFLOOR.unsTopic,
    window_span_sec: 240,
    pre_peak_temp_c: scenario.telemetry_override.pre_peak_temp_c,
    pre_mean_temp_c: scenario.telemetry_override.pre_mean_temp_c,
    latest_db_temp_c: dbTemps.length > 0 ? dbTemps[0] : null,
    shield_gas_flow_lpm: scenario.telemetry_override.shield_gas_flow_lpm,
    shield_o2_ppm: scenario.telemetry_override.shield_o2_ppm,
    vibration_mm_s: scenario.telemetry_override.vibration_mm_s,
    curve_preview: scenario.telemetry_override.curve_preview,
  };

  const prodAgentManifest =
    scenario.credential_override ||
    AUDIT_AGENT_REGISTRY[scenario.agent_id] || {
      agent_id: scenario.agent_id,
      display_name: scenario.agent_id,
      credential_type: "Unverified",
      authorized: false,
      model_version: "unknown",
      policy_version: "UNCONTROLLED",
    };

  const docAgentManifest = AUDIT_AGENT_REGISTRY.documentation_agent;

  const shiftTrimCount = Math.max(
    scenario.prior_shift_trims,
    scenario.key === "out_of_bounds_deviation" ? 2 : Math.min(dbPriorTrims, 1)
  );

  return {
    agents: {
      production_agent: {
        agent_id: prodAgentManifest.agent_id,
        display_name: prodAgentManifest.display_name,
        credential_type: prodAgentManifest.credential_type,
        authorized: Boolean(prodAgentManifest.authorized),
        model_version: prodAgentManifest.model_version,
        policy_version: prodAgentManifest.policy_version,
      },
      documentation_agent: {
        agent_id: docAgentManifest.agent_id,
        display_name: docAgentManifest.display_name,
        credential_type: docAgentManifest.credential_type,
        model_version: docAgentManifest.model_version,
        policy_version: docAgentManifest.policy_version,
      },
      quality_engineer: null,
    },
    intervention: {
      site: AUDIT_SHOPFLOOR.site,
      line: AUDIT_SHOPFLOOR.line,
      station: AUDIT_SHOPFLOOR.station,
      machine_id: AUDIT_SHOPFLOOR.machineId,
      uns_topic: AUDIT_SHOPFLOOR.unsTopic,
      order_id: orderContext.order_id,
      mes_order_id: effectiveMesOrderId,
      batch_unit_id: effectiveBatchUnitId,
      product: scenario.product,
      material_master: scenario.material_master,
      recipe_id: recipe.recipe_id,
      parameter: scenario.parameter,
      parameter_label:
        scenario.parameter_label ||
        recipe.parameters[scenario.parameter]?.label ||
        scenario.parameter,
      unit: scenario.unit,
      before_value: scenario.before_value,
      proposed_value: scenario.proposed_value,
      delta: Number(
        (scenario.proposed_value - scenario.before_value).toFixed(2)
      ),
      applied_value: null,
      trigger_reason: scenario.trigger_reason,
      execution_state: "captured_pending_policy",
    },
    reconstructed_context: {
      data_source_mode: dataSource,
      order_context: {
        ...orderContext,
        mes_order_id: effectiveMesOrderId || null,
        batch_unit_id: effectiveBatchUnitId,
      },
      material_spec: materialSpec,
      recipe_envelope: {
        recipe_id: recipe.recipe_id,
        product_name: recipe.product_name,
        parameter_bounds: recipe.parameters[scenario.parameter],
      },
      telemetry_window: telemetryWindow,
      shift_intervention_count: shiftTrimCount,
      recent_alerts: recentAlerts.map((al) => ({
        alert_id: al.alert_id || al.err_code || "ALT-LTW04",
        err_code: al.err_code || "W-TEMP-01",
        err_name: al.err_name || "Weld-zone thermal alarm",
        priority: al.priority ?? 2,
        ts:
          al.ts instanceof Date ? al.ts.toISOString() : String(al.ts || ""),
      })),
      mongodb_collections_joined: [
        "telemetry",
        "materials",
        "workorders",
        "alerts",
        "change_records",
      ],
    },
  };
}

/**
 * Deterministic Control Policy Check
 * Pure rule evaluation — never delegated to an LLM.
 */
export function evaluateControlPolicy({
  agents,
  intervention,
  reconstructedContext,
}) {
  const registeredAgent =
    AUDIT_AGENT_REGISTRY[agents?.production_agent?.agent_id] || null;
  const bounds =
    reconstructedContext?.recipe_envelope?.parameter_bounds || null;
  const materialSpec = reconstructedContext?.material_spec || {};
  const telemetry = reconstructedContext?.telemetry_window || {};
  const shiftCount = Number(
    reconstructedContext?.shift_intervention_count ?? 0
  );

  const hasOrderBinding = Boolean(
    agents?.production_agent?.agent_id &&
      intervention?.machine_id &&
      intervention?.parameter &&
      Number.isFinite(intervention?.before_value) &&
      Number.isFinite(intervention?.proposed_value) &&
      intervention?.mes_order_id &&
      intervention.mes_order_id !== "UNBOUND"
  );

  const isAgentAuthorized = Boolean(
    registeredAgent &&
      registeredAgent.authorized &&
      registeredAgent.can_write_plc_in_bounds &&
      registeredAgent.allowed_stations.includes(intervention.machine_id) &&
      registeredAgent.allowed_parameters.includes(intervention.parameter)
  );

  const withinMinMax = bounds
    ? intervention.proposed_value >= bounds.min &&
      intervention.proposed_value <= bounds.max
    : false;
  const absDelta = Math.abs(
    intervention.proposed_value - intervention.before_value
  );
  const withinStepDelta = bounds ? absDelta <= bounds.max_auto_delta : false;
  const withinRecipeEnvelope = withinMinMax && withinStepDelta;

  const withinShiftFrequency = bounds
    ? shiftCount < bounds.max_shift_trims
    : true;

  const shieldGasSafe =
    intervention.parameter === "shield_gas_flow_lpm"
      ? bounds
        ? intervention.proposed_value >= bounds.min
        : false
      : Number(telemetry.shield_gas_flow_lpm ?? 18) >= 14.0;

  const rules = [
    {
      rule_id: "R1",
      label: "Registered OT Agent Credential",
      passed: isAgentAuthorized,
      severity: isAgentAuthorized ? "pass" : "critical",
      detail: isAgentAuthorized
        ? `${agents.production_agent.display_name} verified (${agents.production_agent.credential_type}).`
        : `${agents?.production_agent?.display_name || "External script"} is not authorized to change ${intervention.parameter_label}.`,
    },
    {
      rule_id: "R2",
      label: "Active MES Order & Batch Binding",
      passed: hasOrderBinding && shieldGasSafe,
      severity: hasOrderBinding && shieldGasSafe ? "pass" : "critical",
      detail:
        hasOrderBinding && shieldGasSafe
          ? `Bound to ${intervention.mes_order_id} (${intervention.batch_unit_id}) within ${materialSpec.materialMaster} safety limits.`
          : !hasOrderBinding
            ? "Missing active MES order binding (unbound external command)."
            : `Violates ${bounds?.min} ${intervention.unit} oxidation floor for ${materialSpec.materialMaster}.`,
    },
    {
      rule_id: "R3",
      label: "Pre-Validated Recipe / PAR Window",
      passed: withinRecipeEnvelope,
      severity: withinRecipeEnvelope ? "pass" : "warning",
      detail: bounds
        ? withinRecipeEnvelope
          ? `${intervention.proposed_value} ${intervention.unit} is within PAR [${bounds.min}, ${bounds.max}] ${intervention.unit}.`
          : `${intervention.proposed_value} ${intervention.unit} exceeds PAR [${bounds.min}, ${bounds.max}] ${intervention.unit} window.`
        : "No recipe window found.",
    },
    {
      rule_id: "R4",
      label: "Shift Autonomous Adjustment Limit",
      passed: withinShiftFrequency,
      severity: withinShiftFrequency ? "pass" : "warning",
      detail: bounds
        ? withinShiftFrequency
          ? `${shiftCount} of ${bounds.max_shift_trims} autonomous shift trims used.`
          : `${shiftCount} of ${bounds.max_shift_trims} trims already used this shift — escalate recurring drift.`
        : "Shift limit N/A.",
    },
  ];

  let classification = "routine_adjustment";
  let classification_label = "Within Pre-Validated PAR";
  let risk_level = "low";
  let routing_mode = "automated";
  let execution_state = "applied_in_bounds";
  let applied_value = intervention.proposed_value;

  if (!isAgentAuthorized || !hasOrderBinding || !shieldGasSafe) {
    classification = "prohibited_intervention";
    classification_label = "Blocked at OT Gate";
    risk_level = "critical";
    routing_mode = "security_quarantine";
    execution_state = "blocked_at_ot_gate";
    applied_value = intervention.before_value;
  } else if (!withinRecipeEnvelope || !withinShiftFrequency) {
    classification = "controlled_deviation";
    classification_label = "Out of Range · Hold for Sign-Off";
    risk_level = "high";
    routing_mode = "human_esignature";
    execution_state = "paused_pending_esignature";
    applied_value = null;
  }

  return {
    policy_version: "CHG-POL-2026.04",
    all_passed: rules.every((rule) => rule.passed),
    classification,
    classification_label,
    risk_level,
    routing_mode,
    execution_state,
    applied_value,
    rules,
  };
}
