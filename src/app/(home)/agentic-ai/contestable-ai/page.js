"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@via-ds/icons";
import FactorySourceSelector from "@/components/factorySourceSelector/FactorySourceSelector";
import ContestableWorkspace from "@/components/contestable/ContestableWorkspace";
import { fetchIncidentReports } from "@/lib/api/incidentReports";
import { fetchFactoryStatus } from "@/lib/factory/factoryClient";
import { STANDALONE_PRESET_SCENARIOS } from "@/lib/contestable/scenarios";

export default function ContestableAiPage() {
  const [dataSource, setDataSource] = useState("leafy");
  const [leafyAvailable, setLeafyAvailable] = useState(null);
  const [isSourceChecking, setIsSourceChecking] = useState(true);
  const [incidentReports, setIncidentReports] = useState([]);
  const [selectedIncidentKey, setSelectedIncidentKey] = useState("benchmark");

  const checkLeafy = useCallback(async (signal) => {
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

  const loadIncidents = useCallback(async () => {
    const reports = await fetchIncidentReports().catch(() => []);
    setIncidentReports(Array.isArray(reports) ? reports : []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkLeafy(controller.signal).then((available) => {
      if (!controller.signal.aborted) {
        setDataSource(available ? "leafy" : "local");
      }
    });
    loadIncidents();
    return () => controller.abort();
  }, [checkLeafy, loadIncidents]);

  const handleSourceChange = async (nextSource) => {
    if (nextSource === "leafy" && leafyAvailable !== true) {
      const ok = await checkLeafy();
      if (!ok) return;
    }
    setDataSource(nextSource);
  };

  const selectedIncident =
    selectedIncidentKey === "benchmark"
      ? null
      : incidentReports.find(
          (ir) => String(ir._id || ir.Id) === selectedIncidentKey
        ) || null;

  return (
    <main className="flex h-full min-h-0 w-full flex-col gap-2 px-2 pb-4">
      {/* Top Bar matching Predictive Maintenance / AI Workflows navigation */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-1">
        <Link
          href="/agentic-ai"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-[#00684A] hover:underline"
        >
          <Icon glyph="ArrowLeft" size={16} />
          <span>Back to overview</span>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {incidentReports.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-medium text-[#3D4F58]">
              <span>Alert context:</span>
              <select
                value={selectedIncidentKey}
                onChange={(e) => setSelectedIncidentKey(e.target.value)}
                className="rounded-lg border border-[#C1C7C6] bg-white px-3 py-1.5 text-sm font-medium text-[#112733]"
              >
                <option value="benchmark">
                  {STANDALONE_PRESET_SCENARIOS[0].title}
                </option>
                {incidentReports.map((ir) => {
                  const id = String(ir._id || ir.Id);
                  return (
                    <option key={id} value={id}>
                      {ir.error_name || "Incident"} in {ir.machine_id || "M1"} (
                      {id.slice(-6)})
                    </option>
                  );
                })}
              </select>
            </label>
          )}

          <FactorySourceSelector
            source={dataSource}
            onChange={handleSourceChange}
            connected={dataSource === "local" || leafyAvailable === true}
            isChecking={isSourceChecking}
            menuAlign="right"
          />
        </div>
      </div>

      {/* Main Contestable AI Workspace */}
      <div className="mx-2 flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[#D8E3DF] bg-white shadow-sm">
        <ContestableWorkspace
          key={`${selectedIncidentKey}-${dataSource}`}
          mode="standalone"
          incident={selectedIncident}
          alert={STANDALONE_PRESET_SCENARIOS[0].alert}
          dataSource={dataSource}
          onCommitted={loadIncidents}
        />
      </div>
    </main>
  );
}
