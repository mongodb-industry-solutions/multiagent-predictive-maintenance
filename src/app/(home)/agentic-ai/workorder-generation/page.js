"use client";
import React from "react";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import WorkOrderForm from "@/components/forms/workOrderForm/WorkOrderForm";
import { useWorkOrderGenerationPage } from "./hooks";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((mod) => mod.Code),
  { ssr: false }
);

export default function Page() {
  const {
    selectedIncidentId,
    handleIncidentSelect,
    canContinue,
    handleContinueWorkflow,
    handleFormChange,
    workorders,
    agentStatus,
    showModal,
    setShowModal,
    modalContent,
    incidentReports,
    emptyIncidentText,
    agentLogs,
  } = useWorkOrderGenerationPage();

  // Find the selected incident object
  const selectedIncidentObj = incidentReports.find(
    (ir) => ir._id === selectedIncidentId || ir.Id === selectedIncidentId
  );

  return (
    <main className="flex flex-col w-full h-full">
        <div className="flex flex-1 min-h-0 w-full gap-6 px-2 pb-4">
          {/* Left Section */}
          <section className="mx-2 mb-2 mt-0 flex min-h-[320px] min-w-[320px] w-1/2 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
            {/* Continue Workflow Button left aligned */}
            <div className="flex justify-start mb-4">
              <Button
                className="self-start w-auto min-w-0"
                disabled={!canContinue}
                variant="primary"
                onClick={handleContinueWorkflow}
              >
                Continue Workflow
              </Button>
            </div>
            {/* Incident Reports CardList fills available space */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <CardList
                items={incidentReports}
                idField={
                  incidentReports.length > 0 && incidentReports[0]._id
                    ? "_id"
                    : "Id"
                }
                cardType="incident-reports"
                selectable
                selectedId={selectedIncidentId}
                onSelect={handleIncidentSelect}
                maxHeight="max-h-full"
                emptyText={emptyIncidentText || "No incident reports"}
                listTitle="Incident Reports"
                listDescription="Select an incident report and continue the workflow to produce a workorder draft."
              />
            </div>
          </section>
          {/* Right Section */}
          <section className="mx-2 mb-2 mt-0 flex min-h-[320px] min-w-[320px] w-1/2 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
            {/* AgentStatus centered */}
            <div className="flex justify-center mb-4">
              <AgentStatus
                isActive={agentStatus === "active"}
                onInfo={() => setShowModal(true)}
                onCloseModal={() => setShowModal(false)}
                showModal={showModal}
                modalContent={modalContent}
                statusText="Agent"
                activeText="Active"
                inactiveText="Inactive"
                logs={agentLogs || []}
              />
            </div>
            {/* Workorders CardList fills available space */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <CardList
                items={workorders}
                idField="_id"
                cardType="workorders"
                maxHeight="max-h-full"
                emptyText="No workorders generated yet."
                listTitle="Work Orders"
                listDescription="Automated work order templates with estimated durations and required materials and skills."
              />
            </div>
          </section>
        </div>
    </main>
  );
}
