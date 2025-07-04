"use client";
import React from "react";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import { useFailureDetectionPage } from "./hooks";
import MachineController from "@/components/machineController/MachineController";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import IncidentResponseForm from "@/components/forms/IncidentResponseForm/IncidentResponseForm";
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
    <main className="flex flex-col w-full h-full min-h-screen">
      {/* Page Title & Subheader */}
      <div className="w-full flex flex-col items-center justify-center mt-2 mb-4">
        <h1 className="text-xl font-bold mb-1 text-center">
          Incident Response
        </h1>
        <div
          className="text-gray-600 text-center max-w-3xl text-sm leading-tight"
          style={{ lineHeight: 1.3 }}
        >
          Monitor a simulated machine, trigger alerts, and see how the agent
          responds with root cause analysis and repair instructions. Use the
          controls to simulate telemetry and observe real-time incident
          handling.
        </div>
      </div>
      {/* Main content split */}
      <div className="flex flex-1 w-full gap-12">
        {/* Left Section: Machine Simulation */}
        <div className="flex flex-col w-1/2 h-full pb-8">
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
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Machine Telemetry JSON */}
            <div className="w-1/2 flex flex-col">
              <div className="font-semibold mb-2">Machine Telemetry</div>
              <Code
                language="json"
                className="flex-1 min-h-[300px] max-h-[600px] h-full"
                style={{ minHeight: 0 }}
              >
                {sim.machineData
                  ? JSON.stringify(sim.machineData, null, 2)
                  : {}}
              </Code>
            </div>
            {/* Controls and Alerts */}
            <div className="w-1/2 flex flex-col gap-4 h-full">
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
        </div>
        {/* Right Section: Agent Response */}
        <div className="flex flex-col w-1/2 h-full pb-8">
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
          <div className="flex flex-1 gap-4 min-h-0">
            <div className="w-1/2 flex flex-col h-full">
              <IncidentResponseForm
                rootCause={rootCause}
                repairInstructions={repairInstructions}
                className="flex-1 mb-8"
              />
            </div>
            <div className="w-1/2 flex flex-col h-full">
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
        </div>
      </div>
    </main>
  );
}
