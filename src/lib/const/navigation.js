export const STORY_STAGES = [
  {
    id: "unified-namespace",
    number: "01",
    label: "Unified Namespace",
    shortLabel: "UNS",
    href: "/unified-namespace",
    description: "Unify live factory data with durable operational context.",
    children: [
      {
        label: "Stage Overview",
        href: "/unified-namespace",
        description: "Why a unified namespace needs memory.",
      },
      {
        label: "Explore Leafy Factory",
        href: "/unified-namespace/factory-explorer",
        description: "Walk the EV module line station by station.",
      },
      {
        label: "UNS in Action",
        href: "/unified-namespace/uns-in-action",
        description: "Run orders and inspect live operational data.",
      },
    ],
  },
  {
    id: "ai-workflows",
    number: "02",
    label: "AI Workflows",
    shortLabel: "Workflows",
    href: "/ai-workflows",
    description: "Ground repeatable AI workflows in factory data.",
    children: [
      {
        label: "Stage Overview",
        href: "/ai-workflows",
        description: "From retrieval to guided decisions.",
      },
      {
        label: "Factory Chat",
        href: "/ai-workflows/factory-chat",
        description: "Talk to your unified factory context.",
      },
      {
        label: "Criticality Analysis",
        href: "/ai-workflows/criticality-analysis",
        description: "Turn evidence into a governed assessment.",
      },
    ],
  },
  {
    id: "agentic-ai",
    number: "03",
    label: "Agentic AI",
    shortLabel: "Agents",
    href: "/agentic-ai",
    description: "Coordinate autonomous decisions and action.",
    children: [
      {
        label: "Stage Overview",
        href: "/agentic-ai",
        description: "From guided workflows to coordinated autonomy.",
      },
      {
        label: "Failure Prediction",
        href: "/agentic-ai/failure-prediction",
        description: "Detect anomalies and diagnose root cause.",
      },
      {
        label: "Work Order Generation",
        href: "/agentic-ai/workorder-generation",
        description: "Turn incidents into maintenance plans.",
      },
      {
        label: "Work Order Scheduler",
        href: "/agentic-ai/workorder-scheduler",
        description: "Choose the best maintenance window.",
      },
      {
        label: "Agent Sandbox",
        href: "/agentic-ai/agent-sandbox",
        description: "Interact with each specialist agent.",
      },
    ],
  },
];

export function getStageForPath(pathname = "") {
  return STORY_STAGES.find((stage) => pathname.startsWith(stage.href));
}

export function isRouteActive(pathname, href) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
