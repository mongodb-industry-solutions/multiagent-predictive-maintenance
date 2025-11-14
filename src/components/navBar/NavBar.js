"use client";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Body } from "@leafygreen-ui/typography";
import InfoWizard from "../infoWizard/InfoWizard";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import { TALK_TRACK } from "../../lib/const/talkTrack";

export default function Navbar() {
  const pathname = usePathname();
  const [infoOpen, setInfoOpen] = useState(false);
  const navLinks = [
    { href: "/", label: "Demo Overview" },
    { href: "/root-cause-analysis", label: "Root Cause Analysis" },
    { href: "/transportation-planning", label: "Transportation Planning" },
    { href: "/risk-analysis", label: "Risk Analysis" },
    { href: "/agent-sandbox", label: "Agent Sandbox" },
  ];

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <nav className="w-full bg-white shadow-md fixed top-0 left-0">
        {/* Logo absolutely positioned in the top-left corner */}
        <div className="absolute left-0 top-0 pl-5 pt-2">
          <Link
            href="/"
            className="flex items-center"
            style={{ width: 175, height: 40, position: "relative" }}
          >
            <Image
              src="/img/logo.png"
              alt="Multiagent Supply Chain Logo"
              fill
              style={{ objectFit: "contain" }}
              sizes="500px"
              priority
            />
          </Link>
        </div>
        {/* Main navbar content centered horizontally */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-16 relative">
          <div className="w-full flex justify-center">
            <div className="flex space-x-6">
              {navLinks.map(({ href, label }) => {
                const selected =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`transition-colors px-2 py-1 rounded-md ${
                      selected
                        ? "bg-[#E3FCF7]"
                        : "text-gray-700 hover:text-blue-600"
                    }`}
                  >
                    <Body
                      className="m-0 p-0"
                      as="span"
                      baseFontSize={16}
                      weight={selected ? "medium" : "regular"}
                      style={selected ? { color: "#00684A" } : {}}
                    >
                      {label}
                    </Body>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* InfoWizard absolutely positioned in the top-right corner to mirror the logo on the left */}
        <div className="absolute right-0 top-0 pr-5 pt-2">
          <div className="flex items-center">
            <InfoWizard
              open={infoOpen}
              setOpen={setInfoOpen}
              sections={TALK_TRACK}
            />
          </div>
        </div>
      </nav>
    </LeafyGreenProvider>
  );
}
