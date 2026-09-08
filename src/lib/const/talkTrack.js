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
          "Show how telemetry, production, maintenance, quality, and ownership context appear together for the selected asset.",
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
          "Factory Chat demonstrates grounded access to unified context. Criticality Analysis demonstrates retrieve, score, explain, and human review as a bounded workflow.",
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
          "Start with Factory Chat and show that answers expose the operational sources used to create them.",
          "Continue to Criticality Analysis and walk through retrieve, evaluate, explain, and review.",
          "Emphasize that both experiences use the same MongoDB-backed factory context while applying different, controlled interaction patterns.",
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

export const TALK_TRACK = GENERAL_TALK_TRACK;
