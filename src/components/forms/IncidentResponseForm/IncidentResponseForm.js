import React from "react";
import TextArea from "@leafygreen-ui/text-area";
import { useIncidentResponseForm } from "./hooks";

export default function IncidentResponseForm({
  rootCause,
  repairInstructions,
}) {
  useIncidentResponseForm(); // For future extensibility
  return (
    <div className="flex flex-col w-full h-full">
      <TextArea
        label="Root cause"
        value={rootCause}
        readOnly
        className="resize-none mb-1"
        rows={3}
      />
      <TextArea
        label="Repair instructions"
        value={repairInstructions}
        readOnly
        className="resize-none"
        rows={8}
      />
    </div>
  );
}
