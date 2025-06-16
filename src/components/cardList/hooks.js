import { useState } from "react";

export function useCardList() {
  const [expandedCard, setExpandedCard] = useState(null);
  const [expandedType, setExpandedType] = useState(null); // e.g. 'json'

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
