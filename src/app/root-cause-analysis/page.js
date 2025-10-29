"use client";
import React from "react";
import Button from "@leafygreen-ui/button";
import { H3, Description } from "@leafygreen-ui/typography";
import ShipmentCard from "../../components/shipmentCard/ShipmentCard";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import CardList from "@/components/cardList/CardList";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import { useRootCauseAnalysis } from "./hooks";

export default function RootCauseAnalysis() {
  const {
    isSimulationRunning,
    delayedShipments,
    agentActive,
    incidentReports,
    agentLogs,
    handleStartSimulation,
    handleStopSimulation,
  } = useRootCauseAnalysis();

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <main className="flex flex-col w-full h-full">
        {/* Page Title & Subheader */}
        <div className="flex flex-col items-start justify-center px-6 py-4">
          <H3 className="mb-1 text-left">Root Cause Analysis</H3>
          <Description className="text-left max-w-2xl mb-2">
            Analyze delayed shipments and generate detailed incident reports with AI-powered root cause analysis.
          </Description>
        </div>
        
        <div className="flex flex-1 min-h-0 w-full gap-6 px-2 pb-4">
          {/* Left Section: Simulation Control + Delayed Shipments */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* Top: Start Simulation Button */}
            <div className="flex flex-row w-full gap-4 mb-4 min-h-[100px] max-h-[120px]">
              <div className="flex flex-col gap-2 items-center justify-center h-full" style={{ flexBasis: "30%", minWidth: 120 }}>
                <Button
                  variant={isSimulationRunning ? "danger" : "primary"}
                  onClick={isSimulationRunning ? handleStopSimulation : handleStartSimulation}
                  className="mb-2 w-full"
                >
                  {isSimulationRunning ? "Stop Simulation" : "Start Simulation"}
                </Button>
              </div>
              <div className="flex-1 flex items-center justify-center min-w-0">
                <div className="text-gray-600">
                  {isSimulationRunning ? "Simulation Active" : "Click Start to fetch delayed shipments"}
                </div>
              </div>
            </div>
            
            {/* Bottom: Delayed Shipments */}
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="font-semibold mb-2">Delayed Shipments</div>
              <div className="flex-1 min-h-0 max-h-full overflow-y-auto space-y-4">
                {delayedShipments.length > 0 ? (
                  delayedShipments.map((shipment) => (
                    <ShipmentCard key={shipment.shipment_id} shipment={shipment} />
                  ))
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    {isSimulationRunning ? "Loading delayed shipments..." : "No delayed shipments"}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Right Section: Agent Response */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* AgentStatus centered */}
            <div className="flex justify-center mb-8 w-full">
              <div className="w-full">
                <AgentStatus
                  isActive={agentActive}
                  logs={agentLogs}
                  statusText="RCA Agent"
                  activeText="Analyzing"
                  inactiveText="Standby"
                />
              </div>
            </div>
            
            {/* Incident Reports */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <CardList
                items={incidentReports}
                idField="_id"
                cardType="incident-reports"
                maxHeight="max-h-full"
                emptyText="No incident reports generated"
                listTitle="Incident Reports"
                listDescription="AI-generated root cause analysis reports for delayed shipments."
              />
            </div>
          </section>
        </div>
      </main>
    </LeafyGreenProvider>
  );
}