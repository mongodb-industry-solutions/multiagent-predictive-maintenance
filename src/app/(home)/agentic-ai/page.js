"use client";

import SectionHome from "@/components/sectionHome/SectionHome";
import { resetAgenticProgress } from "@/lib/agenticProgress";

const useCases = [
  {
    title: "Failure prediction & root cause",
    description:
      "Stream machine telemetry, detect an anomaly, and retrieve evidence for an automated root-cause report.",
    href: "/agentic-ai/failure-prediction",
    glyph: "Warning",
  },
  {
    title: "Work order generation",
    description:
      "Turn an incident report into an actionable maintenance plan with parts, skills, and duration estimates.",
    href: "/agentic-ai/workorder-generation",
    glyph: "Wrench",
  },
  {
    title: "Maintenance scheduling",
    description:
      "Balance production, inventory, and technician constraints to select the best maintenance window.",
    href: "/agentic-ai/workorder-scheduler",
    glyph: "Clock",
  },
  {
    title: "Agent Sandbox",
    description:
      "Chat with each specialist agent directly and inspect its tools, retrieved context, and responses.",
    href: "/agentic-ai/agent-sandbox",
    glyph: "Wrench",
  },
];

const resources = [
  {
    title: "Multi-Agent Predictive Maintenance",
    description: "Explore the source code and adapt the working demo.",
    type: "GitHub repository",
    image: "/img/github.png",
    href: "https://github.com/mongodb-industry-solutions/multiagent-predictive-maintenance",
  },
  {
    title: "Agentic Predictive Maintenance",
    description: "Use the presentation deck to support the customer story.",
    type: "Presentation",
    image: "/img/deck.png",
    href: "https://docs.google.com/presentation/d/1nmPBEksW-BUtazLByXd7O04CdrYNLRu9UyEgje_Vf3c/edit?slide=id.g373ea525438_0_2759#slide=id.g373ea525438_0_2759",
  },
  {
    title: "Unlock Multi-Agent AI for Predictive Maintenance",
    description: "Read the MongoDB blog behind the working use case.",
    type: "Blog",
    image: "/img/read.png",
    href: "https://www.mongodb.com/company/blog/innovation/unlock-multi-agent-ai-predictive-maintenance",
  },
];

export default function AgenticAiPage() {
  return (
    <SectionHome
        stageId="agentic-ai"
        title="From insights to autonomous action"
        subtitle="Give specialized agents unified operational context, retrieval, tools, and memory so they can coordinate an end-to-end maintenance response."
        image="/img/high-level-architecture.png"
        imageAlt="Multi-agent predictive maintenance architecture"
        startHref="/agentic-ai/failure-prediction"
        onStart={resetAgenticProgress}
        useCases={useCases}
        resources={resources}
    />
  );
}
