"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@leafygreen-ui/icon";
import { Button } from "@leafygreen-ui/button";
import { H1, H3, Body, Description } from "@leafygreen-ui/typography";
import InfoWizard from "@/components/infoWizard/InfoWizard";
import {
  UNS_TALK_TRACK,
  AI_WORKFLOWS_TALK_TRACK,
  AGENTIC_TALK_TRACK,
} from "@/lib/const/talkTrack";

function UseCaseCatalog({ items }) {
  return (
    <section>
      <div className="mb-4">
        <Body
          weight="medium"
          className="uppercase tracking-[0.13em] text-[#00684A]"
        >
          Use cases
        </Body>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex min-h-[210px] flex-col rounded-2xl border border-[#D8E3DF] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#00A35C] hover:shadow-md"
          >
            <div className="mb-5 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E3FCF7] text-[#00684A]">
                <Icon glyph={item.glyph} size={22} />
              </span>
            </div>
            <H3 className="text-[#112733]">{item.title}</H3>
            <Description className="mt-2 flex-1 leading-6">
              {item.description}
            </Description>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#00684A]">
              Open use case
              <Icon
                glyph="ArrowRight"
                size={15}
                className="transition-transform group-hover:translate-x-1"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ResourceCatalog({ items }) {
  return (
    <section>
      <div className="mb-4">
        <Body
          weight="medium"
          className="uppercase tracking-[0.13em] text-[#3D4F58]"
        >
          Related resources
        </Body>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target={item.external === false ? undefined : "_blank"}
            rel={item.external === false ? undefined : "noopener noreferrer"}
            className="group flex items-start gap-4 rounded-xl border border-[#D8E3DF] bg-[#F1F5F3] p-4 transition-colors hover:border-[#889397] hover:bg-[#E8EDEB]"
          >
            <Image
              src={item.image || "/img/read.png"}
              alt=""
              width={36}
              height={36}
              className="shrink-0 object-contain"
            />
            <span className="min-w-0 flex-1">
              <span className="text-xs font-medium uppercase tracking-[0.1em] text-[#5C6C75]">
                {item.type}
              </span>
              <span className="mt-1 block font-medium text-[#112733]">
                {item.title}
              </span>
              <span className="mt-1 block text-sm leading-5 text-[#5C6C75]">
                {item.description}
              </span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function SectionHome({
  stageId,
  title,
  subtitle,
  image,
  imageAlt,
  startHref,
  useCases,
  resources,
  onStart,
}) {
  const [imageExpanded, setImageExpanded] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const infoSections =
    stageId === "unified-namespace"
      ? UNS_TALK_TRACK
      : stageId === "ai-workflows"
        ? AI_WORKFLOWS_TALK_TRACK
        : AGENTIC_TALK_TRACK;

  useEffect(() => {
    if (!imageExpanded) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setImageExpanded(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageExpanded]);

  return (
    <main className="w-full pb-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-2 py-6 sm:px-4 lg:px-6">
        <section className="grid min-h-[390px] overflow-hidden rounded-2xl bg-[#0B2A3C] lg:grid-cols-[9fr_11fr]">
          <div className="flex flex-col justify-center px-7 py-10 sm:px-10 lg:py-12">
            <H1 darkMode className="text-balance !text-white">
              {title}
            </H1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#DCEBE7]">
              {subtitle}
            </p>
            <div className="mt-7 flex items-center gap-2">
              <Button
                href={startHref}
                onClick={onStart}
                variant="primary"
                darkMode={false}
                rightGlyph={<Icon glyph="ArrowRight" />}
              >
                Start demo
              </Button>
              <InfoWizard
                open={infoOpen}
                setOpen={setInfoOpen}
                sections={infoSections}
                iconOnly
                darkMode
                iconGlyph="QuestionMarkWithCircle"
                tooltipText="Learn more"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setImageExpanded(true)}
            className="group relative m-5 min-h-[300px] overflow-hidden rounded-2xl bg-white text-left lg:ml-0"
            aria-label={`Expand ${imageAlt}`}
          >
            <Image
              src={image}
              alt={imageAlt}
              fill
              priority
              quality={100}
              className="object-contain"
              sizes="(max-width: 1024px) calc(100vw - 40px), 760px"
            />
          </button>
        </section>

        <UseCaseCatalog items={useCases} />
        <ResourceCatalog items={resources} />
      </div>

      {imageExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={imageAlt}
          onClick={() => setImageExpanded(false)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061E2E]/95 p-4 sm:p-8"
        >
          <button
            type="button"
            onClick={() => setImageExpanded(false)}
            aria-label="Close expanded image"
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#112733] shadow-md"
          >
            <Icon glyph="X" size={20} />
          </button>
          <div className="relative h-full w-full overflow-hidden rounded-2xl bg-white">
            <Image
              src={image}
              alt={imageAlt}
              fill
              quality={100}
              className="object-contain p-4 sm:p-8"
              sizes="100vw"
              priority
            />
          </div>
        </div>
      )}
    </main>
  );
}
