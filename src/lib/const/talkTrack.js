export const GENERAL_TALK_TRACK = [
  {
    heading: "Leafy Factory",
    content: [
      {
        heading: "From data to autonomy",
        body: "This demo follows a manufacturer from connected data to autonomous operations. MongoDB is the operational data foundation that preserves factory context, grounds AI workflows, and gives agents the memory and tools required to coordinate action.",
      },
      {
        heading: "The three stages",
        body: [
          "Unified Namespace: establish shared, durable context across OT and IT.",
          "AI Workflows: ground repeatable decisions and natural-language experiences in factory truth.",
          "Agentic AI: give specialist agents the context and memory to coordinate action.",
        ],
      },
      {
        heading: "Core message",
        body: "Agentic AI is not the starting point. Trustworthy autonomy depends on unified operational context, history, retrieval, and well-understood workflow patterns.",
      },
    ],
  },
];

export const UNS_TALK_TRACK = [
  {
    heading: "UNS Overview",
    content: [
      {
        heading: "Why a unified namespace needs memory",
        body: "A unified namespace creates a live, hierarchical view of the factory, but the broker is usually transient. MongoDB persists that stream with its production and business context so operational applications can query both the current state and recent history.",
      },
      {
        heading: "Value to emphasize",
        body: [
          "A single source of operational truth prevents every department from rebuilding its own integrated dataset.",
          "Context and history enable traceability, root-cause analysis, reporting, replay, and AI model training.",
          "The document model handles evolving machine, event, work order, batch, operator, and quality structures together.",
          "Native time-series support retains high-frequency telemetry without separating it from the metadata that gives it meaning.",
          "Operational queries are isolated from production-critical MES, ERP, SCADA, and historian workloads.",
        ],
      },
      {
        heading: "Position in the architecture",
        body: "MongoDB complements systems of record and the analytical warehouse. It is the low-latency system of action between the live factory stream and long-term enterprise analytics.",
      },
    ],
  },
  {
    heading: "How to Demo",
    content: [
      {
        heading: "Factory Explorer",
        body: [
          "Start at the Unified Namespace overview and contrast transient broker data with durable MongoDB operational memory.",
          "Open Factory Explorer and follow the ISA-95 hierarchy from enterprise to a specific machine.",
          "Open Knowledge Graph and show the same line as an ontology: stations feed each other, the laser welder is one cell (LTW-04, legacy id M1), and an E12 alarm points at parts, skills, and a manual section.",
          "Run a $graphLookup, then the hybrid query that joins those parts to live inventory. The graph is the map; MongoDB is where the map and the live factory stay together.",
          "Explain that this shared context is what downstream applications, workflows, and agents consume.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB",
    content: [
      {
        heading: "Operational memory",
        body: "MongoDB combines flexible documents, native time series, search, scale, and high availability so the UNS can serve as a real-time system of action without replacing MES, ERP, SCADA, or the data warehouse.",
      },
    ],
  },
];

export const KNOWLEDGE_GRAPH_TALK_TRACK = [
  {
    heading: "Ontology in the UNS",
    content: [
      {
        heading: "The factory, named",
        body: "Leafy Factory already has a line, a welding cell, alarms, spare parts, manuals, materials, and controlled procedures. The knowledge graph writes those relationships down so they can be queried, instead of leaving them implied in a prompt.",
      },
      {
        heading: "One welder, one legacy id",
        body: "There is one laser tab welder, shopfloor id LTW-04. M1 is the legacy asset id still used by predictive-maintenance telemetry, alerts, and work orders. E12 and W-TEMP-01 are alarms on that same cell, and both can point at optics spatter.",
      },
    ],
  },
  {
    heading: "How to Demo",
    content: [
      {
        heading: "Suggested path",
        body: [
          "Start on Laser Welding Cell so the canvas opens on the station, the one welding cell, and the faults around it. Switch to Full Factory Ontology or Battery Line Process Flow when you want the rest of the line.",
          "Select E12 and open Stored in MongoDB. Show _id, the edges array, parent_id, and external_ref. Those four fields are the whole graph model.",
          "Run Alarm to repair. The canvas badges the start node, then hop 0 and hop 1 as $graphLookup walks failure modes, parts, skills, and the E12 manual section.",
          "Run Scoped traversal and point out restrictSearchWithMatch: recipes and SOPs connected to the welding cell stay out of the result.",
          "Run Downstream blast radius to follow the line from laser welding to pack release, then ISA-95 drilldown to show parent_id instead of the edge list.",
          "Run Graph plus live stock. The ontology names P-001 and the manual page. $lookup reads quantity, location, and the manual section from the operational collections.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB?",
    content: [
      {
        heading: "A graph, without a second database",
        body: "The ontology, the time-series weld trace, the inventory balance, and the controlled SOP live in one system. $graphLookup traverses the ontology. $lookup, time series, and vector search answer the next question in the same pipeline. Agents can reuse these traversals later without a new store or a sync job.",
      },
    ],
  },
];

export const AI_WORKFLOWS_TALK_TRACK = [
  {
    heading: "AI Workflows",
    content: [
      {
        heading: "From data access to grounded intelligence",
        body: "RAG retrieves the factory evidence an AI model needs at the moment of a question or decision. MongoDB can combine structured queries, full-text search, vector search, and operational data in the same platform.",
      },
      {
        heading: "Workflows versus agents",
        body: [
          "A workflow has predetermined code paths and operates in a defined order. This makes it a strong fit for repeatable, auditable tasks.",
          "An agent dynamically defines its own process and tool usage. It is more flexible, but requires stronger controls, observability, and trusted context.",
          "Factory Chat demonstrates grounded access to unified context. Connected Factory Context Explorer shows how read-time joins, natural-language aggregations, and in-database signal-shape vector search turn raw telemetry and keyless alerts into operational answers.",
        ],
      },
    ],
  },
  {
    heading: "How to Demo",
    content: [
      {
        heading: "Suggested path",
        body: [
          "Start with UNS Chat and show that answers expose the operational sources used to create them.",
          "Open Connected Factory Context Explorer to walk through read-time material limit lookups, interval joins on keyless alerts, natural-language query generation, and 24-bin thermal curve vector search.",
          "Emphasize that every experience uses the same MongoDB operational foundation without synchronizing data across separate time-series, relational, and vector stores.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB",
    content: [
      {
        heading: "One retrieval and application data platform",
        body: "MongoDB stores operational documents, time series, text, and embeddings together. Atlas Search and Vector Search ground AI without introducing another synchronized data silo.",
      },
    ],
  },
];

export const CONTEXT_EXPLORER_TALK_TRACK = [
  {
    heading: "Story in 3 Sentences",
    content: [
      {
        heading: "Context at read time",
        body: "A weld-zone reading and a PLC alarm arrive from Tab Laser Welding Cell LTW-04. Neither knows whether the reading violates the foil thermal spec, and the alarm carries no work order ID at all. One MongoDB query gives the reading its limit, an interval join gives the alarm its order across the whole day, a read-only agent writes that pipeline from plain English, and a 24-point curve vector finds the same optics spatter signature across the fleet.",
      },
      {
        heading: "Shortcuts during the demo",
        body: [
          "Left / Right arrows: move between steps 0 through 6.1.",
          "Cmd/Ctrl + Enter: execute the current MongoDB aggregation pipeline live.",
          "e (or click the pipeline): edit any stage live; Esc returns to the diff view.",
          "p (or click Story Visual): open the full-screen visual diagram for the current step.",
        ],
      },
    ],
  },
  {
    heading: "Step-by-Step Guide",
    content: [
      {
        heading: "0 · The data & 1 · The reading",
        body: [
          "Step 0 shows four collections in one engine: telemetry (time-series collection with 24h TTL and 15,264 LTW-04 readings for today's shift), alerts (operational collection because alerts have an acknowledgement lifecycle), workorders (storing MES production order spans alongside maintenance orders), and materials (ERP foil specs).",
          "Step 1 fetches the 08:14:12Z reading on LTW-04: 235.2 degC on MAT-CU-020. Point out that even with workOrder stamped at the edge, 235.2 degC tells us nothing without the material's thermal limit.",
        ],
      },
      {
        heading: "2 · The limit & 3 · The alert ★",
        body: [
          "Step 2 adds a $lookup to materials, resolving MAT-CU-020 to nickel-plated C11000 copper foil (max 230 degC) and computing overLimit: true. Keeping limits in master data means ERP spec revisions apply immediately without rewriting historical telemetry.",
          "Step 3 is the anchor step: the PLC alert has NO workOrder, NO materialMaster, and NO operatorId — only machine_id LTW-04 and ts 08:14:12Z. An interval $lookup into workorders (startedAt <= t < endedAt) resolves WO-1001234 (EV-PM-4C-S, 100 packs, operator A. Vogel) at read time.",
        ],
      },
      {
        heading: "4 · The whole day & 5 · Ask in words",
        body: [
          "Step 4 removes the single timestamp filter and groups all 9 LTW-04 alerts of the day by work order: WO-1001234 jumps to the top (4 alerts, 2 priority-1), and preserveNullAndEmptyArrays surfaces the 22:47 alert during the post-shift gap (no order).",
          "Step 5 lets a plant manager ask the exact same question in English. A read-only LangGraph agent writes and runs the aggregation pipeline live with untrusted-data prompt-injection guardrails.",
        ],
      },
      {
        heading: "6 · Has this happened before? & 6.1 · Only this material",
        body: [
          "Step 6 turns the 4 minutes around 08:14 into 24 ten-second z-scored bins directly inside MongoDB (click 'How the vector is computed' to show the $dateTrunc + $stdDevPop pipeline on telemetry) and runs $vectorSearch across excursions. Four fleet matches above 0.90 all point to protective window spatter contamination — including one unlinked open case at leafy-ev-02.",
          "Step 6.1 adds materialMaster: 'MAT-CU-020' to $vectorSearch.filter. Because vector and metadata live in one document, pre-filtering runs before similarity scoring and proves the curve crosses materials — inspect the laser optics before calling the foil supplier.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB",
    content: [
      {
        heading: "Time series, relational-style joins, and vector search in one engine",
        body: "Traditional architectures split sensor readings into a historian, orders into SQL, and embeddings into a separate vector store — forcing fragile ETL pipelines before any cross-domain question can be answered. MongoDB Atlas executes time-series bucketing, interval $lookup joins, and pre-filtered $vectorSearch in one operational database.",
      },
    ],
  },
];

export const AGENTIC_TALK_TRACK = [
  {
    heading: "Overview",
    content: [
      {
        heading: "Solution Overview",
        body: "This demo shows how agentic AI and MongoDB automate predictive maintenance—detecting failures, diagnosing root causes, and scheduling repairs with minimal downtime. MongoDB powers real-time data, agent memory, and fast search, making it the ideal foundation for modern manufacturing AI.",
      },
      {
        image: {
          src: "/img/benefits.png",
          alt: "Benefits",
        },
      },
    ],
  },
  {
    heading: "How to Demo",
    content: [
      {
        heading: "Demo walkthrough",
        body: [
          "Navigate to the 'Failure Prediction' tab. Click 'Start Simulation' to stream machine telemetry data to MongoDB. Use the 'Show Telemetry' button to view real-time updates.",
          "Adjust the temperature and vibration sliders to simulate abnormal scenarios. When values exceed thresholds, the machine learning model detects an issue and raises an alert.",
          "Alerts are routed by the Supervisor Agent to the Failure Agent, which performs root cause analysis using data sources like past work orders, staff interviews, and the machine manual. You can view all tools called by the agent.",
          "(Optional) Click 'See Full Logs' to observe how vector search retrieves the most relevant information from available data sources, and see the agent's reasoning process.",
          "After analysis, the Failure Agent generates an incident report with root cause and recommended actions. The new report appears in the incident report list.",
          "(Advanced / Contestable AI) Click 'Contest AI (Advanced)' on the incident report (or open the standalone Contestable AI use case) to see the Vibration Pattern Agent and Maintenance History Agent debate three candidate root causes. Accept, reject, or modify individual arguments to immediately recalculate candidate scores and refine the incident report before generating a work order.",
          "(Agentic Audit Trail) Open 'Agentic Audit Trail' from the Agentic AI overview to demonstrate how shopfloor AI interventions on LTW-04 are deterministically captured, checked against recipe and OT security policies, grounded in version-filtered SOPs, signed electronically when out of bounds, and verified through closed-loop outcomes in MongoDB.",
          "Navigate to the 'Work Order Generation' tab. Select your incident report and click 'Continue Workflow'. The Work Order Agent analyzes similar past work orders to estimate duration, required parts, and skills, then drafts a new work order.",
          "Next, go to the 'Work Order Scheduler' tab. Select the created work order and click 'Continue Workflow'. The Planning Agent checks inventory, technician availability, and the production calendar to suggest an optimized maintenance window, updating the calendar accordingly.",
          "(Optional) Test and chat with each agent individually from the 'Agent Sandbox' tab. Agents are integrated with the workflow, but you can interact with them directly to learn more about their capabilities.",
        ],
      },
    ],
  },
  {
    heading: "Behind the Scenes",
    content: [
      {
        heading: "Architecture Overview",
        body: "MongoDB Atlas, LangGraph, and Amazon Bedrock work together to automate failure detection, diagnosis, work order creation, and scheduling. The supervisor agent coordinates three specialized agents—each powered by tools, memory, and LLMs—to streamline maintenance from alert to resolution.",
      },
      {
        image: {
          src: "/img/high-level-architecture.png",
          alt: "Architecture Overview",
        },
      },
      {
        heading: "Key Details",
        body: [
          "MongoDB Atlas stores machine telemetry, incident reports, work orders, staff interviews, manuals, and agent memory—all in a unified, scalable data layer.",
          "Atlas Vector Search enables agents to retrieve relevant context from unstructured sources, supporting rapid root cause analysis and decision-making.",
          "LangGraph orchestrates agent workflows, enabling multi-step reasoning and collaboration between agents.",
          "Amazon Bedrock provides LLMs for agent reasoning, analysis, and output generation.",
          "The modular supervisor-agent architecture makes it easy to extend the system to new use cases, agents, and data sources.",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB?",
    content: [
      {
        heading: "AI-powered applications are built on MongoDB",
        body: " ",
      },
      {
        image: {
          src: "/img/why-mongodb.png",
          alt: "Why MongoDB",
        },
      },
      {
        heading: "A modern data foundation for agentic AI",
        body: "MongoDB Atlas provides several features for building AI agents. As both a vector and document database, Atlas supports various search methods for agentic RAG, as well as storing agent interactions in the same database for short and long-term agent memory.",
      },
      {
        heading: "Trusted by industry leaders",
        body: "Over 70% of Fortune 500 companies and nine of the 10 largest manufacturers trust MongoDB for mission-critical applications. MongoDB powers end-to-end value chain optimization with AI/ML, advanced analytics, and real-time data processing for innovative manufacturing applications.",
      },
      {
        heading: "Increase production efficiency, reduce costs",
        body: "Devices and equipment across the shop floor and beyond constantly generate valuable data. With MongoDB’s modern database, you can extract value from that data to ensure more efficient operations and reduced downtime.",
      },
      {
        heading: "Accelerate innovation with IoT applications",
        body: "IoT already connects billions of devices worldwide. As more IoT-enabled devices come online with sophisticated sensors, realizing business value from the enormous flow of device data demands the right database. MongoDB’s flexible document model and native time series support make it easy to ingest, process, and analyze IoT data at scale.",
      },
      {
        image: {
          src: "/img/ai-illustration-spot.png",
          alt: "AI Illustration",
        },
      },
    ],
  },
];

export const AUDIT_TRAIL_TALK_TRACK = [
  {
    heading: "Overview",
    content: [
      {
        heading: "Why shopfloor AI needs a GMP-grade audit trail",
        body: "In regulated and high-spec manufacturing—from pharmaceuticals and medical devices (FDA 21 CFR Part 11, EU GMP Annex 11, ALCOA+) to safety-critical EV battery cells (IATF 16949, EU Battery Passport)—every parameter change must prove who changed what, when, why, under which effective SOP, and with what outcome. Because evidence is scattered across PLCs, MES, ERP, and QMS, many teams avoid autonomous optimization altogether.",
      },
      {
        heading: "Core design rule",
        body: [
          "Capture evidence and enforce Proven Acceptable Range (PAR) & OT boundaries deterministically in code; use the Documentation Agent strictly to assemble the governed record.",
          "Segregate duties across the Production Agent, the Documentation Agent, and the human Quality Engineer (2-factor Part 11 e-signature).",
          "Pre-filter SOPs by status='approved', site, station, and product before vector similarity scoring so draft or obsolete procedures are never cited.",
        ],
      },
    ],
  },
  {
    heading: "Step-by-Step Demo",
    content: [
      {
        heading: "1 · Auto-Verified (In-PAR laser trim)",
        body: [
          "Select 'Auto-Verified (In-PAR)' and click 'Start Audit Trail' (Step 1 visualizes 1480 → 1435 W inside the pre-validated 1380–1500 W PAR window and joins telemetry, MES order, and copper foil limits as Revision v1).",
          "Use the 'Audit Lineage' button at any time (available from Step 0 onward) to inspect the $jsonSchema guard, revision snapshots, live $lookup lineage, and the GMP & ALCOA+ alignment tab.",
          "Click 'Continue' (Step 2): deterministic rules pass, and governed $vectorSearch retrieves approved SOP-LTW-014 v3.2 while blocking superseded v2.1 and draft v4.0-rc1.",
          "Click 'Continue' (Step 3): Documentation Agent drafts the QMS Change Record and auto-verifies the in-PAR adjustment without manual deviation paperwork.",
          "Click 'Continue' (Step 4): post-change telemetry confirms 214.5 °C peak and 6/6 welds passed, displaying the hash-chained v1 → v4 MongoDB revision timeline.",
        ],
      },
      {
        heading: "2 · Human in the Loop (Out-of-PAR deviation & Part 11 e-sign)",
        body: [
          "Click 'Change Scenario', pick 'Human in the Loop' (1485 → 1560 W on aluminum tab), and step through Capture and Policy.",
          "In Step 2, point out that deterministic rules hold the PLC (exceeds 1500 W PAR ceiling after 2 shift trims) and recall CHG-2026-0089 (laser window spatter lesson).",
          "In Step 3, highlight the 21 CFR Part 11 signature block (unique authenticated signer ID, 2nd-factor signing PIN, and live Meaning of Signature) and execute the signature to view the full Part 11 manifestation.",
          "Either reject the boost to clean optics (verified at 201.9 °C in Step 4) or approve a 1-batch override to watch Step 4 catch the 221.8 °C breach and auto-open DEV-CAPA-2026-041.",
        ],
      },
      {
        heading: "3 · Rejected (Unverified cloud script)",
        body: [
          "Click 'Change Scenario', pick 'Rejected' (unverified cloud script attempting 18.0 → 11.5 L/min with no OT certificate or MES order).",
          "Step through to Step 3 to show the PLC write blocked under POL-OTSEC-003 v1.1, and click 'Test Unauthorized DB Write' to see MongoDB reject an unattributed bypass write live (DocumentValidationFailure, code 121).",
        ],
      },
    ],
  },
  {
    heading: "Why MongoDB",
    content: [
      {
        heading: "GMP & ALCOA+ controls in one operational data platform",
        body: [
          "Attributable & Validated ($jsonSchema): enforces actor credentials and required shopfloor fields at the database layer.",
          "Controlled Procedures ($vectorSearch pre-filtering): excludes draft and superseded SOPs prior to similarity ranking (Annex 11 Sec. 10).",
          "Contemporaneous & Append-Only (ACID Document Versioning): writes hash-chained snapshots and Annex 11 Sec. 9 field diffs to change_record_revisions.",
          "Linked E-Signatures & Episodic Memory: binds Part 11 signatures (11.50 / 11.70) to exact record hashes and recalls closed records to guide future decisions.",
        ],
      },
    ],
  },
];

export const TALK_TRACK = GENERAL_TALK_TRACK;
