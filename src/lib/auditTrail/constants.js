export const AUDIT_COLLECTIONS = {
  CHANGE_RECORDS: "change_records",
  CHANGE_RECORD_REVISIONS: "change_record_revisions",
  CHANGE_PROCEDURES: "change_procedures",
};

export const CHANGE_PROCEDURES_VECTOR_INDEX = "change_procedures_governed_idx";

export const AUDIT_SHOPFLOOR = {
  site: "leafy_factory",
  siteLabel: "Leafy Factory",
  line: "ev_module_assembly",
  lineLabel: "EV Module Assembly Line",
  area: "welding",
  station: "Laser Tab Welding",
  machineId: "LTW-04",
  unsTopic: "factory/ev-line/stations/Laser-Tab-Welding",
};

export const AUDIT_WORKFLOW_STEPS = [
  { id: "capture", label: "Capture & context" },
  { id: "policy", label: "Policy & SOPs" },
  { id: "review", label: "Review & sign" },
  { id: "outcome", label: "Outcome & audit trail" },
];

export const RECIPE_CONTROL_ENVELOPES = {
  "EV-PM-4C-S": {
    recipe_id: "RCP-LTW04-CU-3.2",
    product: "EV-PM-4C-S",
    product_name: "EV Power Module 4-Cell Standard",
    material_master: "MAT-CU-020",
    parameters: {
      laser_power_w: {
        label: "Laser Weld Power",
        unit: "W",
        min: 1380,
        nominal: 1450,
        max: 1500,
        max_auto_delta: 60,
        max_shift_trims: 2,
      },
      shield_gas_flow_lpm: {
        label: "Argon Shield Gas Flow",
        unit: "L/min",
        min: 14.0,
        nominal: 18.0,
        max: 22.0,
        max_auto_delta: 2.0,
        max_shift_trims: 2,
      },
    },
  },
  "EV-PM-4C-P": {
    recipe_id: "RCP-LTW04-AL-2.8",
    product: "EV-PM-4C-P",
    product_name: "EV Power Module 4-Cell Performance",
    material_master: "MAT-AL-030",
    parameters: {
      laser_power_w: {
        label: "Laser Weld Power",
        unit: "W",
        min: 1390,
        nominal: 1460,
        max: 1500,
        max_auto_delta: 50,
        max_shift_trims: 2,
      },
      shield_gas_flow_lpm: {
        label: "Argon Shield Gas Flow",
        unit: "L/min",
        min: 15.0,
        nominal: 18.5,
        max: 22.0,
        max_auto_delta: 2.0,
        max_shift_trims: 2,
      },
    },
  },
};

export const AUDIT_AGENT_REGISTRY = {
  production_agent: {
    agent_id: "production_agent",
    display_name: "Production Agent",
    credential_type: "OT mTLS Certificate",
    authorized: true,
    allowed_stations: ["LTW-04"],
    allowed_parameters: ["laser_power_w"],
    can_write_plc_in_bounds: true,
    can_approve_qms: false,
    model_version: "leafy-mpc-2.4",
    policy_version: "CHG-POL-2026.04",
  },
  documentation_agent: {
    agent_id: "documentation_agent",
    display_name: "Documentation Agent",
    credential_type: "QMS Draft Service Credential",
    authorized: true,
    allowed_stations: ["LTW-04"],
    allowed_parameters: [],
    can_write_plc_in_bounds: false,
    can_approve_qms: false,
    model_version: process.env.COMPLETION_MODEL || "configured-chat-model",
    policy_version: "CHG-POL-2026.04",
  },
  quality_engineer: {
    agent_id: "quality_engineer",
    display_name: "Quality Engineer",
    user_id: "e.rostova@leafy-factory.com",
    default_reviewer_name: "Elena Rostova",
    default_reviewer_role: "Lead Quality Engineer",
    credential_type: "21 CFR Part 11 E-Signature",
    authorized: true,
    allowed_stations: ["LTW-04"],
    allowed_parameters: ["laser_power_w", "shield_gas_flow_lpm"],
    can_write_plc_in_bounds: false,
    can_approve_qms: true,
    model_version: "human-reviewer",
    policy_version: "CHG-POL-2026.04",
  },
};

