"use client";
import React from "react";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import { useFailureDetectionPage } from "./hooks";
import MachineController from "@/components/machineController/MachineController";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import FactorySourceSelector from "@/components/factorySourceSelector/FactorySourceSelector";

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
    handleSourceChange,
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
            {/* Top: data source and actions on the left, machine controls on the right */}
            <div className="mb-4 flex min-h-[164px] w-full flex-row gap-6">
              <div
                className="flex h-full flex-col justify-center gap-3"
                style={{ flexBasis: "34%", minWidth: 190 }}
              >
                <FactorySourceSelector
                  source={sim.dataSource}
                  onChange={handleSourceChange}
                  connected={
                    sim.dataSource === "local" || sim.leafyAvailable === true
                  }
                  isChecking={sim.isSourceChecking}
                  disabled={sim.isStarting || sim.isSourceChecking}
                  className="w-full"
                  buttonClassName="w-full justify-between"
                  menuAlign="left"
                />
                {sim.sourceError && (
                  <p className="text-xs font-medium text-[#B1371F]">
                    {sim.sourceError}
                  </p>
                )}
                <Button
                  variant={sim.isRunning ? "danger" : "primary"}
                  onClick={sim.isRunning ? handleStop : handleStart}
                  disabled={sim.isStarting}
                  className="w-full"
                >
                  {sim.isStarting
                    ? "Opening order..."
                    : sim.isRunning
                      ? "Stop Simulator"
                      : "Start Simulator"}
                </Button>
              </div>
              {/* Right: machine and sensor controls */}
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div className="flex items-center">
                  <MachineController
                    status={sim.status}
                    temperature={sim.temperature}
                    vibration={sim.vibration}
                    onTemperatureChange={sim.onTemperatureChange}
                    onVibrationChange={sim.onVibrationChange}
                  />
                </div>
                <div className="mt-1 grid grid-cols-[3fr_2fr]">
                  <button
                    type="button"
                    onClick={() => setShowTelemetry((visible) => !visible)}
                    aria-pressed={showTelemetry}
                    className="inline-flex h-8 items-center justify-self-center gap-2 rounded-lg px-3 text-sm font-medium text-[#00684A] hover:bg-[#E3FCF7]"
                  >
                    <span
                      aria-hidden="true"
                      className="font-mono text-xs font-semibold"
                    >
                      {"{}"}
                    </span>
                    {showTelemetry ? "Hide telemetry" : "View telemetry"}
                  </button>
                </div>
              </div>
            </div>
            {/* Bottom part: Alerts and (optionally) Telemetry */}
            {showTelemetry ? (
              <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
                {/* Left: Machine Telemetry */}
                <div className="w-1/2 flex flex-col min-w-[180px] h-full">
                  <div className="font-semibold mb-2">
                    {sim.dataSource === "leafy"
                      ? "Leafy Factory Telemetry"
                      : "Machine Telemetry"}
                  </div>
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
