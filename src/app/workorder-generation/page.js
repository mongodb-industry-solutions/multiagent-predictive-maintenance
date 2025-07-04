"use client";
import React from "react";
import dynamic from "next/dynamic";
//import Code from "@leafygreen-ui/code";
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
    <main className="flex flex-col w-full h-full min-h-screen">
      {/* Page Title & Subheader */}
      <div className="w-full flex flex-col items-center justify-center mt-2 mb-4">
        <h1 className="text-xl font-bold mb-1 text-center">
          Workorder Generation
        </h1>
        <div
          className="text-gray-600 text-center max-w-3xl text-sm leading-tight"
          style={{ lineHeight: 1.3 }}
        >
          Select an incident report, continue the workflow, and generate
          workorders. The agent will propose a workorder based on the selected
          incident and display all generated workorders.
        </div>
      </div>
      {/* Main content split */}
      <div className="flex flex-1 w-full gap-8">
        {/* Left Section */}
        <div className="flex flex-col w-1/2 h-full">
          {/* Continue Workflow Button centered */}
          <div className="flex justify-center mb-4">
            <Button
              className="self-center w-auto min-w-0"
              disabled={!canContinue}
              variant="primary"
              onClick={handleContinueWorkflow}
            >
              Continue Workflow
            </Button>
          </div>
          {/* Horizontal split: Incident Reports (left), Samples (right) */}
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Incident Reports CardList */}
            <div className="w-1/2 flex flex-col">
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
            <div className="w-1/2 flex flex-col gap-3">
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
        </div>
        {/* Right Section */}
        <div className="flex flex-col w-1/2 h-full">
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
          <div className="flex flex-1 gap-4 min-h-0">
            <div className="w-1/2 flex flex-col">
              <WorkOrderForm
                form={workOrderForm}
                handleFormChange={handleFormChange}
              />
            </div>
            <div className="w-1/2 flex flex-col gap-3">
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
        </div>
      </div>
    </main>
  );
}
