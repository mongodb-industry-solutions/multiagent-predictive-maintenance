"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createRemoteOrder,
  fetchRemoteSnapshot,
  fetchScadaState,
  sendRemoteMetrics,
  setRemoteThresholds,
  stopRemoteOrder,
} from "@/lib/factory/factoryClient";
import {
  advanceLocalFactory,
  buildLocalSnapshot,
  createInitialLocalFactoryState,
  createLocalOrder,
  restoreLocalFactoryState,
  sendLocalMetrics,
  setLocalThresholds,
  stopLocalOrder,
} from "@/lib/factory/localFactory";
import {
  DEFAULT_THRESHOLDS,
  FACTORY_SOURCES,
  FACTORY_STATIONS,
  PRODUCTS,
} from "@/lib/factory/constants";
import {
  isRunningOrder,
  markSessionOrderStopped,
  reconcileSessionOrders,
  toSessionOrder,
} from "@/lib/factory/sessionOrders";
import {
  buildUnitsFromEvents,
  mergeEvents,
  mergeUnits,
  scadaCompletedBatches,
  scadaEvents,
} from "@/lib/factory/sessionLedger";

const LOCAL_STATE_STORAGE_KEY = "leafy-local-factory-state";
const SESSION_ORDERS_STORAGE_KEY = "leafy-session-orders";
const SESSION_LEDGER_STORAGE_KEY = "leafy-session-ledger";
const SCADA_POLL_GAP_MS = 250;

function readSessionJson(key, fallback) {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeSessionJson(key, value) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore disabled or full browser storage.
  }
}
const HEARTBEAT_FAILURES_BEFORE_FALLBACK = 2;
const EMPTY_ORDER_DATA_LOADING = {
  events: false,
  productionUnits: false,
  alerts: false,
  analytics: false,
  scadaState: false,
  thresholds: false,
};

const EMPTY_SNAPSHOT = {
  status: null,
  activeOrders: [],
  orders: [],
  selectedOrder: null,
  scadaState: null,
  liveProductionUnit: null,
  events: [],
  productionUnits: [],
  alerts: [],
  analytics: {
    kpis: {},
    yield: { pass: 0, fail: 0 },
    throughput: [],
    cycle_time_trend: [],
    grade_distribution: {},
    defects_by_station: [],
    pipelines: {},
  },
  thresholds: DEFAULT_THRESHOLDS,
  sensor: { temperature: 68, vibration: 24 },
};

const FactoryDataContext = createContext(null);

function enrichRemoteSnapshot(snapshot, sensor) {
  const scadaState = snapshot?.scadaState;
  if (!scadaState) return { ...snapshot, sensor };

  const liveEvents = Object.values(scadaState.last_results || {}).map(
    (event) => ({
      ...event,
      ts: event.ts || event.ts_iso,
      metrics:
        event.metrics && typeof event.metrics === "object" ? event.metrics : {},
    })
  );
  const eventMap = new Map();
  [...liveEvents, ...(snapshot.events || [])].forEach((event) => {
    const key =
      event.event_id ||
      `${event.order_id}-${event.batch_id}-${event.station}-${event.ts}`;
    eventMap.set(key, event);
  });
  const events = [...eventMap.values()]
    .sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
    .slice(0, 500);
  const latestBatchId =
    liveEvents.reduce(
      (latest, event) => Math.max(latest, Number(event.batch_id) || 0),
      0
    ) ||
    scadaState.batch_id ||
    1;
  const batchEvents = liveEvents.filter(
    (event) => Number(event.batch_id) === Number(latestBatchId)
  );
  const hasCompletedUnit = (snapshot.productionUnits || []).some(
    (unit) =>
      unit.order_id === scadaState.order_id &&
      Number(unit.batch_id) === Number(latestBatchId)
  );
  const liveProductionUnit =
    scadaState.status === "running" && !hasCompletedUnit
      ? {
          order_id: scadaState.order_id,
          batch_id: latestBatchId,
          status: "in_progress",
          final_status: "in_progress",
          started_at: scadaState.started_at || scadaState.created_at,
          updated_at: batchEvents[0]?.ts || new Date().toISOString(),
          current_stage_label: scadaState.current_stage_label,
          order: snapshot.selectedOrder || {},
          process: Object.fromEntries(
            batchEvents.map((event) => [
              event.station.toLowerCase().replaceAll(" ", "_"),
              { timestamp: event.ts, ...event.metrics },
            ])
          ),
          events: batchEvents,
        }
      : null;

  return {
    ...snapshot,
    sensor,
    events,
    liveProductionUnit,
  };
}

