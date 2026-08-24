"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@leafygreen-ui/icon";
import FactorySourceBar from "@/components/factorySourceBar/FactorySourceBar";
import OperationsWorkspace from "@/components/unsAction/OperationsWorkspace";
import ConditionWorkspace from "@/components/unsAction/ConditionWorkspace";
import AnalyticsDashboard from "@/components/unsAction/AnalyticsDashboard";
import DocumentModal from "@/components/unsAction/DocumentModal";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";

export default function UnsInActionPage() {
  const { snapshot } = useFactoryData();
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const activeView = ["operations", "condition", "analytics"].includes(
    requestedView
  )
    ? requestedView
    : "operations";
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

  return (
    <main className="w-full pb-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-2 py-4 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/unified-namespace"
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
          >
            <Icon glyph="ArrowLeft" size={16} />
            <span className="hidden sm:inline">Back to overview</span>
          </Link>
          <FactorySourceBar compact />
        </div>

        {activeView === "operations" && (
          <OperationsWorkspace onOpenDocument={openDocument} />
        )}
        {activeView === "condition" && <ConditionWorkspace />}
        {activeView === "analytics" && (
          <AnalyticsDashboard
            analytics={snapshot.analytics}
            onOpenPipeline={(title, pipeline) =>
              openDocument(
                `${title} aggregation pipeline`,
                `db.${snapshot.analytics?.pipelines?.collection || "production_units"}.aggregate()`,
                pipeline
              )
            }
          />
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
