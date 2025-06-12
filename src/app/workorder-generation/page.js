"use client";

import React, { useRef } from "react";

import WorkOrderPlanner from "@/components/workOrderPlanner/WorkOrderPlanner";
import WorkOrderGenerator from "@/components/workOrderGenerator/WorkOrderGenerator";

export default function Page() {
  const [selectedIncidentId, setSelectedIncidentId] = React.useState(null);
  const triggerAgentRef = React.useRef();

  // Mock incident reports (should match planner's)
  const mockIncidentReports = [
    {
      Id: 1,
      Err_name: "Overheating Motor",
      ts: "2025-06-12T10:00:00Z",
      Err_code: "E101",
      "Root Cause": "Insufficient lubrication",
      "Repair Instructions": "Check oil levels and refill as needed.",
      Machine_id: "M-001",
    },
    {
      Id: 2,
      Err_name: "Sensor Failure",
      ts: "2025-06-11T14:30:00Z",
      Err_code: "E202",
      "Root Cause": "Wiring issue",
      "Repair Instructions": "Inspect and replace faulty wires.",
      Machine_id: "M-002",
    },
  ];

  // Handler for incident selection
  const handleIncidentSelect = (id) => {
    setSelectedIncidentId(id);
  };

  // Handler for Continue Workflow button
  const handleContinueWorkflow = () => {
    if (triggerAgentRef.current) {
      triggerAgentRef.current();
    }
  };

  // Find the selected incident object
  const selectedIncidentObj = mockIncidentReports.find(
    (ir) => ir.Id === selectedIncidentId
  );

  return (
    <main className="flex flex-row items-start justify-center min-h-screen">
      {/* Left: Planner */}
      <div className="w-1/2 max-w-5xl mx-auto my-8 flex flex-col gap-6">
        <WorkOrderPlanner
          selectedIncidentId={selectedIncidentId}
          onSelectIncident={handleIncidentSelect}
          onContinueWorkflow={handleContinueWorkflow}
        />
      </div>
      {/* Right: Generator */}
      <div className="w-1/2 max-w-5xl mx-auto my-8 flex flex-col gap-6">
        <WorkOrderGenerator
          selectedIncident={selectedIncidentObj}
          triggerAgentRef={triggerAgentRef}
        />
      </div>
    </main>
  );
}