export const GMP_ALIGNMENT_PILLARS = [
  {
    id: "alcoa-attributable",
    standard: "ALCOA+ · 21 CFR 11.10(b)",
    principle: "Attributable & Accurate Records",
    gmpRequirement:
      "Every automated or human action must record a verified actor identity, station, batch, and before/after values.",
    mongoCapability: "Strict $jsonSchema Validation",
    mongoDetail:
      "MongoDB enforces validationLevel: 'strict' on change_records, rejecting unattributed or malformed writes at the database layer (Code 121).",
  },
  {
    id: "annex11-sops",
    standard: "EU GMP Annex 11 (Sec. 10) · ISO 9001",
    principle: "Document & Procedure Control",
    gmpRequirement:
      "Shopfloor decisions and change dossiers may only cite currently effective, QA-approved procedures—never drafts or obsolete versions.",
    mongoCapability: "Pre-Filtered Atlas $vectorSearch",
    mongoDetail:
      "Metadata pre-filtering (status='approved', site, station, product) excludes draft and superseded SOPs before vector similarity ranking.",
  },
  {
    id: "part11-audit-trail",
    standard: "21 CFR 11.10(e) · Annex 11 (Sec. 9)",
    principle: "Contemporaneous, Append-Only Audit Trail",
    gmpRequirement:
      "Computer-generated, time-stamped audit trails must preserve who changed what, when, and why without overwriting prior states.",
    mongoCapability: "ACID Transactions + Document Versioning",
    mongoDetail:
      "Each lifecycle step atomically updates change_records and inserts an immutable, SHA-256 hash-chained snapshot + field diff in change_record_revisions.",
  },
  {
    id: "part11-esignature",
    standard: "21 CFR 11.50, 11.70, 11.200 · ICH Q8",
    principle: "PAR Boundaries & Linked E-Signatures",
    gmpRequirement:
      "In-PAR trims verify automatically; out-of-PAR deviations hold the PLC and require a 2-factor e-signature displaying name, UTC time, and meaning.",
    mongoCapability: "Cryptographically Bound Subdocuments & $lookup",
    mongoDetail:
      "Signature manifestations hash-link to the exact record revision, and single-query $lookup reconstructs the full batch change history on demand.",
  },
];

export const AUDIT_AGENTS = [
  {
    id: "production_agent",
    short: "Production",
    label: "Production Agent",
    icon: "Sparkle",
    kind: "agent",
    steps: ["capture"],
  },
  {
    id: "documentation_agent",
    short: "Documentation",
    label: "Documentation Agent",
    icon: "Sparkle",
    kind: "agent",
    steps: ["capture", "policy", "review", "outcome"],
  },
  {
    id: "quality_engineer",
    short: "Engineer",
    label: "Quality Engineer",
    icon: "Person",
    kind: "human",
    steps: ["review"],
  },
];

export const CHANGE_RECORDS_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: [
      "intervention_id",
      "schema_version",
      "v",
      "status",
      "agents",
      "intervention",
      "created_at",
    ],
    properties: {
      intervention_id: {
        bsonType: "string",
        minLength: 4,
        description: "Stable unique change record identifier",
      },
      schema_version: {
        bsonType: ["int", "double", "long"],
        minimum: 1,
        description: "Schema version integer",
      },
      v: {
        bsonType: ["int", "double", "long"],
        minimum: 1,
        description: "Monotonic document revision number",
      },
      status: {
        enum: [
          "captured",
          "policy_evaluated",
          "pending_human_review",
          "auto_approved",
          "approved_signed",
          "rejected",
          "quarantined_blocked",
          "closed_verified",
          "closed_exception",
        ],
        description: "Controlled lifecycle disposition state",
      },
      agents: {
        bsonType: "object",
        required: ["production_agent", "documentation_agent"],
        properties: {
          production_agent: {
            bsonType: "object",
            required: ["agent_id", "credential_type"],
            properties: {
              agent_id: { bsonType: "string", minLength: 3 },
              credential_type: { bsonType: "string", minLength: 3 },
            },
          },
          documentation_agent: {
            bsonType: "object",
            required: ["agent_id", "credential_type"],
            properties: {
              agent_id: { bsonType: "string", minLength: 3 },
              credential_type: { bsonType: "string", minLength: 3 },
            },
          },
        },
      },
      intervention: {
        bsonType: "object",
        required: [
          "machine_id",
          "station",
          "parameter",
          "before_value",
          "proposed_value",
        ],
        properties: {
          machine_id: { bsonType: "string", minLength: 2 },
          station: { bsonType: "string", minLength: 2 },
          parameter: { bsonType: "string", minLength: 2 },
          before_value: { bsonType: ["double", "int", "long"] },
          proposed_value: { bsonType: ["double", "int", "long"] },
        },
      },
      created_at: {
        bsonType: "string",
        minLength: 10,
      },
    },
  },
};
