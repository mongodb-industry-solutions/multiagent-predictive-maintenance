"use client";

import Link from "next/link";
import Icon from "@leafygreen-ui/icon";
import FactorySourceSelector from "@/components/factorySourceSelector/FactorySourceSelector";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";
import FactoryChat from "@/components/unsChat/FactoryChat";
import useActiveOrderGuardian from "@/components/unsChat/useActiveOrderGuardian";

export default function FactoryChatPage() {
  const {
    source,
    setSource,
    connected,
    isRefreshing,
    snapshot,
  } = useFactoryData();
  useActiveOrderGuardian();
  const activeOrderCount = snapshot.activeOrders?.length || 0;

  return (
    <main className="flex h-full min-h-0 w-full flex-col gap-3 pb-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Link
          href="/ai-workflows"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
        >
          <Icon glyph="ArrowLeft" size={16} />
          <span>Back to overview</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#D8E3DF] bg-[#F8FAF9] px-3 py-2 text-xs font-medium text-[#3D4F58]">
            <Icon glyph="Diagram" size={14} />
            <span className="text-base font-semibold text-[#112733]">
              {activeOrderCount}
            </span>
            active {activeOrderCount === 1 ? "order" : "orders"}
          </div>
          <FactorySourceSelector
            source={source}
            onChange={setSource}
            connected={connected}
            isChecking={isRefreshing}
            menuAlign="right"
          />
        </div>
      </div>
      <FactoryChat />
    </main>
  );
}
