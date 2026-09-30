"use client";

import { useEffect, useState } from "react";
import EditableField, {
  EditSlot,
  FormEditButton,
} from "@/components/forms/EditableField";
import { useIncidentResponseForm } from "./hooks";

export default function IncidentResponseForm({
  rootCause,
  repairInstructions,
  editSlotId,
  className = "",
}) {
  useIncidentResponseForm();
  const [saved, setSaved] = useState({
    rootCause: rootCause || "",
    repairInstructions: repairInstructions || "",
  });
  const [draft, setDraft] = useState(saved);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const next = {
      rootCause: rootCause || "",
      repairInstructions: repairInstructions || "",
    };
    setSaved(next);
    setDraft(next);
    setEditing(false);
  }, [rootCause, repairInstructions]);

  const values = editing ? draft : saved;

  return (
    <div className={`incident-form form-fields flex w-full flex-col gap-2 ${className}`}>
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
          }}
        />
      </EditSlot>
      <EditableField
        label="Root cause"
        value={values.rootCause}
        onChange={(value) =>
          setDraft((current) => ({ ...current, rootCause: value }))
        }
        editing={editing}
        multiline
      />
      <EditableField
        label="Repair instructions"
        value={values.repairInstructions}
        onChange={(value) =>
          setDraft((current) => ({ ...current, repairInstructions: value }))
        }
        editing={editing}
        multiline
      />
    </div>
  );
}
