import React from "react";
import Button from "@leafygreen-ui/button";
import Code from "@leafygreen-ui/code";
import IncidentReportList from "../incidentReportList/IncidentReportList";

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

const inventorySample = {
  _id: "inv123",
  partName: "Bearing",
  quantity: 42,
  location: "Warehouse A",
  supplier: "Acme Parts Co.",
};

const staffSample = {
  _id: "staff456",
  name: "Alex Johnson",
  role: "Maintenance Technician",
  shift: "Day",
  skills: ["Electrical", "Mechanical"],
};

export default function WorkOrderPlanner({
  selectedIncidentId,
  onSelectIncident,
  onContinueWorkflow,
}) {
  return (
    <div className="flex w-full max-w-5xl mx-auto my-8 gap-6">
      {/* Left: Incident Report List */}
      <div className="w-1/2 bg-white rounded-lg shadow p-4 flex flex-col gap-2">
        <IncidentReportList
          incidentReports={mockIncidentReports}
          selectable
          selectedId={selectedIncidentId}
          onSelect={onSelectIncident}
        />
      </div>
      {/* Right: Workflow Actions & Info */}
      <div className="w-1/2 flex flex-col gap-4">
        <Button
          className="self-start"
          disabled={selectedIncidentId === null}
          variant="primary"
          size="large"
          onClick={onContinueWorkflow}
        >
          Continue Workflow
        </Button>
        <div className="text-sm text-gray-600 mb-2">
          Select an incident report to continue the agentic workflow and create
          a work order.
        </div>
        <div className="flex flex-col gap-3">
          <div className="bg-gray-50 rounded-lg shadow p-3">
            <div className="font-semibold text-gray-700 mb-1 text-sm">
              Inventory Sample
            </div>
            <Code language="json">
              {JSON.stringify(inventorySample, null, 2)}
            </Code>
          </div>
          <div className="bg-gray-50 rounded-lg shadow p-3">
            <div className="font-semibold text-gray-700 mb-1 text-sm">
              Staff Sample
            </div>
            <Code language="json">{JSON.stringify(staffSample, null, 2)}</Code>
          </div>
        </div>
      </div>
    </div>
  );
}
