"use client";
import React, { useState } from "react";
import { Button, CodeBlock, CodeSnippet, CopyButton } from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import { useFailureDetectionPage } from "./hooks";
import MachineController from "@/components/machineController/MachineController";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import AlertCardList from "@/components/unsAction/AlertCardList";
import DocumentModal from "@/components/unsAction/DocumentModal";

export default function Page() {
  const {
    sim,
    agentActive,
    showModal,
    setShowModal,
    incidentReports,
    modalContent,
    handleStart,
    handleStop,
    handleTriggerRootCause,
    agentLogs,
    agentThreadId,
    showTelemetry,
    setShowTelemetry,
    refreshIncidentReports,
  } = useFailureDetectionPage();

  const [inspectedAlert, setInspectedAlert] = useState({
    open: false,
    title: "",
    subtitle: "",
    value: null,
  });

  const telemetryJson = sim.machineData
    ? JSON.stringify(
        Object.fromEntries(
          Object.entries(sim.machineData).filter(([key]) => key !== "_id")
        ),
        null,
        2
      )
    : "{}";

  return (
    <main className="flex h-full w-full flex-col">
      <div className="flex min-h-0 w-full flex-1 gap-6 px-2 pb-4">
        {/* Left Section: Machine Simulation & Unified Alerts */}
        <section
          id="detection"
          className="mx-2 mb-2 mt-0 flex min-h-[320px] min-w-[320px] w-1/2 flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white p-4 shadow-sm"
        >
          <div className="mb-3 w-full shrink-0 border-b border-[#E8EDEB] pb-3">
            <MachineController
              status={sim.status}
              isRunning={sim.isRunning}
              isStarting={sim.isStarting}
              busy={sim.isSensorBusy}
              message={sim.sensorMessage}
              temperature={sim.temperature}
              vibration={sim.vibration}
              thresholds={sim.thresholds}
              onCommitTemperature={sim.onCommitTemperature}
              onCommitVibration={sim.onCommitVibration}
              onCommitTemperatureThreshold={sim.onCommitTemperatureThreshold}
              onCommitVibrationThreshold={sim.onCommitVibrationThreshold}
              onStart={handleStart}
              onStop={handleStop}
              telemetryButton={
                <button
                  type="button"
                  onClick={() => setShowTelemetry((visible) => !visible)}
                  aria-pressed={showTelemetry}
                  className="inline-flex h-9 w-fit items-center justify-center gap-2 rounded-lg border border-[#D8E3DF] bg-white px-3.5 text-sm font-medium text-[#00684A] transition hover:bg-[#E3FCF7]"
                >
                  <span
                    aria-hidden="true"
                    className="font-mono text-sm font-semibold"
                  >
                    {"{}"}
                  </span>
                  {showTelemetry ? "Hide telemetry" : "View telemetry"}
                </button>
              }
            />
          </div>

          {/* Bottom part: Alerts and (optionally) Telemetry */}
          {showTelemetry ? (
            <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
              {/* Left: Machine Telemetry */}
              <div className="flex h-full min-w-[180px] w-1/2 flex-col">
                <div className="mb-2 text-sm font-semibold text-[#112733]">
                  {sim.dataSource === "leafy"
                    ? "Leafy Factory Telemetry"
                    : "Machine Telemetry"}
                </div>
                <div className="telemetry-code min-h-0 max-h-full flex-1">
                  <CodeBlock
                    language="json"
                    className="code-block-white h-full min-h-0"
                    style={{ minHeight: 0 }}
                  >
                    <CodeSnippet>{telemetryJson}</CodeSnippet>
                    <CopyButton copyText={telemetryJson}>
                      <Button aria-label="Copy code">
                        <Icon glyph="Copy" />
                      </Button>
                    </CopyButton>
                  </CodeBlock>
                </div>
              </div>
              {/* Right: Unified Alerts */}
              <div className="flex h-full min-w-[180px] w-1/2 flex-col">
                <AlertCardList
                  items={sim.alerts}
                  isLoading={sim.alertsLoading}
                  selectedId={sim.selectedAlertId}
                  activeAlertId={sim.activeAlertId}
                  agentActive={agentActive}
                  compact
                  onSelect={sim.setSelectedAlertId}
                  onTriggerRootCause={handleTriggerRootCause}
                  onInspectDocument={(item, display) =>
                    setInspectedAlert({
                      open: true,
                      title: `${display.errCode} · ${display.title}`,
                      subtitle: "db.alerts document",
                      value: item,
                    })
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <AlertCardList
                items={sim.alerts}
                isLoading={sim.alertsLoading}
                selectedId={sim.selectedAlertId}
                activeAlertId={sim.activeAlertId}
                agentActive={agentActive}
                onSelect={sim.setSelectedAlertId}
                onTriggerRootCause={handleTriggerRootCause}
                onInspectDocument={(item, display) =>
                  setInspectedAlert({
                    open: true,
                    title: `${display.errCode} · ${display.title}`,
                    subtitle: "db.alerts document",
                    value: item,
                  })
                }
              />
            </div>
          )}
        </section>

        {/* Right Section: Agent Response */}
        <section
          id="root-cause-analysis"
          className="mx-2 mb-2 mt-0 flex min-h-[320px] min-w-[320px] w-1/2 flex-col overflow-hidden rounded-xl border border-[#D8E3DF] bg-white p-4 shadow-sm"
        >
          {/* AgentStatus centered */}
          <div className="mb-4 flex w-full justify-center">
            <div className="w-full">
              <AgentStatus
                isActive={agentActive}
                showModal={showModal}
                onCloseModal={() => setShowModal(false)}
                setShowModal={setShowModal}
                modalContent={modalContent}
                logs={agentLogs || []}
                threadId={agentThreadId}
                statusText="Agent"
                activeText="Active"
                inactiveText="Inactive"
              />
            </div>
          </div>
          {/* Incident Reports CardList fills available space */}
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <CardList
              items={incidentReports}
              idField="_id"
              cardType="incident-reports"
              maxHeight="max-h-full"
              emptyText="No incident reports"
              listTitle="Incident Reports"
              listDescription="Automated incident reports with root cause analysis."
              onIncidentSaved={refreshIncidentReports}
            />
          </div>
        </section>
      </div>

      <DocumentModal
        open={inspectedAlert.open}
        title={inspectedAlert.title}
        subtitle={inspectedAlert.subtitle}
        value={inspectedAlert.value}
        onClose={() =>
          setInspectedAlert((current) => ({ ...current, open: false }))
        }
      />
    </main>
  );
}
