import React from "react";
import { useIncidentResponse } from "./hooks";
import TextArea from "@leafygreen-ui/text-area";
import Button from "@leafygreen-ui/button";
import Modal from "@leafygreen-ui/modal";
import Code from "@leafygreen-ui/code";

export default function IncidentResponse({ alertTrigger }) {
  const {
    agentActive,
    showModal,
    setShowModal,
    rootCause,
    repairInstructions,
    incidentReports,
    expandedCard,
    expandedType,
    handleExpand,
    handleCollapse,
  } = useIncidentResponse({ alertTrigger });

  return (
    <div className="w-full h-full flex flex-col border-l border-gray-200 px-6 py-8 my-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Incident Response
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={
                agentActive
                  ? "text-green-600 font-medium animate-pulse"
                  : "text-gray-400 font-medium"
              }
            >
              {agentActive ? "Agent Active" : "Agent Inactive"}
            </span>
            <Button
              aria-label="Show agent info"
              className="ml-2 !bg-black !text-white !rounded-full !p-2 !min-w-0 !h-8 !w-8 flex items-center justify-center"
              onClick={() => setShowModal(true)}
              style={{ minWidth: 0 }}
            >
              <span className="material-icons">info</span>
            </Button>
          </div>
        </div>
      </div>
      {/* Modal for agent info */}
      <Modal open={showModal} setOpen={setShowModal} size="small">
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-2">Agent Info</h3>
          <div className="text-gray-600">(Agent details coming soon...)</div>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
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
        <div className="flex flex-col w-1/2 h-full overflow-y-auto gap-4">
          <h3 className="font-semibold text-lg mb-2">Incident Reports</h3>
          <div className="flex flex-col gap-3">
            {incidentReports.map((report) => (
              <div
                key={report.Id}
                className="border rounded shadow-sm p-4 relative"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">
                      {report.Err_name || `Incident #${report.Id}`}
                    </div>
                    <div className="text-xs text-gray-500">{report.ts}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      aria-label="Expand as form"
                      className="!p-1 !rounded-full !bg-blue-100 !text-blue-700"
                      onClick={() => handleExpand(report.Id, "form")}
                      disabled={
                        expandedCard === report.Id && expandedType === "form"
                      }
                    >
                      <span className="material-icons">description</span>
                    </Button>
                    <Button
                      aria-label="Expand as JSON"
                      className="!p-1 !rounded-full !bg-gray-200 !text-gray-700"
                      onClick={() => handleExpand(report.Id, "json")}
                      disabled={
                        expandedCard === report.Id && expandedType === "json"
                      }
                    >
                      <span className="material-icons">code</span>
                    </Button>
                  </div>
                </div>
                {/* Expanded content */}
                {expandedCard === report.Id && expandedType === "form" && (
                  <div className="mt-3 border-t pt-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium text-gray-600">
                        Error Code:
                      </div>
                      <div>{report.Err_code}</div>
                      <div className="font-medium text-gray-600">
                        Root Cause:
                      </div>
                      <div>{report["Root Cause"]}</div>
                      <div className="font-medium text-gray-600">
                        Repair Instructions:
                      </div>
                      <div className="whitespace-pre-line">
                        {typeof report["Repair Instructions"] === "string"
                          ? report["Repair Instructions"]
                          : JSON.stringify(
                              report["Repair Instructions"],
                              null,
                              2
                            )}
                      </div>
                      <div className="font-medium text-gray-600">
                        Machine ID:
                      </div>
                      <div>{report.Machine_id}</div>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button size="xsmall" onClick={handleCollapse}>
                        Collapse
                      </Button>
                    </div>
                  </div>
                )}
                {expandedCard === report.Id && expandedType === "json" && (
                  <div className="mt-3 border-t pt-3 max-h-48 overflow-y-auto">
                    <Code language="json">
                      {JSON.stringify(report, null, 2)}
                    </Code>
                    <div className="flex justify-end mt-2">
                      <Button size="xsmall" onClick={handleCollapse}>
                        Collapse
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
