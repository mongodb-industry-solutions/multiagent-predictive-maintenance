"use client";

import SectionHome from "@/components/sectionHome/SectionHome";
import { resetAgenticProgress } from "@/lib/agenticProgress";

const useCases = [
  {
    title: "Predictive Maintenance",
    description:
      "Specialist agents detect failures, diagnose root cause, generate work orders, and schedule maintenance end to end.",
    href: "/agentic-ai/failure-prediction",
    glyph: "Warning",
  },
  {
    title: "Contestable AI",
    description:
      "Agent outputs become proposals: engineers can accept, reject, or modify each argument before a recommendation is finalised.",
    glyph: "Person",
    comingSoon: true,
  },
  {
    title: "Change Documentation Agent",
    description:
      "Capture shop-floor changes and keep procedures, asset records, and work instructions up to date automatically.",
    glyph: "File",
    comingSoon: true,
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
