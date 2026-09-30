import React, { useState } from "react";
import { useCardList } from "./hooks";
import {
  Button,
  CodeBlock,
  CodeSnippet,
  CopyButton,
  Description,
  Disclosure,
  DisclosureHeader,
  DisclosurePanel,
  SegmentedControl,
  SegmentedControlItem,
  Text,
} from "@via-ds/components";
import { Icon } from "@via-ds/icons";
import IncidentResponseForm from "@/components/forms/IncidentResponseForm/IncidentResponseForm";
import WorkOrderForm from "@/components/forms/workOrderForm/WorkOrderForm";

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
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div
      className={`flex flex-col w-full h-full ${maxHeight}`}
      style={{ minHeight: 0 }}
    >
      {listTitle && (
        <Text
          textStyle="subtitle"
          className="mb-1 text-gray-800 flex-shrink-0"
        >
          {listTitle}
        </Text>
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
          const expanded = expandedId === id;
          const editSlotId = `form-edit-${id}`;
          const code = JSON.stringify(item, null, 2);
          return (
            <div
              key={id}
              className={`relative flex w-full items-start rounded-xl ${
                isSelected ? "bg-[#f3f4f6]" : ""
              }`}
            >
              {selectable && (
                <div className="absolute left-3 top-3.5 z-10">
                  <input
                    type="radio"
                    name="cardlist-radio-group"
                    checked={isSelected}
                    onChange={() => handleRadioSelect(id)}
                    className="form-radio h-5 w-5 cursor-pointer border-gray-300 text-blue-600 focus:ring-blue-500"
                    style={{ accentColor: "#2563eb" }}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <Disclosure
                  isExpanded={expanded}
                  onExpandedChange={(open) => setExpandedId(open ? id : null)}
                  className={`pm-disclosure${
                    selectable ? " pm-disclosure-with-radio" : ""
                  }${isSelected ? " pm-disclosure-selected" : ""}`}
                  style={{ backgroundColor: "transparent" }}
                >
                  <DisclosureHeader>
                    <span className="flex w-full min-w-0 items-center justify-between gap-4 pr-4">
                      <span className="flex min-w-0 items-start gap-3">
                        {config.icon && (
                          <Icon
                            glyph={config.icon}
                            size={28}
                            style={
                              config.iconColor
                                ? { color: config.iconColor }
                                : {}
                            }
                          />
                        )}
                        <span className="min-w-0">
                          <span
                            className="block"
                            style={
                              config.titleColor
                                ? { color: config.titleColor }
                                : {}
                            }
                          >
                            {config.title}
                          </span>
                          {config.description ? (
                            <span className="mt-0.5 block text-sm text-[#5C6C75]">
                              {config.description}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      {config.flagText ? (
                        <span
                          className="shrink-0"
                          style={
                            config.flagTextColor
                              ? { color: config.flagTextColor }
                              : {}
                          }
                        >
                          {config.flagText}
                        </span>
                      ) : null}
                    </span>
                  </DisclosureHeader>
                  <DisclosurePanel>
                  <div className="flex min-h-0 flex-1 flex-col">
                  {/* Segmented control for form/json view if form is available */}
                  {config.hasForm ? (
                    <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
                      <SegmentedControl
                        className="view-toggle"
                        name={`view-${id}`}
                        label="View"
                        defaultValue="form"
                        value={view}
                        onChange={(value) => setView(id, value)}
                      >
                        <SegmentedControlItem value="form">
                          Form
                        </SegmentedControlItem>
                        <SegmentedControlItem value="json">
                          JSON
                        </SegmentedControlItem>
                      </SegmentedControl>
                      {view === "form" ? <div id={editSlotId} /> : null}
                    </div>
                  ) : null}
                  {/* Form or JSON view */}
                  {config.hasForm && view === "form" ? (
                    cardType === "incident-reports" ? (
                      <IncidentResponseForm
                        editSlotId={editSlotId}
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
                      />
                    ) : cardType === "workorders" ? (
                      <WorkOrderForm
                        editSlotId={editSlotId}
                        form={item}
                        handleFormChange={() => {}}
                      />
                    ) : null
                  ) : (
                    <div className="w-full">
                      <CodeBlock
                        language="json"
                        className="code-block-white w-full"
                        style={{ width: "100%" }}
                      >
                        <CodeSnippet>{code}</CodeSnippet>
                        <CopyButton copyText={code}>
                          <Button aria-label="Copy code">
                            <Icon glyph="Copy" />
                          </Button>
                        </CopyButton>
                      </CodeBlock>
                    </div>
                  )}
                  </div>
                  </DisclosurePanel>
                </Disclosure>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
