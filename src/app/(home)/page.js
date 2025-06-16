"use client";
import {
  H1,
  H3,
  Description,
  Link as LGLink,
  Body,
} from "@leafygreen-ui/typography";
import Card from "@leafygreen-ui/card";
import Image from "next/image";

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
              src="/read.png"
              alt="Predictive Maintenance Demo"
              fill={false}
              width={700}
              height={400}
              className="object-contain w-full h-auto max-h-[30vh] sm:max-h-[220px] md:max-h-[320px] lg:max-h-[400px] rounded-lg shadow"
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
              src="/read.png"
              alt="White Paper"
              width={36}
              height={36}
              className="mb-1 object-contain"
            />
            <H3 className="mb-1 text-center text-base">White Paper</H3>
            <Description className="text-center mb-1 text-xs">
              Learn more about using generative AI to achieve maintenance
              excellence.
            </Description>
            <LGLink
              href="https://www.mongodb.com/resources/solutions/use-cases/generative-ai-predictive-maintenance-applications"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center self-center text-blue-600 hover:underline mt-1"
            >
              Read the paper
            </LGLink>
          </Card>
          {/* Card 2 */}
          <Card className="flex flex-col items-center p-3 w-full md:w-1/3 max-w-xs mx-auto">
            <Image
              src="/globe.svg"
              alt="Blog Post"
              width={36}
              height={36}
              className="mb-1 object-contain"
            />
            <H3 className="mb-1 text-center text-base">Blog Post</H3>
            <Description className="text-center mb-1 text-xs">
              Discover how AI is transforming predictive maintenance in
              real-world scenarios.
            </Description>
            <LGLink
              href="https://www.mongodb.com/blog/post/ai-predictive-maintenance"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center self-center text-blue-600 hover:underline mt-1"
            >
              Read the blog
            </LGLink>
          </Card>
          {/* Card 3 */}
          <Card className="flex flex-col items-center p-3 w-full md:w-1/3 max-w-xs mx-auto">
            <Image
              src="/window.svg"
              alt="MongoDB Atlas"
              width={36}
              height={36}
              className="mb-1 object-contain"
            />
            <H3 className="mb-1 text-center text-base">MongoDB Atlas</H3>
            <Description className="text-center mb-1 text-xs">
              Explore the cloud platform powering this demo and many other AI
              solutions.
            </Description>
            <LGLink
              href="https://www.mongodb.com/products/platform/atlas"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center self-center text-blue-600 hover:underline mt-1"
            >
              Visit Atlas
            </LGLink>
          </Card>
        </div>
      </section>
    </main>
  );
}
