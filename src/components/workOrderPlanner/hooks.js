import { useState } from "react";

export function useWorkOrderPlanner() {
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);

  function handleSelectIncident(id) {
    setSelectedIncidentId(id);
  }

  return {
    selectedIncidentId,
    handleSelectIncident,
    canContinue: selectedIncidentId !== null,
  };
}
