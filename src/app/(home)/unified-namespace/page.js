"use client";

import SectionHome from "@/components/sectionHome/SectionHome";

const useCases = [
  {
    title: "Explore Leafy Factory",
    description:
      "Follow the EV battery module line and inspect the contextual events published by every station.",
    href: "/unified-namespace/factory-explorer",
    glyph: "Diagram",
  },
  {
    title: "UNS in Action",
    description:
      "Start production orders, monitor live events and alerts, inspect production documents, and analyze operations.",
    href: "/unified-namespace/uns-in-action",
    glyph: "Database",
  },
];

const resources = [
  {
    title: "MongoDB for Manufacturing",
    description:
      "Explore how MongoDB supports modern industrial applications and operational data.",
    type: "Solution overview",
    image: "/img/read.png",
    href: "https://www.mongodb.com/solutions/industries/manufacturing",
  },
  {
    title: "Time Series Collections",
    description:
      "Learn how MongoDB stores high-volume telemetry with rich contextual metadata.",
    type: "Documentation",
    image: "/img/read.png",
    href: "https://www.mongodb.com/docs/manual/core/timeseries-collections/",
  },
  {
    title: "Atlas Stream Processing",
    description:
      "Process, enrich, and route streaming factory data before it lands.",
    type: "Documentation",
    image: "/img/read.png",
    href: "https://www.mongodb.com/docs/atlas/atlas-stream-processing/",
  },
];

export default function UnifiedNamespacePage() {
  return (
    <SectionHome
        stageId="unified-namespace"
        title="Break data silos with a Unified Namespace"
        subtitle="Persist live factory signals with their OT and IT context to create a durable operational truth for applications, analytics, and AI."
        image="/img/uns-overview.png"
        imageAlt="MongoDB-backed unified namespace architecture"
        startHref="/unified-namespace/factory-explorer"
        useCases={useCases}
        resources={resources}
    />
  );
}
