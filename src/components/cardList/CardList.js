import React from "react";
import { useCardList } from "./hooks";
import ExpandableCard from "@leafygreen-ui/expandable-card";
import dynamic from "next/dynamic";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((mod) => mod.Code),
  { ssr: false }
);

export default function CardList({
  items = [],
  idField = "_id",
  cardType = "default", // NEW: type of card (alerts, incident-reports, workorders)
  selectable = false,
  selectedId,
  onSelect,
  maxHeight = "max-h-96",
  emptyText = "No items",
  listTitle = "",
}) {
  const { cardConfigs } = useCardList(items, cardType);

  return (
    <div
      className={`flex flex-col w-full h-full ${maxHeight}`}
      style={{ minHeight: 0 }}
    >
      {listTitle && (
        <h3 className="font-semibold text-lg mb-2 text-gray-800 flex-shrink-0">
          {listTitle}
        </h3>
      )}
      <div
        className="flex flex-col gap-3 flex-1 overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {items.length === 0 && (
          <div className="text-gray-400 text-center">{emptyText}</div>
        )}
        {items.map((item, index) => {
          const id = item[idField];
          const isSelected = selectable && selectedId === id;
          const config = cardConfigs[index];

          return (
            <div
              key={id}
              className={`${selectable ? "cursor-pointer" : ""}`}
              onClick={selectable ? () => onSelect(id) : undefined}
            >
              <ExpandableCard
                title={config.title}
                description={config.description}
                flagText={config.flagText}
                style={isSelected ? { backgroundColor: "#f3f4f6" } : {}}
              >
                <div className="w-full">
                  <Code
                    language="json"
                    className="w-full"
                    style={{ width: "100%" }}
                  >
                    {JSON.stringify(item, null, 2)}
                  </Code>
                </div>
              </ExpandableCard>
            </div>
          );
        })}
      </div>
    </div>
  );
}
