"use client";
import React from "react";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import WorkOrderForm from "@/components/forms/workOrderForm/WorkOrderForm";
import { useWorkOrderGenerationPage } from "./hooks";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import { H3, Description } from "@leafygreen-ui/typography";

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
    workOrderForm,
    handleFormChange,
    workorders,
    agentStatus,
    showModal,
    setShowModal,
    modalContent,
    incidentReports,
    inventorySample,
    staffSample,
    emptyIncidentText,
    agentLogs,
  } = useWorkOrderGenerationPage();

  // Find the selected incident object
  const selectedIncidentObj = incidentReports.find(
    (ir) => ir._id === selectedIncidentId || ir.Id === selectedIncidentId
  );

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <main className="flex flex-col w-full h-full">
        {/* Page Title & Subheader */}
        <div className="flex flex-col items-start justify-center px-6 py-4">
          <H3 className="mb-1 text-left">Process Automation</H3>
          <Description className="text-left max-w-2xl mb-2">
            Generate and manage workorders from incident reports.
          </Description>
        </div>
        <div className="flex flex-1 min-h-0 w-full gap-6 px-2 pb-4">
          {/* Left Section */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* Continue Workflow Button centered */}
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
            {/* Horizontal split: Incident Reports (left), Samples (right) */}
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
              {/* Incident Reports CardList */}
              <div className="w-1/2 flex flex-col min-w-[180px]">
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
                  maxHeight="max-h-80"
                  emptyText={emptyIncidentText || "No incident reports"}
                  listTitle="Incident Reports"
                />
              </div>
              {/* Sample Code Cards */}
              <div className="w-1/2 flex flex-col gap-3 min-w-[180px]">
                <div className="bg-gray-50 rounded-lg shadow p-3">
                  <div className="font-semibold text-gray-700 mb-1 text-sm">
                    Inventory Sample
                  </div>
                  <Code language="json">
                    {JSON.stringify(inventorySample, null, 2)}
                  </Code>
                </div>
                <div className="bg-gray-50 rounded-lg shadow p-3">
                  <div className="font-semibold text-gray-700 mb-1 text-sm">
                    Staff Sample
                  </div>
                  <Code language="json">
                    {JSON.stringify(staffSample, null, 2)}
                  </Code>
                </div>
              </div>
            </div>
          </section>
          {/* Right Section */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
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
            {/* Horizontal split: WorkOrderForm (left), Workorders CardList (right) */}
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
              <div className="w-1/2 flex flex-col min-w-[180px]">
                <WorkOrderForm
                  form={workOrderForm}
                  handleFormChange={handleFormChange}
                />
              </div>
              <div className="w-1/2 flex flex-col gap-3 min-w-[180px]">
                <CardList
                  items={workorders}
                  idField="_id"
                  cardType="workorders"
                  maxHeight="max-h-80"
                  emptyText="No workorders generated yet."
                  listTitle="Workorders"
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </LeafyGreenProvider>
  );
}
