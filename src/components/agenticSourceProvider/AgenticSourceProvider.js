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
import { fetchFactoryStatus } from "@/lib/factory/factoryClient";
import {
  FACTORY_SOURCES,
  FACTORY_SOURCE_STORAGE_KEY,
} from "@/lib/factory/constants";

const AgenticSourceContext = createContext(null);

function readStoredSource() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(FACTORY_SOURCE_STORAGE_KEY);
    if (
      stored === FACTORY_SOURCES.LOCAL ||
      stored === FACTORY_SOURCES.LEAFY
    ) {
      return stored;
    }
  } catch {
    // Ignore disabled storage.
  }
  return null;
}

function writeStoredSource(nextSource) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FACTORY_SOURCE_STORAGE_KEY, nextSource);
  } catch {
    // Ignore disabled storage.
  }
}

export default function AgenticSourceProvider({ children }) {
  const [dataSource, setDataSource] = useState(FACTORY_SOURCES.LEAFY);
  const [leafyAvailable, setLeafyAvailable] = useState(null);
  const [isSourceChecking, setIsSourceChecking] = useState(true);
  const [isSourceBusy, setIsSourceBusy] = useState(false);
  const [sourceError, setSourceError] = useState("");
  const beforeSourceChangeRef = useRef(null);

  const checkLeafyAvailability = useCallback(async (signal) => {
    setIsSourceChecking(true);
    try {
      await fetchFactoryStatus({ signal });
      if (signal?.aborted) return false;
      setLeafyAvailable(true);
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;
      setLeafyAvailable(false);
      return false;
    } finally {
      if (!signal?.aborted) setIsSourceChecking(false);
    }
  }, []);

  useEffect(() => {
    const stored = readStoredSource();
    if (stored) {
      setDataSource(stored);
    }
    const controller = new AbortController();
    checkLeafyAvailability(controller.signal).then((available) => {
      if (controller.signal.aborted) return;
      const preferred = readStoredSource();
      const resolved = available
        ? preferred === FACTORY_SOURCES.LOCAL
          ? FACTORY_SOURCES.LOCAL
          : FACTORY_SOURCES.LEAFY
        : FACTORY_SOURCES.LOCAL;
      setDataSource(resolved);
      writeStoredSource(resolved);
    });
    return () => controller.abort();
  }, [checkLeafyAvailability]);

  const registerBeforeSourceChange = useCallback((fn) => {
    beforeSourceChangeRef.current = fn;
    return () => {
      if (beforeSourceChangeRef.current === fn) {
        beforeSourceChangeRef.current = null;
      }
    };
  }, []);

  const handleSourceChange = useCallback(
    async (nextSource) => {
      if (
        nextSource === dataSource ||
        (nextSource !== FACTORY_SOURCES.LOCAL &&
          nextSource !== FACTORY_SOURCES.LEAFY)
      ) {
        return;
      }
      if (
        nextSource === FACTORY_SOURCES.LEAFY &&
        leafyAvailable !== true &&
        !(await checkLeafyAvailability())
      ) {
        setSourceError("Leafy Factory is unavailable");
        return;
      }
      if (beforeSourceChangeRef.current) {
        await beforeSourceChangeRef.current(nextSource);
      }
      setDataSource(nextSource);
      writeStoredSource(nextSource);
      setSourceError("");
    },
    [checkLeafyAvailability, dataSource, leafyAvailable]
  );

  const reportLeafyUnavailable = useCallback((message) => {
    setLeafyAvailable(false);
    setDataSource(FACTORY_SOURCES.LOCAL);
    writeStoredSource(FACTORY_SOURCES.LOCAL);
    setSourceError(message || "Leafy Factory is unavailable");
  }, []);

  const value = useMemo(
    () => ({
      dataSource,
      leafyAvailable,
      isSourceChecking,
      isSourceBusy,
      setIsSourceBusy,
      sourceError,
      setSourceError,
      checkLeafyAvailability,
      handleSourceChange,
      reportLeafyUnavailable,
      registerBeforeSourceChange,
    }),
    [
      checkLeafyAvailability,
      dataSource,
      handleSourceChange,
      isSourceBusy,
      isSourceChecking,
      leafyAvailable,
      registerBeforeSourceChange,
      reportLeafyUnavailable,
      sourceError,
    ]
  );

  return (
    <AgenticSourceContext.Provider value={value}>
      {children}
    </AgenticSourceContext.Provider>
  );
}

export function useAgenticSource() {
  const context = useContext(AgenticSourceContext);
  if (!context) {
    throw new Error(
      "useAgenticSource must be used inside AgenticSourceProvider"
    );
  }
  return context;
}
