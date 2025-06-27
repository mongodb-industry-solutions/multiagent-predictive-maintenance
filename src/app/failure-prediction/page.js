"use client";
import React from "react";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import { H3, Description } from "@leafygreen-ui/typography";
import { useFailureDetectionPage } from "./hooks";
import MachineController from "@/components/machineController/MachineController";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import IncidentResponseForm from "@/components/forms/IncidentResponseForm/IncidentResponseForm";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import AgentLogs from "@/components/agentLogs/AgentLogs";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((mod) => mod.Code),
  { ssr: false }
);

export default function Page() {
  const {
    sim,
    agentActive,
    showModal,
    setShowModal,
    rootCause,
    repairInstructions,
    incidentReports,
    modalContent,
    handleStart,
    handleStop,
    agentLogs, // <-- Make sure to get logs from the hook if available
  } = useFailureDetectionPage();

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <main className="flex flex-col w-full h-full">
        {/* Page Title & Subheader */}
        <div className="flex flex-col items-start justify-center px-6 py-4">
          <H3 className="mb-1 text-left">Root Cause Analysis</H3>
          <Description className="text-left max-w-2xl mb-2">
            Analyze machine incidents and agent responses in real time.
          </Description>
        </div>
        <div className="flex flex-1 min-h-0 w-full gap-6 px-2 pb-4">
          {/* Left Section: Machine Simulation */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* Start/Stop Button centered */}
            <div className="flex justify-center mb-4">
              {sim.isRunning ? (
                <Button variant="default" onClick={handleStop}>
                  Stop Simulator
                </Button>
              ) : (
                <Button variant="primary" onClick={handleStart}>
                  Start Simulator
                </Button>
              )}
            </div>
            {/* Horizontal split: Code card (left), Controls+Alerts (right) */}
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
              {/* Machine Telemetry JSON */}
              <div className="w-1/2 flex flex-col min-w-[180px]">
                <div className="font-semibold mb-2">Machine Telemetry</div>
                <Code
                  language="json"
                  className="flex-1 min-h-[200px] max-h-[400px] h-full"
                  style={{ minHeight: 0 }}
                >
                  {sim.machineData
                    ? JSON.stringify(sim.machineData, null, 2)
                    : {}}
                </Code>
              </div>
              {/* Controls and Alerts */}
              <div className="w-1/2 flex flex-col gap-4 h-full min-w-[180px]">
                <div className="flex flex-row items-stretch">
                  <MachineController
                    status={sim.status}
                    temperature={sim.temperature}
                    vibration={sim.vibration}
                    onTemperatureChange={sim.onTemperatureChange}
                    onVibrationChange={sim.onVibrationChange}
                  />
                </div>
                <div className="mt-2">
                  <CardList
                    items={sim.alerts}
                    idField="_id"
                    cardType="alerts"
                    maxHeight="max-h-[calc(100vh-420px)] mb-8"
                    emptyText="No alerts"
                    listTitle="Alerts"
                  />
                </div>
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
                  showModal={showModal}
                  onCloseModal={() => setShowModal(false)}
                  setShowModal={setShowModal}
                  modalContent={modalContent}
                  logs={agentLogs || []}
                  statusText="Agent"
                  activeText="Active"
                  inactiveText="Inactive"
                />
              </div>
            </div>
            {/* Horizontal split: Form (left), Incident Reports (right) */}
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
              <div className="w-1/2 flex flex-col h-full min-w-[180px]">
                <IncidentResponseForm
                  rootCause={rootCause}
                  repairInstructions={repairInstructions}
                  className="flex-1 mb-8"
                />
              </div>
              <div className="w-1/2 flex flex-col h-full min-w-[180px]">
                <CardList
                  items={incidentReports}
                  idField="_id"
                  cardType="incident-reports"
                  maxHeight="max-h-[calc(100vh-320px)] mb-8"
                  emptyText="No incident reports"
                  listTitle="Incident Reports"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </LeafyGreenProvider>
  );
}
