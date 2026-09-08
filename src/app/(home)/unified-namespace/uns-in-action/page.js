"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@leafygreen-ui/icon";
import FactorySourceBar from "@/components/factorySourceBar/FactorySourceBar";
import OperationsWorkspace from "@/components/unsAction/OperationsWorkspace";
import ConditionWorkspace from "@/components/unsAction/ConditionWorkspace";
import AnalyticsDashboard from "@/components/unsAction/AnalyticsDashboard";
import DocumentModal from "@/components/unsAction/DocumentModal";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";

export default function UnsInActionPage() {
  const {
    snapshot,
    selectedOrderId,
    selectOrder,
    orderDataLoading,
  } = useFactoryData();
  const router = useRouter();
  const searchParams = useSearchParams();
  const analyticsOrderId = searchParams.get("order");
  const showAnalytics =
    searchParams.get("view") === "analytics" && Boolean(analyticsOrderId);
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
    if (
      showAnalytics &&
      analyticsOrderId !== selectedOrderId &&
      snapshot.orders.some((order) => order.order_id === analyticsOrderId)
    ) {
      selectOrder(analyticsOrderId);
    }
  }, [
    analyticsOrderId,
    selectedOrderId,
    selectOrder,
    showAnalytics,
    snapshot.orders,
  ]);

  const openAnalytics = useCallback(
    (orderId) => {
      selectOrder(orderId);
      router.push(
        `/unified-namespace/uns-in-action?view=analytics&order=${encodeURIComponent(orderId)}`,
      );
    },
    [router, selectOrder],
  );

  const analyticsOrder =
    snapshot.orders.find((order) => order.order_id === analyticsOrderId) ||
    snapshot.selectedOrder;

  return (
    <main className="w-full pb-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-2 py-4 sm:px-4 lg:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={
              showAnalytics
                ? "/unified-namespace/uns-in-action"
                : "/unified-namespace"
            }
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
          >
            <Icon glyph="ArrowLeft" size={16} />
            <span>
              {showAnalytics ? "Back to operations" : "Back to overview"}
            </span>
          </Link>
          <FactorySourceBar compact />
        </div>

        {!showAnalytics ? (
          <OperationsWorkspace
            onOpenDocument={openDocument}
            onOpenAnalytics={openAnalytics}
          >
            <ConditionWorkspace />
          </OperationsWorkspace>
        ) : (
          <div className="grid gap-5">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D8E3DF] bg-white px-5 py-4 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3FCF7] text-[#00684A]">
                  <Icon glyph="Charts" size={20} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#112733]">
                    Order analytics
                  </p>
                  <p className="truncate text-sm text-[#5C6C75]">
                    {analyticsOrderId}
                    {analyticsOrder?.customer
                      ? ` · ${analyticsOrder.customer}`
                      : ""}
                  </p>
                </div>
              </div>
            </section>

            <AnalyticsDashboard
              analytics={snapshot.analytics}
              isLoading={
                analyticsOrderId !== selectedOrderId ||
                orderDataLoading.analytics
              }
              onOpenPipeline={(title, pipeline) =>
                openDocument(
                  `${title} aggregation pipeline`,
                  `db.${snapshot.analytics?.pipelines?.collection || "production_units"}.aggregate()`,
                  pipeline,
                )
              }
            />
          </div>
        )}
      </div>

      <DocumentModal
        open={document.open}
        title={document.title}
        subtitle={document.subtitle}
        value={document.value}
        onClose={closeDocument}
      />
    </main>
  );
}
