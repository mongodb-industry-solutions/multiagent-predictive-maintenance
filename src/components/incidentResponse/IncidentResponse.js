import React from "react";
import { useIncidentResponse } from "./hooks";
import TextArea from "@leafygreen-ui/text-area";
import AgentStatus from "../agentStatus/AgentStatus";
import IncidentReportList from "../incidentReportList/IncidentReportList";

export default function IncidentResponse({ alertTrigger }) {
  const {
    agentActive,
    showModal,
    setShowModal,
    rootCause,
    repairInstructions,
    incidentReports,
  } = useIncidentResponse({ alertTrigger });

  // Modal content for this context
  const modalContent = (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-2">Agent Info</h3>
      <div className="text-gray-600">(Agent details coming soon...)</div>
      <div className="mt-4 flex justify-end">
        <button
          className="bg-gray-200 px-4 py-2 rounded"
          onClick={() => setShowModal(false)}
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col border-l border-gray-200 px-6 py-8 my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Incident Response
          </h2>
          <AgentStatus
            isActive={agentActive}
            onInfo={() => setShowModal(true)}
            onCloseModal={() => setShowModal(false)}
            showModal={showModal}
            modalContent={modalContent}
            statusText="Agent"
            activeText="Active"
            inactiveText="Inactive"
          />
        </div>
      </div>
      {/* Main content split */}
      <div className="flex flex-1 gap-6 mt-4 min-h-0">
        {/* Left section */}
        <div className="flex flex-col w-1/2 h-full gap-4">
          <div className="flex flex-col h-[30%]">
            <TextArea
              label="Root cause"
              value={rootCause}
              readOnly
              className="flex-1 resize-none"
              rows={3}
            />
          </div>
          <div className="flex flex-col flex-1">
            <TextArea
              label="Repair instructions"
              value={repairInstructions}
              readOnly
              className="flex-1 resize-none"
              rows={8}
            />
          </div>
        </div>
        {/* Right section: Incident reports */}
        <div className="flex flex-col w-1/2 h-full">
          <IncidentReportList incidentReports={incidentReports} />
        </div>
      </div>
    </div>
  );
}
