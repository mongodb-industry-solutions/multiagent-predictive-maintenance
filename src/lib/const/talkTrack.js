export const TALK_TRACK = [
  {
    heading: "Instructions and Talk Track",
    content: [
      {
        heading: "Solution Overview",
        body: "This demo shows how agentic AI and MongoDB automate predictive maintenance—detecting failures, diagnosing root causes, and scheduling repairs with minimal downtime. MongoDB powers real-time data, agent memory, and fast search, making it the ideal foundation for modern manufacturing AI.",
      },
      {
        image: {
          src: "/img/benefits.svg",
          alt: "Benefits",
        },
      },
      {
        heading: "How to Demo",
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
          src: "/img/high-level-architecture.svg",
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
          src: "/img/why-mongodb.svg",
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
