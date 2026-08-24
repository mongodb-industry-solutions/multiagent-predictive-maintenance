"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { Body, Description } from "@leafygreen-ui/typography";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";

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
    selectedOrderId,
    selectOrder,
    snapshot,
  } = useFactoryData();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeMenu = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
      if (
        event.type === "mousedown" &&
        !menuRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenu);
    window.addEventListener("keydown", closeMenu);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      window.removeEventListener("keydown", closeMenu);
    };
  }, [menuOpen]);

  if (compact) {
    return (
      <div ref={menuRef} className="relative z-30 self-start">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="inline-flex h-10 items-center gap-2.5 rounded-full border border-[#D8E3DF] bg-white px-4 text-sm font-medium text-[#112733] shadow-sm hover:border-[#00A35C]"
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              connected
                ? "bg-[#00A35C]"
                : isRefreshing
                  ? "animate-pulse bg-[#889397]"
                  : "bg-[#DB6C00]"
            }`}
          />
          {source === sources.LEAFY ? "Leafy Factory" : "Local simulation"}
          <Icon glyph={menuOpen ? "ChevronUp" : "ChevronDown"} size={14} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-12 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-[#D8E3DF] bg-white p-3 shadow-xl"
          >
            <Body
              weight="medium"
              className="px-2 pb-2 text-xs uppercase tracking-[0.12em] text-[#5C6C75]"
            >
              Data source
            </Body>
            <div className="grid gap-1">
              {[
                [sources.LEAFY, "Leafy Factory", "Cloud"],
                [sources.LOCAL, "Local simulation", "Laptop"],
              ].map(([value, label, glyph]) => (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={source === value}
                  onClick={() => {
                    setSource(value);
                    setMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                    source === value
                      ? "bg-[#E3FCF7] text-[#00684A]"
                      : "text-[#3D4F58] hover:bg-[#F1F5F3]"
                  }`}
                >
                  <Icon glyph={glyph} size={17} />
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  {source === value && (
                    <Icon glyph="Checkmark" size={16} />
                  )}
                </button>
              ))}
            </div>

            {snapshot.activeOrders.length > 0 && (
              <label className="mt-3 grid gap-1.5 border-t border-[#D8E3DF] px-2 pt-3 text-xs font-medium uppercase tracking-[0.1em] text-[#5C6C75]">
                Active order
                <select
                  value={selectedOrderId || ""}
                  onChange={(event) => selectOrder(event.target.value)}
                  className="h-10 w-full min-w-0 rounded-lg border border-[#C1C7C6] bg-white px-3 text-sm normal-case tracking-normal text-[#112733]"
                >
                  {snapshot.activeOrders.map((order) => (
                    <option key={order.order_id} value={order.order_id}>
                      {order.order_id} · {order.customer || "Factory order"}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-3 grid gap-2 border-t border-[#D8E3DF] px-2 pt-3">
              {[
                ["Current order", selectedOrderId || "None selected"],
                ["Live events", snapshot.events.length],
                ["Production units", snapshot.productionUnits.length],
                ["Active orders", snapshot.activeOrders.length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-[#5C6C75]">{label}</span>
                  <span className="max-w-[180px] truncate font-medium text-[#112733]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
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
