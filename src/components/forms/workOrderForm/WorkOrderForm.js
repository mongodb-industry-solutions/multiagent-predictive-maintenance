import React from "react";
import TextInput from "@leafygreen-ui/text-input";
import TextArea from "@leafygreen-ui/text-area";
import { useWorkOrderForm } from "./hooks";

export default function WorkOrderForm({ form, handleFormChange }) {
  useWorkOrderForm(); // For future extensibility
  return (
    <div className="flex flex-col w-full h-full">
      <TextInput
        label="Title"
        value={form.title || ""}
        onChange={(e) => handleFormChange("title", e.target.value)}
        readOnly
        className="mb-1"
      />
      <TextInput
        label="Machine ID"
        value={form.machine_id || ""}
        onChange={(e) => handleFormChange("machine_id", e.target.value)}
        readOnly
        className="mb-1"
      />
      <TextInput
        label="Estimated Duration (days)"
        value={form.estimated_duration_days || form.estimated_duration || ""}
        onChange={(e) =>
          handleFormChange("estimated_duration_days", e.target.value)
        }
        readOnly
        className="mb-1"
      />
      <TextInput
        label="Proposed Start Time"
        value={
          form.proposed_start_time && form.proposed_start_time.$date
            ? form.proposed_start_time.$date
            : form.proposed_start_time || ""
        }
        onChange={(e) =>
          handleFormChange("proposed_start_time", e.target.value)
        }
        readOnly
        className="mb-1"
      />
      <TextArea
        label="Required Skills"
        value={
          Array.isArray(form.required_skills)
            ? form.required_skills.join(", ")
            : form.required_skills || ""
        }
        onChange={(e) => handleFormChange("required_skills", e.target.value)}
        readOnly
        className="mb-1"
        rows={2}
      />
      <TextArea
        label="Required Materials"
        value={
          Array.isArray(form.required_materials)
            ? form.required_materials.join(", ")
            : form.required_materials || ""
        }
        onChange={(e) => handleFormChange("required_materials", e.target.value)}
        readOnly
        className="mb-1"
        rows={2}
      />
      <TextArea
        label="Observations"
        value={form.observations || ""}
        onChange={(e) => handleFormChange("observations", e.target.value)}
        readOnly
        className="mb-1"
        rows={3}
      />
    </div>
  );
}
