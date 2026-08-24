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

const LOCAL_STATE_STORAGE_KEY = "leafy-local-factory-state";
const HEARTBEAT_FAILURES_BEFORE_FALLBACK = 2;

const EMPTY_SNAPSHOT = {
  status: null,
  activeOrders: [],
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
  const [isReady, setIsReady] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [remoteSensor, setRemoteSensor] = useState({
    temperature: 68,
    vibration: 24,
  });
  const refreshingRef = useRef(false);
  const heartbeatFailuresRef = useRef(0);

  const commitLocalState = useCallback((nextState) => {
    localStateRef.current = nextState;
    setLocalState(nextState);
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
        const snapshot = await fetchRemoteSnapshot(orderId);
        setRemoteSnapshot(enrichRemoteSnapshot(snapshot, remoteSensor));
        if (
          snapshot.selectedOrder?.order_id &&
          snapshot.selectedOrder.order_id !== orderId
        ) {
          setSelectedOrderId(snapshot.selectedOrder.order_id);
        }
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
          setSelectedOrderId(null);
          setSourceState(FACTORY_SOURCES.LOCAL);
          setError(null);
        }
      } finally {
        refreshingRef.current = false;
        setIsRefreshing(false);
      }
    },
    [remoteSensor, selectedOrderId, source]
  );

  useEffect(() => {
    if (!isReady || source !== FACTORY_SOURCES.LEAFY) return;
    refresh();
    const interval = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isReady, refresh, source]);

  useEffect(() => {
    if (
      source !== FACTORY_SOURCES.LEAFY ||
      !selectedOrderId
    ) {
      return;
    }
    let cancelled = false;
    const updateScada = async () => {
      if (document.hidden) return;
      try {
        const scadaState = await fetchScadaState(selectedOrderId);
        if (!cancelled) {
          setRemoteSnapshot((current) =>
            current
              ? enrichRemoteSnapshot(
                  { ...current, scadaState },
                  current.sensor || remoteSensor
                )
              : current
          );
        }
      } catch {
        // Main refresh exposes connection errors; keep the last SCADA frame.
      }
    };
    const interval = window.setInterval(updateScada, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [remoteSensor, selectedOrderId, source]);

  const setSource = useCallback((nextSource) => {
    if (
      nextSource !== FACTORY_SOURCES.LOCAL &&
      nextSource !== FACTORY_SOURCES.LEAFY
    ) {
      return;
    }
    setError(null);
    setSelectedOrderId(null);
    heartbeatFailuresRef.current = 0;
    setSourceState(nextSource);
  }, []);

  const selectOrder = useCallback(
    (orderId) => {
      setSelectedOrderId(orderId || null);
      if (source === FACTORY_SOURCES.LEAFY) refresh(orderId || null);
    },
    [refresh, source]
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
          setSelectedOrderId(result.order.order_id);
          setLastUpdated(new Date());
          return result.order;
        }
        const order = await createRemoteOrder(input);
        setSelectedOrderId(order.order_id);
        const snapshot = await fetchRemoteSnapshot(order.order_id);
        setRemoteSnapshot(enrichRemoteSnapshot(snapshot, remoteSensor));
        setLastUpdated(new Date());
        return order;
      }),
    [commitLocalState, remoteSensor, runAction, source]
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
          if (selectedOrderId === orderId) setSelectedOrderId(null);
          return { order_id: orderId, status: "stopped" };
        }
        const result = await stopRemoteOrder(orderId);
        if (selectedOrderId === orderId) setSelectedOrderId(null);
        const snapshot = await fetchRemoteSnapshot(null);
        setRemoteSnapshot(enrichRemoteSnapshot(snapshot, remoteSensor));
        return result;
      }),
    [
      commitLocalState,
      remoteSensor,
      runAction,
      selectedOrderId,
      source,
    ]
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
        const snapshot = await fetchRemoteSnapshot(selectedOrderId);
        setRemoteSnapshot(
          enrichRemoteSnapshot(snapshot, {
            temperature: Number(values.temperature),
            vibration: Number(values.vibration),
          })
        );
        return result;
      }),
    [commitLocalState, runAction, selectedOrderId, source]
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
      busyAction,
      error,
      lastUpdated,
      connected:
        source === FACTORY_SOURCES.LOCAL
          ? true
          : Boolean(remoteSnapshot?.status) && !error,
      selectedOrderId: snapshot.selectedOrder?.order_id || null,
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
      isRefreshing,
      lastUpdated,
      refresh,
      remoteSnapshot,
      saveThresholds,
      selectOrder,
      sendMetrics,
      setSource,
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
