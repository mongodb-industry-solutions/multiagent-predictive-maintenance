import React, { useRef } from "react";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import Code from "@leafygreen-ui/code";
import TextInput from "@leafygreen-ui/text-input";
import TextArea from "@leafygreen-ui/text-area";
import { useWorkOrderGenerator } from "./hooks";

export default function WorkOrderGenerator({
  selectedIncident,
  triggerAgentRef,
}) {
  const {
    agentStatus,
    form,
    workorders,
    expanded,
    handleFormChange,
    handleExpand,
    handleAgentTrigger,
  } = useWorkOrderGenerator({
    triggerAgent: triggerAgentRef,
    selectedIncident,
  });

  return (
    <div className="w-full h-full rounded-lg shadow p-6 flex flex-col flex-1 my-8">
      {/* Header */}
      <h2 className="text-2xl font-bold text-center mb-2">
        Production planning
      </h2>
      {/* Agent Status - left aligned */}
      <div className="flex justify-start mb-4">
        <AgentStatus status={agentStatus} />
      </div>
      {/* Main content: Form (left) and Workorder list (right) */}
      <div className="flex flex-1 gap-6">
        {/* Left: Workorder Form - shorter, scrollable if needed */}
        <div className="w-1/2 rounded-lg p-4 flex flex-col gap-3 max-h-[480px] overflow-y-auto">
          <h3 className="font-semibold text-gray-700 mb-2 text-lg">
            Workorder Form
          </h3>
          <TextInput
            label="Machine ID"
            value={form.machine_id || ""}
            onChange={(e) => handleFormChange("machine_id", e.target.value)}
            disabled
          />
          <TextInput
            label="Title"
            value={form.title || ""}
            onChange={(e) => handleFormChange("title", e.target.value)}
            disabled
          />
          <TextArea
            label="Instructions"
            value={form.instructions || ""}
            onChange={(e) => handleFormChange("instructions", e.target.value)}
            disabled
          />
          <TextInput
            label="Estimated Duration"
            value={form.estimated_duration || ""}
            onChange={(e) =>
              handleFormChange("estimated_duration", e.target.value)
            }
            disabled
          />
          <TextInput
            label="Proposed Start Time"
            value={form.proposed_start_time || ""}
            onChange={(e) =>
              handleFormChange("proposed_start_time", e.target.value)
            }
            disabled
          />
        </div>
        {/* Right: Workorder List */}
        <div className="w-1/2 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-700 mb-2 text-lg">
            Workorders
          </h3>
          {workorders.length === 0 && (
            <div className="text-gray-400 text-sm">
              No workorders generated yet.
            </div>
          )}
          {workorders.map((wo, idx) => (
            <div
              key={idx}
              className="border rounded-lg shadow p-3 mb-2 cursor-pointer transition hover:shadow-md"
            >
              <div
                className="flex justify-between items-center"
                onClick={() => handleExpand(idx)}
              >
                <div className="font-medium text-gray-800">
                  {wo.title || `Workorder #${idx + 1}`}
                </div>
                <button
                  className="text-xs text-blue-600 underline focus:outline-none"
                  type="button"
                >
                  {expanded === idx ? "Collapse" : "Expand"}
                </button>
              </div>
              {expanded === idx && (
                <div className="mt-2">
                  <Code language="json">{JSON.stringify(wo, null, 2)}</Code>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
