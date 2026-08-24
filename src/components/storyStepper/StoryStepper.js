"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Body, Description } from "@leafygreen-ui/typography";
import { STORY_STAGES, getStageForPath } from "@/lib/const/navigation";

export default function StoryStepper({ activeStageId }) {
  const pathname = usePathname();
  const activeStage = activeStageId || getStageForPath(pathname)?.id;

  return (
    <nav aria-label="Leafy Factory journey" className="w-full">
      <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {STORY_STAGES.map((stage, index) => {
          const isActive = stage.id === activeStage;

          return (
            <li key={stage.id} className="relative min-w-0">
              <Link
                href={stage.href}
                aria-current={isActive ? "step" : undefined}
                className={`group flex h-full min-h-[96px] items-start gap-3 rounded-xl border p-4 transition-all ${
                  isActive
                    ? "border-[#00A35C] bg-[#E3FCF7] shadow-sm"
                    : "border-gray-200 bg-white hover:border-[#00A35C] hover:shadow-sm"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    isActive
                      ? "bg-[#00684A] text-white"
                      : "bg-[#F1F5F3] text-[#3D4F58] group-hover:bg-[#E3FCF7]"
                  }`}
                >
                  {stage.number}
                </span>
                <span className="min-w-0">
                  <Body
                    as="span"
                    weight="medium"
                    className={isActive ? "text-[#00684A]" : "text-[#112733]"}
                  >
                    {stage.label}
                  </Body>
                  <Description className="mt-1 text-sm">
                    {stage.description}
                  </Description>
                </span>
              </Link>
              {index < STORY_STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute -right-2 top-1/2 z-10 hidden h-px w-4 bg-gray-300 md:block"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
