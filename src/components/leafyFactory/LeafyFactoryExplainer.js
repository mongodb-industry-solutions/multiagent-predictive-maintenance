"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@leafygreen-ui/icon";
import DocumentModal from "@/components/unsAction/DocumentModal";
import NextStepButton from "@/components/nextStepButton/NextStepButton";
import {
  ARCHITECTURE_DETAIL_FLOWS,
  ARCHITECTURE_DETAIL_GROUPS,
  ARCHITECTURE_FLOWS,
  ARCHITECTURE_MODULES,
  FACTORY_SOURCE_URL,
  PROCESS_PHASES,
} from "@/lib/const/leafyFactory";
import ArchitectureExplorer from "./ArchitectureExplorer";
import ProcessExplorer from "./ProcessExplorer";

export default function LeafyFactoryExplainer() {
  const [selectedMachineId, setSelectedMachineId] = useState(
    PROCESS_PHASES[0].machines[0].id
  );
  const [showNextStep, setShowNextStep] = useState(false);
  const endOfPageRef = useRef(null);
  const [document, setDocument] = useState({
    open: false,
    title: "",
    subtitle: "",
    value: null,
  });

  const openDocument = useCallback((title, subtitle, value) => {
    setDocument({ open: true, title, subtitle, value });
  }, []);
  const closeDocument = useCallback(() => {
    setDocument((current) => ({ ...current, open: false }));
  }, []);

  useEffect(() => {
    const endOfPage = endOfPageRef.current;
    if (!endOfPage) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowNextStep(entry.isIntersecting);
      },
      { threshold: 1 }
    );
    observer.observe(endOfPage);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="w-full pb-4">
      <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-2 py-4 sm:px-4 lg:px-6">
        <div className="flex items-center">
          <Link
            href="/unified-namespace"
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
          >
            <Icon glyph="ArrowLeft" size={16} />
            Back to overview
          </Link>
        </div>

        <ProcessExplorer
          phases={PROCESS_PHASES}
          selectedMachineId={selectedMachineId}
          onSelectMachine={setSelectedMachineId}
          onOpenDocument={openDocument}
        />
        <ArchitectureExplorer
          modules={ARCHITECTURE_MODULES}
          flows={ARCHITECTURE_FLOWS}
          detailGroups={ARCHITECTURE_DETAIL_GROUPS}
          detailFlows={ARCHITECTURE_DETAIL_FLOWS}
          sourceUrl={FACTORY_SOURCE_URL}
          onOpenDocument={openDocument}
        />
        <div
          ref={endOfPageRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        />
      </div>

      <DocumentModal
        open={document.open}
        title={document.title}
        subtitle={document.subtitle}
        value={document.value}
        onClose={closeDocument}
      />
      {showNextStep && (
        <NextStepButton
          href="/unified-namespace/uns-in-action"
          eyebrow="Next use case"
          label="Continue to UNS in Action"
        />
      )}
    </main>
  );
}
