"use client";
import { MachineSimulator } from "../../components/machineSimulator";
import { useMachineSimulator } from "../../components/machineSimulator/hooks";
import IncidentResponse from "../../components/incidentResponse/IncidentResponse";
import { useState, useCallback } from "react";

export default function Page() {
  const [alertTrigger, setAlertTrigger] = useState(0);
  const sim = useMachineSimulator({
    onAlert: useCallback(() => {
      setAlertTrigger((prev) => prev + 1);
    }, []),
  });
  return (
    <main className="flex flex-row min-h-screen">
      {/* Left: Machine Simulator (50%) */}
      <div className="w-1/2 h-full border-r border-gray-200 bg-gray-50">
        <MachineSimulator {...sim} />
      </div>
      {/* Right: Incident Response (50%) */}
      <div className="w-1/2 h-full flex items-center justify-center">
        <IncidentResponse alertTrigger={alertTrigger} />
      </div>
    </main>
  );
}
