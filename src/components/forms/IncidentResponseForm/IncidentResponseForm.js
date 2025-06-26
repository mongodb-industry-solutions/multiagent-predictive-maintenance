import React from "react";
import TextArea from "@leafygreen-ui/text-area";
import { useIncidentResponseForm } from "./hooks";

export default function IncidentResponseForm({
  rootCause,
  repairInstructions,
  className = "",
}) {
  useIncidentResponseForm(); // For future extensibility
  return (
    <div
      className={`flex flex-col w-full h-full gap-2 ${className}`}
      style={{ minHeight: 0 }}
    >
      <div className="flex flex-col flex-[1_1_0%] min-h-0">
        <TextArea
          label="Root cause"
          value={rootCause}
          readOnly
          className="resize-none mb-1 h-full"
          rows={3}
          style={{ flex: 1, minHeight: 120, height: "100%" }}
        />
      </div>
      <div className="flex flex-col flex-[3_3_0%] min-h-0">
        <TextArea
          label="Repair instructions"
          value={repairInstructions}
          readOnly
          className="resize-none h-full"
          rows={8}
          style={{ flex: 1, minHeight: 360, height: "100%" }}
        />
      </div>
    </div>
  );
}
