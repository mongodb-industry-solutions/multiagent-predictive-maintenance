"use client";

import React, { useCallback, useEffect, useState } from "react";
import FactorySourceSelector from "@/components/factorySourceSelector/FactorySourceSelector";
import AuditTrailWorkspace from "@/components/auditTrail/AuditTrailWorkspace";
import {
  fetchActiveOrders,
  fetchFactoryStatus,
} from "@/lib/factory/factoryClient";
import {
  buildLocalSnapshot,
  createInitialLocalFactoryState,
  restoreLocalFactoryState,
} from "@/lib/factory/localFactory";

const LOCAL_STORAGE_KEY = "leafy-local-factory-state";

function loadBrowserLocalSnapshot() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const state = raw
      ? restoreLocalFactoryState(JSON.parse(raw))
      : createInitialLocalFactoryState();
    return buildLocalSnapshot(state);
  } catch {
    return buildLocalSnapshot(createInitialLocalFactoryState());
  }
}

export default function AuditTrailPage() {
  const [dataSource, setDataSource] = useState("leafy");
  const [leafyAvailable, setLeafyAvailable] = useState(null);
  const [isSourceChecking, setIsSourceChecking] = useState(true);
  const [localSnapshot, setLocalSnapshot] = useState(null);
  const [liveOrderSummary, setLiveOrderSummary] = useState(null);

  const checkLeafy = useCallback(async (signal) => {
    setIsSourceChecking(true);
    try {
      await fetchFactoryStatus({ signal });
      if (signal?.aborted) return false;
      setLeafyAvailable(true);
      try {
        const orders = await fetchActiveOrders();
        if (!signal?.aborted && Array.isArray(orders) && orders.length > 0) {
          setLiveOrderSummary(orders[0]);
        }
      } catch {
        // Optional order badge enrichment
      }
      return true;
    } catch (error) {
      if (error?.name === "AbortError") return false;
      setLeafyAvailable(false);
      return false;
    } finally {
      if (!signal?.aborted) setIsSourceChecking(false);
    }
  }, []);

  useEffect(() => {
    setLocalSnapshot(loadBrowserLocalSnapshot());
    const controller = new AbortController();
    checkLeafy(controller.signal).then((available) => {
      if (!controller.signal.aborted) {
        setDataSource(available ? "leafy" : "local");
      }
    });
    return () => controller.abort();
  }, [checkLeafy]);

  const handleSourceChange = async (nextSource) => {
    if (nextSource === "leafy" && leafyAvailable !== true) {
      const ok = await checkLeafy();
      if (!ok) return;
    }
    if (nextSource === "local") {
      setLocalSnapshot(loadBrowserLocalSnapshot());
    }
    setDataSource(nextSource);
  };

  const activeFactoryOrder =
    dataSource === "leafy"
      ? liveOrderSummary
      : localSnapshot?.selectedOrder || localSnapshot?.orders?.[0] || null;

  return (
    <main className="flex h-full min-h-0 w-full flex-col pb-4">
      <AuditTrailWorkspace
        dataSource={dataSource}
        factorySnapshot={dataSource === "local" ? localSnapshot : null}
        activeFactoryOrder={activeFactoryOrder}
        toolbarRight={
          <FactorySourceSelector
            source={dataSource}
            onChange={handleSourceChange}
            connected={dataSource === "local" || leafyAvailable === true}
            isChecking={isSourceChecking}
            menuAlign="right"
          />
        }
      />
    </main>
  );
}
