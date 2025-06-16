import React from "react";
import TextInput from "@leafygreen-ui/text-input";
import TextArea from "@leafygreen-ui/text-area";
import { useWorkOrderForm } from "./hooks";

export default function WorkOrderForm({ form, handleFormChange }) {
  useWorkOrderForm(); // For future extensibility
  return (
    <div className="flex flex-col w-full h-full">
      <TextInput
        label="Machine ID"
        value={form.machine_id || ""}
        onChange={(e) => handleFormChange("machine_id", e.target.value)}
        readOnly
        className="mb-1"
      />
      <TextInput
        label="Title"
        value={form.title || ""}
        onChange={(e) => handleFormChange("title", e.target.value)}
        readOnly
        className="mb-1"
      />
      <TextArea
        label="Instructions"
        value={form.instructions || ""}
        onChange={(e) => handleFormChange("instructions", e.target.value)}
        readOnly
        className="mb-1"
        rows={4}
      />
      <TextInput
        label="Estimated Duration"
        value={form.estimated_duration || ""}
        onChange={(e) => handleFormChange("estimated_duration", e.target.value)}
        readOnly
        className="mb-1"
      />
      <TextInput
        label="Proposed Start Time"
        value={form.proposed_start_time || ""}
        onChange={(e) =>
          handleFormChange("proposed_start_time", e.target.value)
        }
        readOnly
      />
    </div>
  );
}
