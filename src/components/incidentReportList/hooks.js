import { useState } from "react";

export function useIncidentReportList() {
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedType, setExpandedType] = useState(null); // 'form' or 'json'

  function handleExpand(id, type) {
    setExpandedCard(id);
    setExpandedType(type);
  }
  function handleCollapse() {
    setExpandedCard(null);
    setExpandedType(null);
  }

  return {
    expandedCard,
    expandedType,
    handleExpand,
    handleCollapse,
  };
}
