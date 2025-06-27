"use client";

import React from "react";
import CardList from "@/components/cardList/CardList";
import AgentStatus from "@/components/agentStatus/AgentStatus";
import dynamic from "next/dynamic";
import Button from "@leafygreen-ui/button";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { useWorkorderSchedulerPage } from "./hooks";
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider";
import { H3, Description } from "@leafygreen-ui/typography";

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
    handleResetCalendar,
    agentLogs,
  } = useWorkorderSchedulerPage();

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <main className="flex flex-col w-full h-full">
        {/* Page Title & Subheader */}
        <div className="flex flex-col items-start justify-center px-6 py-4">
          <H3 className="mb-1 text-left">Maintenance Optimization</H3>
          <Description className="text-left max-w-2xl mb-2">
            Schedule and track workorders in the production calendar.
          </Description>
        </div>
        <div className="flex flex-1 min-h-0 w-full gap-6 px-2 pb-4">
          {/* Left Section */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
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
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
              {/* Workorders CardList */}
              <div className="w-1/2 flex flex-col min-w-[180px]">
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
              <div className="w-1/2 flex flex-col min-w-[180px]">
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
          </section>
          {/* Right Section */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* AgentStatus centered */}
            <div className="flex justify-center mb-4">
              <AgentStatus
                isActive={agentStatus === "active"}
                showModal={showModal}
                setShowModal={setShowModal}
                modalContent={modalContent}
                logs={agentLogs || []}
              />
            </div>
            {/* Calendar directly under AgentStatus with margin */}
            <div className="w-full mt-2 flex-1 overflow-hidden">
              {calendarLoading && <div>Loading calendar...</div>}
              {calendarError && (
                <div className="text-red-500">
                  Error: {calendarError.message}
                </div>
              )}
              <FullCalendar
                plugins={[dayGridPlugin]}
                initialView="dayGridMonth"
                weekends={true}
                events={calendarEvents}
                eventContent={renderEventContent}
                height={400}
              />
            </div>
            {/* Reset Button below calendar, right aligned */}
            <div className="flex justify-end mt-2">
              <Button variant="default" onClick={handleResetCalendar}>
                Reset Calendar
              </Button>
            </div>
          </section>
        </div>
      </main>
    </LeafyGreenProvider>
  );
}
