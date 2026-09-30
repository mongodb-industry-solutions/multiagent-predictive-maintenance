"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TextArea, TextField } from "@via-ds/components";

export function FormEditButton({ editing, onEdit, onSave }) {
  return (
    <button
      type="button"
      onClick={editing ? onSave : onEdit}
      className="shrink-0 rounded-md px-2.5 py-1 text-sm font-semibold text-[#00684A] hover:bg-[#E3FCF7]"
    >
      {editing ? "Save" : "Edit"}
    </button>
  );
}

export function EditSlot({ slotId, children }) {
  const [node, setNode] = useState(null);

  useEffect(() => {
    setNode(slotId ? document.getElementById(slotId) : null);
  }, [slotId]);

  if (!node) return null;
  return createPortal(children, node);
}

export default function EditableField({
  label,
  value,
  onChange,
  editing,
  multiline = false,
  fill = false,
}) {
  const Field = multiline ? TextArea : TextField;

  return (
    <Field
      className={fill ? "fill-field" : undefined}
      label={label}
      value={value}
      onChange={onChange}
      isReadOnly={!editing}
    />
  );
}
