"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import FactorySourceSelector from "@/components/factorySourceSelector/FactorySourceSelector";
import ContestableWorkspace from "@/components/contestable/ContestableWorkspace";
import { fetchIncidentReports } from "@/lib/api/incidentReports";
import { fetchAlerts } from "@/lib/api/alerts";
import { fetchFactoryStatus } from "@/lib/factory/factoryClient";
import { STANDALONE_PRESET_SCENARIOS } from "@/lib/contestable/scenarios";

export default function ContestableAiPage() {
  const [dataSource, setDataSource] = useState("leafy");
  const [leafyAvailable, setLeafyAvailable] = useState(null);
  const [isSourceChecking, setIsSourceChecking] = useState(true);
  const [incidentReports, setIncidentReports] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedKey, setSelectedKey] = useState("benchmark");

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

  const loadContextItems = useCallback(async () => {
    const [reports, recentAlerts] = await Promise.all([
      fetchIncidentReports().catch(() => []),
      fetchAlerts().catch(() => []),
    ]);
    setIncidentReports(Array.isArray(reports) ? reports : []);
    setAlerts(Array.isArray(recentAlerts) ? recentAlerts : []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkLeafy(controller.signal).then((available) => {
      if (!controller.signal.aborted) {
        setDataSource(available ? "leafy" : "local");
      }
    });
    loadContextItems();
    return () => controller.abort();
  }, [checkLeafy, loadContextItems]);

  const handleSourceChange = async (nextSource) => {
    if (nextSource === "leafy" && leafyAvailable !== true) {
      const ok = await checkLeafy();
      if (!ok) return;
    }
    setDataSource(nextSource);
  };

  const selectionOptions = useMemo(() => {
    const preset = STANDALONE_PRESET_SCENARIOS[0];
    const items = [
      {
        key: "benchmark",
        group: "Alerts",
        kind: "alert",
        label: `Alert · ${preset.title}`,
        shortLabel: "Anomalous vibration spike on Laser Tab Welding machine",
        machineId: preset.machine_id,
        errorCode: preset.error_code,
        errorName: preset.error_name,
        summary: `${preset.subtitle} — Vibration ${preset.alert.details.vibration} mm/s, Temp ${preset.alert.details.temperature} °C`,
        alert: preset.alert,
        incident: null,
      },
    ];

    for (const al of alerts) {
      const id = String(al._id || al.Id || "");
      if (!id) continue;
      const errCode = al.err_code || "E13";
      const errName = al.err_name || "Alert";
      const machineId = al.machine_id || "M1";
      items.push({
        key: `alert:${id}`,
        group: "Alerts",
        kind: "alert",
        label: `Alert · ${machineId} · ${errCode} ${errName} (${id.slice(-6)})`,
        shortLabel: errName,
        machineId,
        errorCode: errCode,
        errorName: errName,
        summary: `Telemetry threshold alert on ${machineId}${
          al.details?.vibration !== undefined
            ? ` — Vibration ${al.details.vibration} mm/s`
            : ""
        }${
          al.details?.temperature !== undefined
            ? `, Temp ${al.details.temperature} °C`
            : ""
        }`,
        alert: al,
        incident: null,
      });
    }

    for (const ir of incidentReports) {
      const id = String(ir._id || ir.Id || "");
      if (!id) continue;
      const errCode = ir.error_code || "E13";
      const errName = ir.error_name || "Incident";
      const machineId = ir.machine_id || "M1";
      items.push({
        key: `incident:${id}`,
        group: "Incident Reports",
        kind: "incident",
        label: `Incident · ${machineId} · ${errCode} ${errName} (${id.slice(-6)})`,
        shortLabel: errName,
        machineId,
        errorCode: errCode,
        errorName: errName,
        summary:
          ir.root_cause ||
          `Incident report on ${machineId} (${errCode} · ${errName})`,
        alert: preset.alert,
        incident: ir,
      });
    }

    return items;
  }, [alerts, incidentReports]);

  const activeSelection =
    selectionOptions.find((opt) => opt.key === selectedKey) ||
    selectionOptions[0];

  return (
    <main className="flex h-full min-h-0 w-full flex-col pb-4">
      <ContestableWorkspace
        mode="standalone"
        incident={activeSelection.incident}
        alert={activeSelection.alert}
        selectionOptions={selectionOptions}
        selectedKey={activeSelection.key}
        onSelectKey={setSelectedKey}
        activeSelection={activeSelection}
        dataSource={dataSource}
        onCommitted={loadContextItems}
        toolbarStart={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <FactorySourceSelector
              source={dataSource}
              onChange={handleSourceChange}
              connected={dataSource === "local" || leafyAvailable === true}
              isChecking={isSourceChecking}
              menuAlign="right"
            />
          </div>
        }
      />
    </main>
  );
}
