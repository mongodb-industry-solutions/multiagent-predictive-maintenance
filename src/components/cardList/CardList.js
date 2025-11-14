import React from "react";
import { useCardList } from "./hooks";
import ExpandableCard from "@leafygreen-ui/expandable-card";
import dynamic from "next/dynamic";
import Icon from "@leafygreen-ui/icon";
import { Description, Subtitle } from "@leafygreen-ui/typography";
import {
  SegmentedControl,
  SegmentedControlOption,
} from "@leafygreen-ui/segmented-control";
import IncidentResponseForm from "@/components/forms/IncidentResponseForm/IncidentResponseForm";
import WorkOrderForm from "@/components/forms/workOrderForm/WorkOrderForm";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((mod) => mod.Code),
  { ssr: false }
);

export default function CardList({
  items = [],
  idField = "_id",
  cardType = "default",
  selectable = false,
  selectedId,
  onSelect,
  maxHeight = "max-h-96",
  emptyText = "No items",
  listTitle = "",
  listDescription = "",
}) {
  const {
    cardConfigs,
    selectedId: selectedRadioId,
    handleRadioSelect,
    getView,
    setView,
    cardListDescription,
  } = useCardList(
    items,
    cardType,
    selectable,
    selectedId,
    onSelect,
    listDescription
  );

  return (
    <div
      className={`flex flex-col w-full h-full ${maxHeight}`}
      style={{ minHeight: 0 }}
    >
      {listTitle && (
        <Subtitle className="mb-1 text-gray-800 flex-shrink-0">
          {listTitle}
        </Subtitle>
      )}
      {cardListDescription && (
        <Description className="pb-4 text-gray-600">
          {cardListDescription}
        </Description>
      )}
      <div
        className="flex flex-col gap-3 flex-1 overflow-y-auto cardlist-scrollbar"
        style={{ minHeight: 0 }}
      >
        {items.length === 0 && (
          <div className="text-gray-400 text-center">{emptyText}</div>
        )}
        {items.map((item, index) => {
          const id = item[idField];
          const config = cardConfigs[index];
          const isSelected = selectable && selectedRadioId === id;
          const view = config.hasForm ? getView(id) : "json";
          return (
            <div key={id} className="flex items-center w-full">
              {selectable && (
                <div className="flex items-center justify-center h-full pr-2">
                  <input
                    type="radio"
                    name="cardlist-radio-group"
                    checked={isSelected}
                    onChange={() => handleRadioSelect(id)}
                    className="form-radio h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    style={{ accentColor: "#2563eb" }}
                  />
                </div>
              )}
              <div className="flex-1">
                <ExpandableCard
                  title={
                    <span className="flex items-center gap-2">
                      {config.icon && (
                        <Icon
                          glyph={config.icon}
                          size={20}
                          style={
                            config.iconColor ? { color: config.iconColor } : {}
                          }
                        />
                      )}
                      <span
                        style={
                          config.titleColor ? { color: config.titleColor } : {}
                        }
                      >
                        {config.title}
                      </span>
                    </span>
                  }
                  description={
                    config.description ? (
                      <span
                        style={
                          config.descColor ? { color: config.descColor } : {}
                        }
                      >
                        {config.description}
                      </span>
                    ) : null
                  }
                  flagText={
                    config.flagText ? (
                      <span
                        style={
                          config.flagTextColor
                            ? { color: config.flagTextColor }
                            : {}
                        }
                      >
                        {config.flagText}
                      </span>
                    ) : undefined
                  }
                  style={isSelected ? { backgroundColor: "#f3f4f6" } : {}}
                >
                  {/* Segmented control for form/json view if form is available */}
                  {config.hasForm ? (
                    <div className="mb-2">
                      <SegmentedControl
                        name={`view-${id}`}
                        label="View"
                        followFocus={true}
                        defaultValue="form"
                        value={view}
                        onChange={(value) => setView(id, value)}
                      >
                        <SegmentedControlOption value="form">
                          Form
                        </SegmentedControlOption>
                        <SegmentedControlOption value="json">
                          JSON
                        </SegmentedControlOption>
                      </SegmentedControl>
                    </div>
                  ) : null}
                  {/* Form or JSON view */}
                  {config.hasForm && view === "form" ? (
                    cardType === "incident-reports" ? (
                      <IncidentResponseForm
                        rootCause={item.root_cause || item.Root_cause || ""}
                        repairInstructions={
                          Array.isArray(item.repair_instructions)
                            ? item.repair_instructions
                                .map(
                                  (step) =>
                                    `- Step ${step.step}: ${step.description}`
                                )
                                .join("\n")
                            : item.repair_instructions || ""
                        }
                        className="flex-1"
                      />
                    ) : cardType === "workorders" ? (
                      <WorkOrderForm form={item} handleFormChange={() => {}} />
                    ) : null
                  ) : (
                    <div className="w-full">
                      <Code
                        language="json"
                        className="w-full"
                        style={{ width: "100%" }}
                      >
                        {JSON.stringify(item, null, 2)}
                      </Code>
                    </div>
                  )}
                </ExpandableCard>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
