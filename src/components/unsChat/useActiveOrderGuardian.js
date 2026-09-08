"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFactoryData } from "@/components/factoryDataProvider/FactoryDataProvider";

const ORDER_QUANTITY = 20;
const CREATED_ORDER_GRACE_MS = 7000;
const PREWARM_REMAINING_UNITS = 5;
const MAX_CREATION_RETRY_MS = 8000;
const REMOTE_HANDOFF_POLL_MS = 1000;

function deliveryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function createSessionMarker() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().slice(0, 8).toUpperCase();
  }
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function isNearCompletion(order) {
  const quantity = Number(order?.quantity || order?.runtime?.quantity);
  const currentBatch = Number(
    order?.runtime?.batch_id ??
      order?.runtime?.batchId ??
      order?.completed_units
  );
  return (
    Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(currentBatch) &&
    currentBatch >= Math.max(1, quantity - PREWARM_REMAINING_UNITS)
  );
}

export default function useActiveOrderGuardian() {
  const {
    source,
    sources,
    isReady,
    connected,
    snapshot,
    startBackgroundOrder,
    stopBackgroundOrder,
  } = useFactoryData();
  const markerRef = useRef(null);
  const [checkToken, setCheckToken] = useState(0);
  const sourceRef = useRef(source);
  const ownedOrdersRef = useRef(new Map());
  const creationRef = useRef(null);
  const nextCreationAttemptRef = useRef(0);
  const creationFailuresRef = useRef(0);
  const generationRef = useRef(0);
  const handoffTimerRef = useRef(null);
  const stopBackgroundOrderRef = useRef(stopBackgroundOrder);
  stopBackgroundOrderRef.current = stopBackgroundOrder;

  if (!markerRef.current) markerRef.current = createSessionMarker();

  const releaseOwnedOrders = useCallback((keepalive = false) => {
    const ownedOrders = [...ownedOrdersRef.current.values()];
    ownedOrdersRef.current.clear();
    ownedOrders.forEach((owned) => {
      stopBackgroundOrderRef.current(owned.orderId, {
        orderSource: owned.source,
        keepalive,
      }).catch(() => {
        // Cleanup is best effort; the simulator will still complete the order.
      });
    });
  }, []);

  useEffect(() => {
    if (sourceRef.current === source) return;
    generationRef.current += 1;
    window.clearTimeout(handoffTimerRef.current);
    releaseOwnedOrders(true);
    sourceRef.current = source;
    creationFailuresRef.current = 0;
    nextCreationAttemptRef.current = 0;
  }, [releaseOwnedOrders, source]);

  useEffect(() => {
    const handlePageHide = () => {
      generationRef.current += 1;
      window.clearTimeout(handoffTimerRef.current);
      releaseOwnedOrders(true);
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      generationRef.current += 1;
      window.clearTimeout(handoffTimerRef.current);
      releaseOwnedOrders(true);
    };
  }, [releaseOwnedOrders]);

  useEffect(() => {
    const activeOrders = Array.isArray(snapshot.activeOrders)
      ? snapshot.activeOrders
      : [];
    const sourceReady =
      isReady && (source === sources.LOCAL || connected);

    if (!sourceReady) return;

    const activeIds = new Set(
      activeOrders.map((order) => order.order_id).filter(Boolean)
    );
    ownedOrdersRef.current.forEach((owned, orderId) => {
      if (owned.source !== source) return;
      if (activeIds.has(orderId)) {
        owned.seenActive = true;
      } else if (
        owned.seenActive ||
        Date.now() - owned.createdAt >= CREATED_ORDER_GRACE_MS
      ) {
        ownedOrdersRef.current.delete(orderId);
      }
    });

    const needsOrder =
      activeOrders.length === 0 ||
      (activeOrders.length === 1 && isNearCompletion(activeOrders[0]));
    if (!needsOrder) return;

    if (creationRef.current) return;
    if (Date.now() < nextCreationAttemptRef.current) return;

    const generation = generationRef.current;
    const orderSource = source;

    const creation = startBackgroundOrder({
      product_id: "1",
      quantity: ORDER_QUANTITY,
      customer: "Factory Chat Demo",
      customer_po: `UNS-CHAT-${markerRef.current}`,
      delivery_date: deliveryDate(),
    })
      .then((order) => {
        if (
          generation !== generationRef.current ||
          sourceRef.current !== orderSource
        ) {
          return stopBackgroundOrderRef.current(order.order_id, {
            orderSource,
            keepalive: true,
          });
        }
        if (
          orderSource === sources.LOCAL ||
          order.guardian_created === true
        ) {
          ownedOrdersRef.current.set(order.order_id, {
            orderId: order.order_id,
            source: orderSource,
            createdAt: Date.now(),
            seenActive: true,
          });
        } else if (
          activeOrders.length === 1 &&
          isNearCompletion(activeOrders[0])
        ) {
          window.clearTimeout(handoffTimerRef.current);
          handoffTimerRef.current = window.setTimeout(
            () => setCheckToken((value) => value + 1),
            REMOTE_HANDOFF_POLL_MS
          );
        }
        creationFailuresRef.current = 0;
        nextCreationAttemptRef.current = 0;
        return order;
      })
      .catch(() => {
        if (generation === generationRef.current) {
          creationFailuresRef.current += 1;
          const retryMs = Math.min(
            1000 * 2 ** (creationFailuresRef.current - 1),
            MAX_CREATION_RETRY_MS
          );
          nextCreationAttemptRef.current = Date.now() + retryMs;
        }
      })
      .finally(() => {
        if (creationRef.current === creation) creationRef.current = null;
      });
    creationRef.current = creation;
  }, [
    connected,
    checkToken,
    isReady,
    snapshot.activeOrders,
    source,
    sources.LEAFY,
    sources.LOCAL,
    startBackgroundOrder,
  ]);
}
