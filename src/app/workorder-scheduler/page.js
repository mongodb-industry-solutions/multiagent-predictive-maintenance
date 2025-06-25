"use client";

import React from "react";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useWorkorderSchedulerPage } from "./hooks";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((mod) => mod.Code),
  { ssr: false }
);

function renderEventContent(eventInfo) {
  return (
    <>
      <b>{eventInfo.timeText}</b> <i>{eventInfo.event.title}</i>
    </>
  );
}

export default function WorkorderSchedulerPage() {
  const {
    workorders,
    selectedWorkorderId,
    setSelectedWorkorderId,
    workordersLoading,
    workordersError,
    productionCalendarSample,
    calendarEvents,
    calendarLoading,
    calendarError,
    agentStatus,
    showModal,
    setShowModal,
    modalContent,
    canContinue,
    handleContinueWorkflow,
  } = useWorkorderSchedulerPage();

  return (
    <main className="flex flex-col w-full h-full min-h-screen pb-8">
      {/* Page Title & Subheader */}
      <div className="w-full flex flex-col items-center justify-center mt-2 mb-4">
        <h1 className="text-xl font-bold mb-1 text-center">
          Workorder Scheduler
        </h1>
        <div
          className="text-gray-600 text-center max-w-3xl text-sm leading-tight"
          style={{ lineHeight: 1.3 }}
        >
          Select a workorder, continue the workflow, and schedule it in the
          production calendar. The agent will help you assign new workorders and
          visualize all scheduled production tasks.
        </div>
      </div>
      {/* Main content split */}
      <div className="flex flex-1 w-full gap-12">
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
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Workorders CardList */}
            <div className="w-1/2 flex flex-col">
              <CardList
                items={workorders}
                idField="_id"
                cardType="workorders"
                selectable
                selectedId={selectedWorkorderId}
                onSelect={setSelectedWorkorderId}
                maxHeight="max-h-80"
                emptyText="No workorders found."
                listTitle="Workorders (last hour)"
                isItemDisabled={(item) => item.status !== "new"}
              />
            </div>
            {/* Production Calendar Sample Code Card */}
            <div className="w-1/2 flex flex-col">
              <div className="font-semibold mb-2">
                Production Calendar Sample
              </div>
              <Code
                language="json"
                className="flex-1 min-h-[200px] max-h-[400px] h-full"
                style={{ minHeight: 0 }}
              >
                {JSON.stringify(productionCalendarSample, null, 2)}
              </Code>
            </div>
          </div>
        </div>
        {/* Right Section */}
        <div className="flex flex-col w-1/2 h-full">
          {/* AgentStatus centered */}
          <div className="flex justify-center mb-4">
            <AgentStatus
              isActive={agentStatus === "active"}
              showModal={showModal}
              setShowModal={setShowModal}
              modalContent={modalContent}
              logs={[]}
            />
          </div>
          {/* Calendar directly under AgentStatus with margin */}
          <div className="w-full mt-2">
            {calendarLoading && <div>Loading calendar...</div>}
            {calendarError && (
              <div className="text-red-500">Error: {calendarError.message}</div>
            )}
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              weekends={true}
              events={calendarEvents}
              eventContent={renderEventContent}
              height={500}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
