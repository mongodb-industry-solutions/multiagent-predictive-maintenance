import { useState } from "react";

export function useInfoWizard({
  open,
  setOpen,
  tooltipText = "Learn more",
  iconGlyph = "Wizard",
  triggerText = "Tell me more!",
  iconOnly = false,
  darkMode = false,
  sections = [],
}) {
  const [selected, setSelected] = useState(0);
  return {
    open,
    setOpen,
    tooltipText,
    iconGlyph,
    triggerText,
    iconOnly,
    darkMode,
    sections,
    selected,
    setSelected,
  };
}
