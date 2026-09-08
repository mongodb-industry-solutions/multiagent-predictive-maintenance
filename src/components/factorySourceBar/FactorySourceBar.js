"use client";

import Icon from "@leafygreen-ui/icon";
import { Body, Description } from "@leafygreen-ui/typography";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";
import FactorySourceSelector from "@/components/factorySourceSelector/FactorySourceSelector";

export default function FactorySourceBar({ compact = false }) {
  const {
    source,
    setSource,
    sources,
    connected,
    error,
    isRefreshing,
    lastUpdated,
    refresh,
  } = useFactoryData();

  if (compact) {
    return (
      <FactorySourceSelector
        source={source}
        onChange={setSource}
        connected={connected}
        isChecking={isRefreshing}
      />
    );
  }

  return (
    <section className="rounded-xl border border-[#D8E3DF] bg-white p-3 shadow-sm">
      <div
        className={`flex gap-3 ${
          compact
            ? "flex-wrap items-center justify-between"
            : "flex-col lg:flex-row lg:items-center lg:justify-between"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="inline-flex rounded-lg bg-[#E8EDEB] p-1"
            role="group"
            aria-label="Factory data source"
          >
            {[
              [sources.LOCAL, "Local simulation", "Laptop"],
              [sources.LEAFY, "Leafy Factory", "Cloud"],
            ].map(([value, label, glyph]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSource(value)}
                aria-pressed={source === value}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  source === value
                    ? "bg-white text-[#00684A] shadow-sm"
                    : "text-[#5C6C75] hover:text-[#112733]"
                }`}
              >
                <Icon glyph={glyph} size={16} />
                {label}
              </button>
            ))}
          </div>
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
              connected
                ? "bg-[#E3FCF7] text-[#00684A]"
                : "bg-[#FFF1E5] text-[#944F01]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "bg-[#00A35C]" : "bg-[#DB6C00]"
              }`}
            />
            {connected ? "Connected" : "Unavailable"}
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 text-right">
            <Body weight="medium" className="text-sm text-[#112733]">
              {source === sources.LOCAL
                ? "Resilient browser simulation"
                : "External simulator API"}
            </Body>
            <Description className="truncate text-xs">
              {error ||
                (lastUpdated
                  ? `Updated ${lastUpdated.toLocaleTimeString()}`
                  : "Waiting for first snapshot")}
            </Description>
          </div>
          <button
            type="button"
            onClick={() => refresh()}
            disabled={isRefreshing}
            aria-label="Refresh factory data"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#C1C7C6] text-[#00684A] hover:bg-[#E3FCF7] disabled:opacity-50"
          >
            <Icon
              glyph="Refresh"
              size={17}
              className={isRefreshing ? "animate-spin" : ""}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
