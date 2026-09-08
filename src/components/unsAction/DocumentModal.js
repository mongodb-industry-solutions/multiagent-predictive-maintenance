"use client";

import { useEffect } from "react";
import Icon from "@leafygreen-ui/icon";
import dynamic from "next/dynamic";
import { H3, Description } from "@leafygreen-ui/typography";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((mod) => mod.Code),
  { ssr: false }
);

export default function DocumentModal({ open, title, subtitle, value, onClose }) {
  const serialized = JSON.stringify(value, null, 2);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="factory-document-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#061E2E]/80 p-4 sm:p-8"
    >
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#D8E3DF] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <H3 id="factory-document-title" className="truncate text-[#112733]">
              {title}
            </H3>
            {subtitle && (
              <Description className="mt-1 truncate">{subtitle}</Description>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close document"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C1C7C6] text-[#112733] hover:bg-[#F1F5F3]"
            >
              <Icon glyph="X" size={18} />
            </button>
          </div>
        </header>
        <div className="cardlist-scrollbar min-h-[320px] flex-1 overflow-auto p-5">
          <Code language="json">{serialized}</Code>
        </div>
      </div>
    </div>
  );
}
