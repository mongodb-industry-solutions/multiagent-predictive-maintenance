"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@leafygreen-ui/icon";
import { Body } from "@leafygreen-ui/typography";
import { FACTORY_SOURCES } from "@/lib/factory/constants";

const SOURCE_OPTIONS = [
  [FACTORY_SOURCES.LEAFY, "Leafy Factory", "Cloud"],
  [FACTORY_SOURCES.LOCAL, "Local simulation", "Laptop"],
];

export default function FactorySourceSelector({
  source,
  onChange,
  connected,
  isChecking = false,
  disabled = false,
  className = "",
  buttonClassName = "",
  menuAlign = "right",
}) {
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

  return (
    <div ref={menuRef} className={`relative z-30 self-start ${className}`}>
      <button
        type="button"
        onClick={() => setMenuOpen((current) => !current)}
        disabled={disabled}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        className={`inline-flex h-10 items-center gap-2.5 rounded-full border border-[#D8E3DF] bg-white px-4 text-sm font-medium text-[#112733] shadow-sm hover:border-[#00A35C] disabled:cursor-wait disabled:opacity-60 ${buttonClassName}`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            connected
              ? "bg-[#00A35C]"
              : isChecking
                ? "animate-pulse bg-[#889397]"
                : "bg-[#DB6C00]"
          }`}
        />
        {source === FACTORY_SOURCES.LEAFY
          ? "Leafy Factory"
          : "Local simulation"}
        <Icon glyph={menuOpen ? "ChevronUp" : "ChevronDown"} size={14} />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className={`absolute top-12 w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-[#D8E3DF] bg-white p-3 shadow-xl ${
            menuAlign === "left" ? "left-0" : "right-0"
          }`}
        >
          <Body
            weight="medium"
            className="px-2 pb-2 text-xs uppercase tracking-[0.12em] text-[#5C6C75]"
          >
            Data source
          </Body>
          <div className="grid gap-1">
            {SOURCE_OPTIONS.map(([value, label, glyph]) => (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={source === value}
                onClick={() => {
                  onChange(value);
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
                {source === value && <Icon glyph="Checkmark" size={16} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
