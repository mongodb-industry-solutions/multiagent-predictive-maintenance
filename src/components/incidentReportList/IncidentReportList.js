import React from "react";
import { useIncidentReportList } from "./hooks";
import Button from "@leafygreen-ui/button";
import Code from "@leafygreen-ui/code";

export default function IncidentReportList({
  incidentReports,
  selectable = false,
  selectedId,
  onSelect,
}) {
  const { expandedCard, expandedType, handleExpand, handleCollapse } =
    useIncidentReportList();

  return (
    <div className="flex flex-col w-full h-full overflow-y-auto gap-4">
      <h3 className="font-semibold text-lg mb-2">Incident Reports</h3>
      <div className="flex flex-col gap-3">
        {incidentReports.map((report) => {
          const isSelected = selectable && selectedId === report.Id;
          return (
            <div
              key={report.Id}
              className={`border rounded shadow-sm p-4 relative transition-colors ${
                isSelected
                  ? "bg-blue-50 border-blue-400"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              } ${selectable ? "cursor-pointer" : ""}`}
              onClick={selectable ? () => onSelect(report.Id) : undefined}
              style={
                selectable
                  ? { boxShadow: isSelected ? "0 0 0 2px #2563eb" : undefined }
                  : {}
              }
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpand(report.Id, "form");
                    }}
                    disabled={
                      expandedCard === report.Id && expandedType === "form"
                    }
                  >
                    <span className="material-icons">description</span>
                  </Button>
                  <Button
                    aria-label="Expand as JSON"
                    className="!p-1 !rounded-full !bg-gray-200 !text-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpand(report.Id, "json");
                    }}
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
                    <div className="font-medium text-gray-600">Error Code:</div>
                    <div>{report.Err_code}</div>
                    <div className="font-medium text-gray-600">Root Cause:</div>
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
                    <div className="font-medium text-gray-600">Machine ID:</div>
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
                  <Code language="json">{JSON.stringify(report, null, 2)}</Code>
                  <div className="flex justify-end mt-2">
                    <Button size="xsmall" onClick={handleCollapse}>
                      Collapse
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