export default function FactoryDataProvider({ children }) {
  const [source, setSourceState] = useState(FACTORY_SOURCES.LEAFY);
  const [localState, setLocalState] = useState(null);
  const localStateRef = useRef(null);
  const [remoteSnapshot, setRemoteSnapshot] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrderIdRef = useRef(null);
  const [isOrderLoading, setIsOrderLoading] = useState(false);
  const [orderDataLoading, setOrderDataLoading] = useState(
    EMPTY_ORDER_DATA_LOADING
  );
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [remoteSensor, setRemoteSensor] = useState({
    temperature: 68,
    vibration: 24,
  });
  // Orders this user started against Leafy Factory in this browser session,
  // plus every machine event observed for them (keyed by order_id). The
  // reconciled list is exposed through `snapshot.orders`.
  const sessionOrdersRef = useRef([]);
  const ledgerRef = useRef({});
  const refreshingRef = useRef(false);
  const heartbeatFailuresRef = useRef(0);

  const commitLocalState = useCallback((nextState) => {
    localStateRef.current = nextState;
    setLocalState(nextState);
  }, []);

  const commitSessionOrders = useCallback((next) => {
    sessionOrdersRef.current = next;
    writeSessionJson(SESSION_ORDERS_STORAGE_KEY, next);
    // Drop ledger entries for orders no longer in the session.
    const keep = new Set(next.map((order) => order.order_id));
    const pruned = Object.fromEntries(
      Object.entries(ledgerRef.current).filter(([orderId]) => keep.has(orderId))
    );
    if (Object.keys(pruned).length !== Object.keys(ledgerRef.current).length) {
      ledgerRef.current = pruned;
      writeSessionJson(SESSION_LEDGER_STORAGE_KEY, pruned);
    }
  }, []);

  /**
   * Record a SCADA frame for `orderId`: the events it exposes go to the
   * ledger and its batch counter advances the session order's progress.
   */
  const recordScada = useCallback(
    (orderId, scadaState) => {
      if (!orderId || !scadaState) return;
      const incoming = scadaEvents(scadaState);
      if (incoming.length > 0) {
        const current = ledgerRef.current[orderId] || [];
        const merged = mergeEvents(current, incoming);
        if (merged.length !== current.length) {
          ledgerRef.current = { ...ledgerRef.current, [orderId]: merged };
          writeSessionJson(SESSION_LEDGER_STORAGE_KEY, ledgerRef.current);
        }
      }
      const orders = sessionOrdersRef.current;
      const order = orders.find((entry) => entry.order_id === orderId);
      if (!order) return;
      const completed = scadaCompletedBatches(scadaState, order.quantity);
      if (completed > (order.completed_units || 0)) {
        commitSessionOrders(
          orders.map((entry) =>
            entry.order_id === orderId
              ? { ...entry, completed_units: completed }
              : entry
          )
        );
      }
    },
    [commitSessionOrders]
  );

  /** Merge the ledger into a fetched snapshot and derive live/completed units. */
  const composeRemote = useCallback((base, orders, selectedOrder, sensor) => {
    let events = base.events || [];
    let productionUnits = base.productionUnits || [];
    if (selectedOrder?.order_id) {
      const recorded = ledgerRef.current[selectedOrder.order_id] || [];
      events = mergeEvents(events, recorded);
      productionUnits = mergeUnits(
        productionUnits,
        buildUnitsFromEvents(selectedOrder, recorded)
      );
    }
    return enrichRemoteSnapshot(
      { ...base, orders, selectedOrder, events, productionUnits },
      sensor
    );
  }, []);

  useEffect(() => {
    let restored = createInitialLocalFactoryState();
    try {
      const persisted = window.localStorage.getItem(LOCAL_STATE_STORAGE_KEY);
      if (persisted) restored = restoreLocalFactoryState(JSON.parse(persisted));
    } catch {
      // Storage is an enhancement; the in-memory simulation still works.
    }
    commitLocalState(restored);
    const orders = readSessionJson(SESSION_ORDERS_STORAGE_KEY, []);
    if (Array.isArray(orders)) sessionOrdersRef.current = orders;
    const ledger = readSessionJson(SESSION_LEDGER_STORAGE_KEY, {});
    if (ledger && typeof ledger === "object") ledgerRef.current = ledger;
    setIsReady(true);
  }, [commitLocalState]);

  useEffect(() => {
    if (!localState) return;
    try {
      window.localStorage.setItem(
        LOCAL_STATE_STORAGE_KEY,
        JSON.stringify(localState)
      );
    } catch {
      // Ignore full or disabled browser storage.
    }
  }, [localState]);

  useEffect(() => {
    if (!isReady || source !== FACTORY_SOURCES.LOCAL || !localState) return;
    const interval = window.setInterval(() => {
      const next = advanceLocalFactory(
        localStateRef.current || createInitialLocalFactoryState()
      );
      if (next !== localStateRef.current) commitLocalState(next);
      setLastUpdated(new Date());
    }, 1200);
    return () => window.clearInterval(interval);
  }, [commitLocalState, isReady, localState, source]);

  /**
   * Fetch the remote snapshot scoped to `orderId`, reconcile the session
   * order list against the live orders, and store the composed snapshot.
   */
  const loadRemote = useCallback(
    async (orderId, sensor = remoteSensor) => {
      const current = sessionOrdersRef.current;
      const known = current.some((order) => order.order_id === orderId);
      const remoteOrderId = known ? orderId : null;
      const applyPartial = (partial) => {
        if (orderId !== selectedOrderIdRef.current) return;
        const loadedFields = Object.keys(EMPTY_ORDER_DATA_LOADING).filter(
          (field) => Object.hasOwn(partial, field)
        );
        if (loadedFields.length) {
          setOrderDataLoading((loading) => ({
            ...loading,
            ...Object.fromEntries(loadedFields.map((field) => [field, false])),
          }));
        }
        if (partial.activeOrders) {
          commitSessionOrders(
            reconcileSessionOrders(sessionOrdersRef.current, partial.activeOrders)
          );
        }
        const orders = sessionOrdersRef.current;
        const selectedOrder =
          orders.find((order) => order.order_id === orderId) || null;
        setRemoteSnapshot((previous) =>
          previous
            ? composeRemote(
                { ...previous, ...partial },
                orders,
                selectedOrder,
                sensor
              )
            : previous
        );
      };
      const snapshot = await fetchRemoteSnapshot(remoteOrderId, applyPartial);
      commitSessionOrders(
        reconcileSessionOrders(sessionOrdersRef.current, snapshot.activeOrders)
      );
      // May advance the selected order's progress, so read the list after it.
      recordScada(known ? orderId : null, snapshot.scadaState);
      const orders = sessionOrdersRef.current;
      const selectedOrder =
        orders.find((order) => order.order_id === orderId) || null;
      // A slower request for a previously selected order must not replace the
      // currently selected order's view.
      if (orderId !== selectedOrderIdRef.current) return;
      setRemoteSnapshot(composeRemote(snapshot, orders, selectedOrder, sensor));
    },
    [commitSessionOrders, composeRemote, recordScada, remoteSensor]
  );

  const refresh = useCallback(
    async (orderId = selectedOrderId) => {
      if (source === FACTORY_SOURCES.LOCAL) {
        setLastUpdated(new Date());
        return;
      }
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      setIsRefreshing(true);
      try {
        await loadRemote(orderId);
        heartbeatFailuresRef.current = 0;
        setError(null);
        setLastUpdated(new Date());
      } catch (refreshError) {
        heartbeatFailuresRef.current += 1;
        setError(refreshError.message || "Leafy Factory is unavailable");
        if (
          heartbeatFailuresRef.current >=
          HEARTBEAT_FAILURES_BEFORE_FALLBACK
        ) {
          selectedOrderIdRef.current = null;
          setSelectedOrderId(null);
          setSourceState(FACTORY_SOURCES.LOCAL);
          setError(null);
        }
      } finally {
        refreshingRef.current = false;
        setIsRefreshing(false);
      }
    },
    [loadRemote, selectedOrderId, source]
  );

  useEffect(() => {
    if (!isReady || source !== FACTORY_SOURCES.LEAFY) return;
    refresh();
    const interval = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isReady, refresh, source]);

  const selectedOrderRunning = isRunningOrder(remoteSnapshot?.selectedOrder);

  useEffect(() => {
    if (
      source !== FACTORY_SOURCES.LEAFY ||
      !selectedOrderId ||
      !selectedOrderRunning
    ) {
      return;
    }
    // Stations cycle every ~200 ms and each frame only holds the latest event
    // per station, so sample as fast as the round trip allows: one request
    // in flight at a time, with a short pause between frames.
    let cancelled = false;
    let timer = null;
    const updateScada = async () => {
      if (cancelled) return;
      if (!document.hidden) {
        try {
          const scadaState = await fetchScadaState(selectedOrderId);
          if (cancelled) return;
          if (scadaState) {
            recordScada(selectedOrderId, scadaState);
            const orders = sessionOrdersRef.current;
            const selectedOrder =
              orders.find((order) => order.order_id === selectedOrderId) ||
              null;
            setRemoteSnapshot((current) =>
              current
                ? composeRemote(
                    { ...current, scadaState },
                    orders,
                    selectedOrder || current.selectedOrder,
                    current.sensor || remoteSensor
                  )
                : current
            );
          }
        } catch {
          // Main refresh exposes connection errors; keep the last SCADA frame.
        }
      }
      timer = window.setTimeout(updateScada, SCADA_POLL_GAP_MS);
    };
    updateScada();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    composeRemote,
    recordScada,
    remoteSensor,
    selectedOrderId,
    selectedOrderRunning,
    source,
  ]);

  const setSource = useCallback((nextSource) => {
    if (
      nextSource !== FACTORY_SOURCES.LOCAL &&
      nextSource !== FACTORY_SOURCES.LEAFY
    ) {
      return;
    }
    setError(null);
    selectedOrderIdRef.current = null;
    setSelectedOrderId(null);
    setIsOrderLoading(false);
    setOrderDataLoading(EMPTY_ORDER_DATA_LOADING);
    heartbeatFailuresRef.current = 0;
    setSourceState(nextSource);
  }, []);

  const selectOrder = useCallback(
    async (orderId) => {
      const nextOrderId = orderId || null;
      selectedOrderIdRef.current = nextOrderId;
      setSelectedOrderId(nextOrderId);
      if (source !== FACTORY_SOURCES.LEAFY) return;

      // Commit selection before fetching so the chosen card responds at once.
      // Clear order-scoped data rather than momentarily showing the prior
      // order's events, units, and alerts under the new selection.
      const selectedOrder =
        sessionOrdersRef.current.find(
          (order) => order.order_id === nextOrderId
        ) || null;
      setRemoteSnapshot((current) =>
        current
          ? composeRemote(
              {
                ...current,
                scadaState: null,
                events: [],
                productionUnits: [],
                alerts: [],
                analytics: EMPTY_SNAPSHOT.analytics,
              },
              sessionOrdersRef.current,
              selectedOrder,
              current.sensor || remoteSensor
            )
          : current
      );
      setIsOrderLoading(true);
      setOrderDataLoading({
        events: true,
        productionUnits: true,
        alerts: true,
        analytics: true,
        scadaState: true,
        thresholds: true,
      });
      try {
        await loadRemote(nextOrderId);
        setError(null);
        setLastUpdated(new Date());
      } catch (selectionError) {
        setError(selectionError.message || "Leafy Factory is unavailable");
      } finally {
        if (selectedOrderIdRef.current === nextOrderId) {
          setIsOrderLoading(false);
          setOrderDataLoading(EMPTY_ORDER_DATA_LOADING);
        }
      }
    },
    [composeRemote, loadRemote, remoteSensor, source]
  );

  const runAction = useCallback(async (name, action) => {
    setBusyAction(name);
    setError(null);
    try {
      return await action();
    } catch (actionError) {
      setError(actionError.message || "Factory action failed");
      throw actionError;
    } finally {
      setBusyAction(null);
    }
  }, []);

  const startOrder = useCallback(
    (input) =>
      runAction("start-order", async () => {
        if (source === FACTORY_SOURCES.LOCAL) {
          const result = createLocalOrder(
            localStateRef.current || createInitialLocalFactoryState(),
            input
          );
          commitLocalState(result.state);
          selectedOrderIdRef.current = result.order.order_id;
          setSelectedOrderId(result.order.order_id);
          setLastUpdated(new Date());
          return result.order;
        }
        const order = await createRemoteOrder(input);
        commitSessionOrders([
          toSessionOrder({ ...input, ...order }),
          ...sessionOrdersRef.current.filter(
            (existing) => existing.order_id !== order.order_id
          ),
        ]);
        selectedOrderIdRef.current = order.order_id;
        setSelectedOrderId(order.order_id);
        await loadRemote(order.order_id);
        setLastUpdated(new Date());
        return order;
      }),
    [commitLocalState, commitSessionOrders, loadRemote, runAction, source]
  );

  const stopOrder = useCallback(
    (orderId) =>
      runAction("stop-order", async () => {
        if (source === FACTORY_SOURCES.LOCAL) {
          const next = stopLocalOrder(
            localStateRef.current || createInitialLocalFactoryState(),
            orderId
          );
          commitLocalState(next);
          return { order_id: orderId, status: "stopped" };
        }
        // The stopped order stays in the session list and stays selected.
        const result = await stopRemoteOrder(orderId);
        commitSessionOrders(
          markSessionOrderStopped(sessionOrdersRef.current, orderId)
        );
        await loadRemote(selectedOrderId);
        return result;
      }),
    [commitLocalState, commitSessionOrders, loadRemote, runAction, selectedOrderId, source]
  );

  const saveThresholds = useCallback(
    (values) =>
      runAction("thresholds", async () => {
        if (!selectedOrderId) throw new Error("Select an active order first");
        if (source === FACTORY_SOURCES.LOCAL) {
          const result = setLocalThresholds(
            localStateRef.current || createInitialLocalFactoryState(),
            selectedOrderId,
            values
          );
          commitLocalState(result.state);
          return result.thresholds;
        }
        const result = await setRemoteThresholds(selectedOrderId, values);
        setRemoteSnapshot((current) =>
          current ? { ...current, thresholds: result } : current
        );
        return result;
      }),
    [commitLocalState, runAction, selectedOrderId, source]
  );

  const sendMetrics = useCallback(
    (values) =>
      runAction("metrics", async () => {
        if (!selectedOrderId) throw new Error("Select an active order first");
        setRemoteSensor({
          temperature: Number(values.temperature),
          vibration: Number(values.vibration),
        });
        if (source === FACTORY_SOURCES.LOCAL) {
          const result = sendLocalMetrics(
            localStateRef.current || createInitialLocalFactoryState(),
            selectedOrderId,
            values
          );
          commitLocalState(result.state);
          return result.result;
        }
        const result = await sendRemoteMetrics(selectedOrderId, values);
        await loadRemote(selectedOrderId, {
          temperature: Number(values.temperature),
          vibration: Number(values.vibration),
        });
        return result;
      }),
    [commitLocalState, loadRemote, runAction, selectedOrderId, source]
  );

  const snapshot = useMemo(() => {
    if (!isReady) return EMPTY_SNAPSHOT;
    if (source === FACTORY_SOURCES.LOCAL) {
      return localState
        ? buildLocalSnapshot(localState, selectedOrderId)
        : EMPTY_SNAPSHOT;
    }
    return remoteSnapshot || EMPTY_SNAPSHOT;
  }, [isReady, localState, remoteSnapshot, selectedOrderId, source]);

  const value = useMemo(
    () => ({
      source,
      setSource,
      isReady,
      isRefreshing,
      isOrderLoading,
      orderDataLoading,
      busyAction,
      error,
      lastUpdated,
      connected:
        source === FACTORY_SOURCES.LOCAL
          ? true
          : Boolean(remoteSnapshot?.status) && !error,
      selectedOrderId,
      selectedOrder:
        snapshot.selectedOrder ||
        sessionOrdersRef.current.find(
          (order) => order.order_id === selectedOrderId
        ) ||
        null,
      selectOrder,
      snapshot,
      refresh,
      startOrder,
      stopOrder,
      saveThresholds,
      sendMetrics,
      products: PRODUCTS,
      stations: FACTORY_STATIONS,
      sources: FACTORY_SOURCES,
    }),
    [
      busyAction,
      error,
      isReady,
      isOrderLoading,
      isRefreshing,
      lastUpdated,
      refresh,
      remoteSnapshot,
      orderDataLoading,
      saveThresholds,
      selectOrder,
      sendMetrics,
      setSource,
      selectedOrderId,
      snapshot,
      source,
      startOrder,
      stopOrder,
    ]
  );

  return (
    <FactoryDataContext.Provider value={value}>
      {children}
    </FactoryDataContext.Provider>
  );
}

export function useFactoryData() {
  const context = useContext(FactoryDataContext);
  if (!context) {
    throw new Error("useFactoryData must be used inside FactoryDataProvider");
  }
  return context;
}
