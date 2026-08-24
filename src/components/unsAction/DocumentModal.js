"use client";

import { useEffect, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { H3, Body, Description } from "@leafygreen-ui/typography";

export default function DocumentModal({ open, title, subtitle, value, onClose }) {
  const [copied, setCopied] = useState(false);
  const serialized = JSON.stringify(value, null, 2);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copyDocument = async () => {
    await navigator.clipboard.writeText(serialized);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

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
              onClick={copyDocument}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#C1C7C6] px-3 text-sm font-medium text-[#00684A] hover:bg-[#E3FCF7]"
            >
              <Icon glyph={copied ? "CheckmarkWithCircle" : "Copy"} size={16} />
              {copied ? "Copied" : "Copy"}
            </button>
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

        <div className="flex min-h-0 flex-1 flex-col bg-[#0B2A3C]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-2">
            <Body className="font-mono text-xs text-[#B8E4D8]">
              MongoDB document
            </Body>
            <Body className="text-xs text-[#B8E4D8]">
              {serialized.split("\n").length} lines
            </Body>
          </div>
          <pre className="cardlist-scrollbar min-h-[320px] flex-1 overflow-auto p-5 font-mono text-xs leading-6 text-[#E3FCF7] sm:text-sm">
            {serialized}
          </pre>
        </div>
      </div>
    </div>
  );
}
