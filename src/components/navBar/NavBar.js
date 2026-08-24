"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Icon from "@leafygreen-ui/icon";
import { Body } from "@leafygreen-ui/typography";
import { STORY_STAGES, getStageForPath } from "../../lib/const/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const activeStage = getStageForPath(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav className="fixed left-0 top-0 z-50 h-16 w-full border-b border-[#D8E3DF] bg-white shadow-sm">
        <div className="relative mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-3 sm:px-5">
          <Link
            href="/"
            aria-label="Leafy Factory home"
            className="relative block h-10 w-[135px] shrink-0 sm:w-[165px]"
          >
            <Image
              src="/img/logo.png"
              alt="MongoDB"
              fill
              className="object-contain object-left"
              sizes="165px"
              priority
            />
          </Link>

          <div className="absolute left-1/2 hidden h-full -translate-x-1/2 items-center gap-6 lg:flex xl:gap-10">
            {STORY_STAGES.map((stage) => {
              const isActive = activeStage?.id === stage.id;

              return (
                <Link
                  key={stage.id}
                  href={stage.href}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-[#E3FCF7] text-[#00684A]"
                      : "text-[#3D4F58] hover:bg-[#F1F5F3]"
                  }`}
                >
                  <Body
                    as="span"
                    weight={isActive ? "medium" : "regular"}
                  >
                    {stage.label}
                  </Body>
                </Link>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((value) => !value)}
              className="flex h-10 items-center gap-1 rounded-lg border border-[#C1C7C6] px-2 text-[#112733] lg:hidden"
            >
              <Icon glyph={mobileOpen ? "X" : "Menu"} size={18} />
              <span className="hidden text-sm sm:inline">Menu</span>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="grid max-h-[calc(100vh-4rem)] gap-2 overflow-y-auto border-t border-[#D8E3DF] bg-white p-3 shadow-xl lg:hidden">
            {STORY_STAGES.map((stage) => (
              <Link
                key={stage.id}
                href={stage.href}
                className={`block rounded-lg px-3 py-2 ${
                  activeStage?.id === stage.id
                    ? "bg-[#E3FCF7] text-[#00684A]"
                    : "hover:bg-[#F1F5F3]"
                }`}
              >
                <Body weight="medium">{stage.label}</Body>
              </Link>
            ))}
          </div>
        )}
    </nav>
  );
}
