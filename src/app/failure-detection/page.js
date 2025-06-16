"use client";
import React from "react";
import Code from "@leafygreen-ui/code";
import Button from "@leafygreen-ui/button";
import { useFailureDetectionPage } from "./hooks";
import MachineController from "@/components/machineController/MachineController";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import IncidentResponseForm from "@/components/forms/IncidentResponseForm/IncidentResponseForm";

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
      <div className="flex flex-1 w-full gap-8">
        {/* Left Section: Machine Simulation */}
        <div className="flex flex-col w-1/2 h-full">
          {/* Start/Stop Button centered */}
          <div className="flex justify-center mb-4">
            {sim.isRunning ? (
              <Button variant="danger" onClick={handleStop}>
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
              <MachineController
                status={sim.status}
                temperature={sim.temperature}
                vibration={sim.vibration}
                onTemperatureChange={sim.onTemperatureChange}
                onVibrationChange={sim.onVibrationChange}
              />
              <div className="flex-1 flex flex-col">
                <CardList
                  items={sim.alerts}
                  idField="_id"
                  primaryFields={["err_code", "err_name", "ts"]}
                  maxHeight="max-h-48"
                  emptyText="No alerts"
                  listTitle="Alerts"
                />
              </div>
            </div>
          </div>
        </div>
        {/* Right Section: Agent Response */}
        <div className="flex flex-col w-1/2 h-full">
          {/* AgentStatus centered */}
          <div className="flex justify-center mb-4">
            <AgentStatus
              isActive={agentActive}
              onInfo={() => setShowModal(true)}
              onCloseModal={() => setShowModal(false)}
              showModal={showModal}
              modalContent={modalContent}
              statusText="Agent"
              activeText="Active"
              inactiveText="Inactive"
            />
          </div>
          {/* Horizontal split: Form (left), Incident Reports (right) */}
          <div className="flex flex-1 gap-4 min-h-0">
            <div className="w-1/2 flex flex-col">
              <IncidentResponseForm
                rootCause={rootCause}
                repairInstructions={repairInstructions}
              />
            </div>
            <div className="w-1/2 flex flex-col">
              <CardList
                items={incidentReports}
                idField="Id"
                primaryFields={["Err_name", "ts"]}
                maxHeight="max-h-80"
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
