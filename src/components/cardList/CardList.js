import React from "react";
import { useCardList } from "./hooks";
import Button from "@leafygreen-ui/button";
import dynamic from "next/dynamic";
//import Code from "@leafygreen-ui/code";

const Code = dynamic(
  () => import("@leafygreen-ui/code").then((mod) => mod.Code),
  { ssr: false }
);

export default function CardList({
  items = [],
  idField = "id",
  primaryFields = [],
  selectable = false,
  selectedId,
  onSelect,
  cardTitle,
  cardActions,
  maxHeight = "max-h-96",
  emptyText = "No items",
  listTitle = "", // NEW: configurable title
}) {
  const { expandedCard, expandedType, handleExpand, handleCollapse } =
    useCardList();

  return (
    <div
      className={`flex flex-col w-full h-full overflow-y-auto gap-4 ${maxHeight}`}
    >
      {listTitle && (
        <h3 className="font-semibold text-lg mb-2 text-gray-800">
          {listTitle}
        </h3>
      )}
      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <div className="text-gray-400 text-center">{emptyText}</div>
        )}
        {items.map((item) => {
          const id = item[idField];
          const isSelected = selectable && selectedId === id;
          return (
            <div
              key={id}
              className={`border rounded shadow-sm p-4 relative transition-colors ${
                isSelected
                  ? "bg-blue-50 border-blue-400"
                  : "bg-white hover:bg-gray-50 border-gray-200"
              } ${selectable ? "cursor-pointer" : ""}`}
              onClick={selectable ? () => onSelect(id) : undefined}
              style={
                selectable
                  ? { boxShadow: isSelected ? "0 0 0 2px #2563eb" : undefined }
                  : {}
              }
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-800">
                    {cardTitle
                      ? typeof cardTitle === "function"
                        ? cardTitle(item)
                        : cardTitle
                      : primaryFields
                          .map((f) => item[f])
                          .filter(Boolean)
                          .join(" - ")}
                  </div>
                  {primaryFields.length > 1 && (
                    <div className="text-xs text-gray-500">
                      {primaryFields
                        .slice(1)
                        .map((f) => item[f])
                        .join(" | ")}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {cardActions &&
                    cardActions(item, {
                      expandedCard,
                      expandedType,
                      handleExpand,
                    })}
                  <Button
                    aria-label="Expand as JSON"
                    className="!p-1 !rounded-full !bg-gray-200 !text-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpand(id, "json");
                    }}
                    disabled={expandedCard === id && expandedType === "json"}
                  >
                    <span className="material-icons">code</span>
                  </Button>
                </div>
              </div>
              {/* Expanded content */}
              {expandedCard === id && expandedType === "json" && (
                <div className="mt-3 border-t pt-3 max-h-48 overflow-y-auto">
                  <Code language="json">{JSON.stringify(item, null, 2)}</Code>
                  <div className="flex justify-end mt-2">
                    <Button size="xsmall" onClick={handleCollapse}>
                      Collapse
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
