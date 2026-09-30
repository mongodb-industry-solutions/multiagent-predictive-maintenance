"use client";

import { useEffect, useState } from "react";
import EditableField, {
  EditSlot,
  FormEditButton,
} from "@/components/forms/EditableField";
import { useWorkOrderForm } from "./hooks";

function valuesFromForm(form) {
  return {
    title: form.title || "",
    machine_id: form.machine_id || "",
    estimated_duration_days:
      form.estimated_duration_days !== undefined &&
      form.estimated_duration_days !== null
        ? String(form.estimated_duration_days)
        : form.estimated_duration || "",
    proposed_start_time:
      form.proposed_start_time && form.proposed_start_time.$date
        ? form.proposed_start_time.$date
        : form.proposed_start_time || "",
    required_skills: Array.isArray(form.required_skills)
      ? form.required_skills.join(", ")
      : form.required_skills || "",
    required_materials: Array.isArray(form.required_materials)
      ? form.required_materials.join(", ")
      : form.required_materials || "",
    observations: form.observations || "",
  };
}

export default function WorkOrderForm({ form, handleFormChange, editSlotId }) {
  useWorkOrderForm();
  const [saved, setSaved] = useState(() => valuesFromForm(form));
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);
  const sourceKey = JSON.stringify(valuesFromForm(form));

  useEffect(() => {
    const next = valuesFromForm(form);
    setSaved(next);
    setDraft(next);
    setEditing(false);
  }, [sourceKey, form]);

  const values = editing ? draft : saved;
  const update = (field) => (value) =>
    setDraft((current) => ({ ...current, [field]: value }));

  return (
    <div className="form-fields flex min-h-0 w-full flex-1 flex-col gap-3">
      <EditSlot slotId={editSlotId}>
        <FormEditButton
          editing={editing}
          onEdit={() => {
            setDraft(saved);
            setEditing(true);
          }}
          onSave={() => {
            setSaved(draft);
            setEditing(false);
            Object.entries(draft).forEach(([field, value]) => {
              handleFormChange?.(field, value);
            });
          }}
        />
      </EditSlot>
      <EditableField
        label="Title"
        value={values.title}
        onChange={update("title")}
        editing={editing}
      />
      <EditableField
        label="Machine ID"
        value={values.machine_id}
        onChange={update("machine_id")}
        editing={editing}
      />
      <EditableField
        label="Estimated Duration (days)"
        value={values.estimated_duration_days}
        onChange={update("estimated_duration_days")}
        editing={editing}
      />
      <EditableField
        label="Proposed Start Time"
        value={values.proposed_start_time}
        onChange={update("proposed_start_time")}
        editing={editing}
      />
      <EditableField
        label="Required Skills"
        value={values.required_skills}
        onChange={update("required_skills")}
        editing={editing}
      />
      <EditableField
        label="Required Materials"
        value={values.required_materials}
        onChange={update("required_materials")}
        editing={editing}
      />
      <EditableField
        label="Observations"
        value={values.observations}
        onChange={update("observations")}
        editing={editing}
        multiline
        fill
      />
    </div>
  );
}
