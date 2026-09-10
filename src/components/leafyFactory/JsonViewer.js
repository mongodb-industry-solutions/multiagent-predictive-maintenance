"use client";

import dynamic from "next/dynamic";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((module) => module.Code),
  { ssr: false }
);

export default function JsonViewer({ label, value, maxHeight = "360px" }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[#244956] bg-[#071E27] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.13em] text-[#8FE9BA]">
          JSON
        </span>
        <span className="truncate text-right text-xs text-white/55">
          {label}
        </span>
      </div>
      <div
        className="cardlist-scrollbar min-w-0 overflow-auto p-3"
        style={{ maxHeight }}
      >
        <Code language="json">{JSON.stringify(value, null, 2)}</Code>
      </div>
    </div>
  );
}
