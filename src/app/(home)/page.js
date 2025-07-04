"use client";
import { H1, H3, Description, Body } from "@leafygreen-ui/typography";
import Card from "@leafygreen-ui/card";
import Image from "next/image";
import Icon from "@leafygreen-ui/icon";

export default function Page() {
  return (
    <main className="flex flex-col items-center w-full max-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Top Section: Title + Image */}
      <section className="flex flex-col items-center w-full flex-grow mb-4 min-h-0">
        <H1 className="mt-8 mb-4 text-center text-3xl md:text-4xl lg:text-5xl">
          Agentic Predictive Maintenance Demo
        </H1>
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
          <div
            className="flex items-center justify-center w-full max-w-4xl"
            style={{ aspectRatio: "7 / 4", minHeight: 120 }}
          >
            <Image
              src="/img/high-level-architecture.svg"
              alt="Predictive Maintenance Demo"
              fill={false}
              width={700}
              height={400}
              className="object-contain w-full h-auto max-h-[30vh] sm:max-h-[220px] md:max-h-[320px] lg:max-h-[400px]"
              priority
              sizes="(max-width: 768px) 100vw, 80vw"
            />
          </div>
        </div>
      </section>
      {/* Related Resources */}
      <section className="w-full flex-shrink-0 mb-6">
        <H3 className="mb-2 text-center text-xl">Related Resources</H3>
        <div className="w-full flex flex-col md:flex-row gap-3 md:gap-4 justify-center items-stretch">
          {/* Card 1 */}
          <Card className="flex flex-col items-center p-3 w-full md:w-1/3 max-w-xs mx-auto">
            <Image
              src="/img/github.png"
              alt="GitHub Repository"
              width={36}
              height={36}
              className="mb-1 object-contain"
            />
            <H3 className="mb-1 text-center text-base">GitHub Repository</H3>
            <Description className="text-center mb-1 text-xs">
              Explore the source code and implementation details of this demo.
            </Description>
            <a
              href="https://github.com/mongodb-industry-solutions/multiagent-predictive-maintenance"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center self-center text-blue-600 hover:underline hover:decoration-gray-200 hover:underline-offset-4 hover:decoration-2"
              style={{ color: "#2563eb" }}
            >
              Try the demo
              <Icon
                glyph="ChevronRight"
                size={10}
                className="ml-1 text-blue-600"
              />
            </a>
          </Card>
          {/* Card 2 */}
          <Card className="flex flex-col items-center p-3 w-full md:w-1/3 max-w-xs mx-auto">
            <Image
              src="/img/deck.png"
              alt="Slides Deck"
              width={36}
              height={36}
              className="mb-1 object-contain"
            />
            <H3 className="mb-1 text-center text-base">Slide Deck</H3>
            <Description className="text-center mb-1 text-xs">
              Discover how agentic AI is transforming predictive maintenance.
            </Description>
            <a
              href="https://mongodb.highspot.com/items/6079a342c79c5260a535141a"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center self-center text-blue-600 hover:underline hover:decoration-gray-200 hover:underline-offset-4 hover:decoration-2 mt-1"
              style={{ color: "#2563eb" }}
            >
              View the deck
              <Icon
                glyph="ChevronRight"
                size={10}
                className="ml-1 text-blue-600"
              />
            </a>
          </Card>
          {/* Card 3 */}
          <Card className="flex flex-col items-center p-3 w-full md:w-1/3 max-w-xs mx-auto">
            <Image
              src="/img/read.png"
              alt="MongoDB Atlas"
              width={36}
              height={36}
              className="mb-1 object-contain"
            />
            <H3 className="mb-1 text-center text-base">Blog Post</H3>
            <Description className="text-center mb-1 text-xs">
              Learn more about multi-agent collaboration for manufacturing
              operations excellence.
            </Description>
            <a
              href="https://www.mongodb.com/blog/post/multi-agent-collaboration-for-manufacturing-operations-optimization"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center self-center text-blue-600 hover:underline hover:decoration-gray-200 hover:underline-offset-4 hover:decoration-2 mt-1"
              style={{ color: "#2563eb" }}
            >
              Read the blog
              <Icon
                glyph="ChevronRight"
                size={10}
                className="ml-1 text-blue-600"
              />
            </a>
          </Card>
        </div>
      </section>
    </main>
  );
}
