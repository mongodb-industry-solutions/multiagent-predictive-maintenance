import { useState } from "react";

export function useInfoWizard({
  open,
  setOpen,
  tooltipText = "Learn more",
  iconGlyph = "Wizard",
  sections = [],
}) {
  const [selected, setSelected] = useState(0);
  return {
    open,
    setOpen,
    tooltipText,
    iconGlyph,
    sections,
    selected,
    setSelected,
  };
}
