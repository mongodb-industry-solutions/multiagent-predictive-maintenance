"use client";

import SectionHome from "@/components/sectionHome/SectionHome";

const useCases = [
  {
    title: "Factory Chat",
    description:
      "Ask natural-language questions across live and historical factory context with visible supporting evidence.",
    glyph: "Wizard",
    comingSoon: true,
  },
  {
    title: "Criticality Analysis",
    description:
      "Retrieve evidence, score asset impact, explain the result, and route it through human review.",
    glyph: "Diagram",
    comingSoon: true,
  },
  {
    title: "Repair Plan Generation",
    description:
      "Assemble a step-by-step repair plan from manuals, maintenance history, and spare-part availability.",
    glyph: "Wrench",
    comingSoon: true,
  },
];

const resources = [
  {
    title: "Workflows and Agents",
    description:
      "Understand the distinction between predetermined workflows and dynamic agents.",
    type: "LangGraph guide",
    image: "/img/read.png",
    href: "https://docs.langchain.com/oss/python/langgraph/workflows-agents",
  },
  {
    title: "MongoDB Atlas Vector Search",
    description:
      "Build semantic retrieval directly alongside operational application data.",
    type: "Documentation",
    image: "/img/read.png",
    href: "https://www.mongodb.com/docs/atlas/atlas-vector-search/",
  },
  {
    title: "MongoDB Atlas Search",
    description:
      "Add full-text search and relevance-based retrieval to AI workflows.",
    type: "Documentation",
    image: "/img/read.png",
    href: "https://www.mongodb.com/docs/atlas/atlas-search/",
  },
];

export default function AiWorkflowsPage() {
  return (
    <SectionHome
        stageId="ai-workflows"
        title="Turn data into operational intelligence"
        subtitle="Ground natural-language experiences and governed AI workflows in the same trusted operational context created by the unified namespace."
        image="/img/ai-workloads-overview.png"
        imageAlt="AI workflows and agentic workloads overview"
        useCases={useCases}
        resources={resources}
    />
  );
}
