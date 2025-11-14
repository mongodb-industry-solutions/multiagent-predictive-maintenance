import React from "react";
import TextArea from "@leafygreen-ui/text-area";
import { useIncidentResponseForm } from "./hooks";

export default function IncidentResponseForm({
  rootCause,
  recommendations = [],
  className = "",
}) {
  useIncidentResponseForm(); // For future extensibility
  
  // Format recommendations array as string
  const formattedRecommendations = Array.isArray(recommendations) 
    ? recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')
    : recommendations;
  
  return (
    <div
      className={`flex flex-col w-full h-full gap-2 ${className}`}
      style={{ minHeight: 0 }}
    >
      <div className="flex flex-col flex-[1_1_0%] min-h-0">
        <TextArea
          label="Root Cause Analysis"
          value={rootCause}
          readOnly
          className="resize-none mb-1 h-full"
          rows={3}
          style={{ flex: 1, minHeight: 120, height: "100%" }}
        />
      </div>
      <div className="flex flex-col flex-[3_3_0%] min-h-0">
        <TextArea
          label="Recommendations"
          value={formattedRecommendations}
          readOnly
          className="resize-none h-full"
          rows={8}
          style={{ flex: 1, minHeight: 250 }}
        />
      </div>
    </div>
  );
}
