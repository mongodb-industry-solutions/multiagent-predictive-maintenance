import { useState, useCallback } from "react";
import { callRootCauseAgent } from "@/lib/api/agent";

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
      // Clear previous incident reports for a fresh start
      console.log('Clearing previous incident reports...');
      const deleteResponse = await fetch('/api/incident-reports', { method: 'DELETE' });
      if (deleteResponse.ok) {
        const deleteResult = await deleteResponse.json();
        console.log(deleteResult.message);
      }
      
      // Clear UI state
      setIncidentReports([]);
      setAgentLogs([]);
      
      // Fetch delayed shipments from API
      const response = await fetch('/api/shipments?status=delayed');
      if (!response.ok) {
        throw new Error(`Failed to fetch shipments: ${response.statusText}`);
      }
      
      const delayedShipmentsData = await response.json();
      console.log('Fetched delayed shipments:', delayedShipmentsData);
      
      setDelayedShipments(delayedShipmentsData);
      
      // Trigger agent analysis for each delayed shipment
      for (const shipment of delayedShipmentsData) {
        console.log(`Analyzing shipment: ${shipment.shipment_id}`);
        
        setAgentLogs(prev => [...prev, {
          type: "user",
          values: {
            content: `Starting analysis for shipment ${shipment.shipment_id}`
          }
        }]);
        
        await callRootCauseAgent(shipment, {
          onEvent: (evt) => {
            if (evt.type === "update" || evt.type === "tool_start" || evt.type === "tool_end") {
              setAgentLogs(prev => [...prev, evt]);
            } else if (evt.type === "final") {
              setAgentLogs(prev => [...prev, evt]);
            } else if (evt.type === "error") {
              setAgentLogs(prev => [...prev, evt]);
            }
          }
        });
      }
      
      setAgentActive(false);
      
      // Fetch generated incident reports
      console.log('Fetching incident reports...');
      const reportsResponse = await fetch('/api/incident-reports');
      if (reportsResponse.ok) {
        const reports = await reportsResponse.json();
        console.log('Fetched incident reports:', reports);
        setIncidentReports(reports);
      }
      
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