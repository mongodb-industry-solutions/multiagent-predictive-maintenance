import { useState, useCallback } from "react";

export function useRootCauseAnalysis() {
  // Simulation state
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [delayedShipments, setDelayedShipments] = useState([]);
  
  // Agent state (placeholder for later)
  const [agentActive, setAgentActive] = useState(false);
  const [incidentReports, setIncidentReports] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);

  // Start simulation - fetch delayed shipments
  const handleStartSimulation = useCallback(async () => {
    setIsSimulationRunning(true);
    setAgentActive(true);
    
    try {
      // Fetch delayed shipments from API
      const response = await fetch('/api/shipments?status=delayed');
      if (!response.ok) {
        throw new Error(`Failed to fetch shipments: ${response.statusText}`);
      }
      
      const delayedShipmentsData = await response.json();
      console.log('Fetched delayed shipments:', delayedShipmentsData);
      
      setDelayedShipments(delayedShipmentsData);
      
      // TODO: Later, trigger agent analysis for each delayed shipment
      
    } catch (error) {
      console.error("Error starting simulation:", error);
      setIsSimulationRunning(false);
      setAgentActive(false);
    }
  }, []);

  // Stop simulation
  const handleStopSimulation = useCallback(() => {
    setIsSimulationRunning(false);
    setAgentActive(false);
    setDelayedShipments([]);
    setIncidentReports([]);
    setAgentLogs([]);
  }, []);

  return {
    // Simulation state
    isSimulationRunning,
    delayedShipments,
    
    // Agent state
    agentActive,
    incidentReports,
    agentLogs,
    
    // Actions
    handleStartSimulation,
    handleStopSimulation,
  };
}