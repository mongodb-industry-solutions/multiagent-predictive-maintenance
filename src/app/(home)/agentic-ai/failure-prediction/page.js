"use client";
import React from "react";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import { useFailureDetectionPage } from "./hooks";
import MachineController from "@/components/machineController/MachineController";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";

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
    agentLogs,
    showTelemetry,
    setShowTelemetry,
  } = useFailureDetectionPage();

  return (
    <main className="flex flex-col w-full h-full">
        <div className="flex flex-1 min-h-0 w-full gap-6 px-2 pb-4">
          {/* Left Section: Machine Simulation */}
          <section
            id="detection"
            className="mx-2 mb-2 mt-0 flex min-h-[320px] min-w-[320px] w-1/2 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4"
          >
            {/* Top part: Buttons (30%) and MachineController (70%) */}
            <div className="flex flex-row w-full gap-4 mb-4 min-h-[100px] max-h-[120px]">
              {/* Left: Buttons */}
              <div
                className="flex flex-col gap-2 items-center justify-center h-full"
                style={{ flexBasis: "30%", minWidth: 120 }}
              >
                <Button
                  variant={sim.isRunning ? "danger" : "primary"}
                  onClick={sim.isRunning ? handleStop : handleStart}
                  className="mb-2 w-full"
                >
                  {sim.isRunning ? "Stop Simulator" : "Start Simulator"}
                </Button>
                <Button
                  variant="default"
                  onClick={() => setShowTelemetry((v) => !v)}
                  className="w-full"
                >
                  {showTelemetry ? "Hide Telemetry" : "Show Telemetry"}
                </Button>
              </div>
              {/* Right: MachineController */}
              <div className="flex-1 flex items-center min-w-0">
                <MachineController
                  status={sim.status}
                  temperature={sim.temperature}
                  vibration={sim.vibration}
                  onTemperatureChange={sim.onTemperatureChange}
                  onVibrationChange={sim.onVibrationChange}
                />
              </div>
            </div>
            {/* Bottom part: Alerts and (optionally) Telemetry */}
            {showTelemetry ? (
              <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
                {/* Left: Machine Telemetry */}
                <div className="w-1/2 flex flex-col min-w-[180px] h-full">
                  <div className="font-semibold mb-2">Machine Telemetry</div>
                  <div className="flex-1 min-h-0 max-h-full overflow-y-auto">
                    <Code
                      language="json"
                      className="flex-1 min-h-0 max-h-full h-full overflow-y-auto"
                      style={{ minHeight: 0 }}
                    >
                      {sim.machineData
                        ? JSON.stringify(
                            Object.fromEntries(
                              Object.entries(sim.machineData).filter(
                                ([key]) => key !== "_id"
                              )
                            ),
                            null,
                            2
                          )
                        : {}}
                    </Code>
                  </div>
                </div>
                {/* Right: Alerts */}
                <div className="w-1/2 flex flex-col min-w-[180px] h-full">
                  <CardList
                    items={sim.alerts}
                    idField="_id"
                    cardType="alerts"
                    maxHeight="max-h-full"
                    emptyText="No alerts"
                    listTitle="Alerts"
                    listDescription="Start the simulation and increase the temperature and vibration values to trigger an alert."
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <CardList
                  items={sim.alerts}
                  idField="_id"
                  cardType="alerts"
                  maxHeight="max-h-full"
                  emptyText="No alerts"
                  listTitle="Alerts"
                  listDescription="Start the simulation and increase the temperature and vibration values to trigger an alert."
                />
              </div>
            )}
          </section>
          {/* Right Section: Agent Response */}
          <section
            id="root-cause-analysis"
            className="mx-2 mb-2 mt-0 flex min-h-[320px] min-w-[320px] w-1/2 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4"
          >
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
            {/* Incident Reports CardList fills available space */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <CardList
                items={incidentReports}
                idField="_id"
                cardType="incident-reports"
                maxHeight="max-h-full"
                emptyText="No incident reports"
                listTitle="Incident Reports"
                listDescription="Automated incident reports with root cause analysis."
              />
            </div>
          </section>
        </div>
    </main>
  );
}
