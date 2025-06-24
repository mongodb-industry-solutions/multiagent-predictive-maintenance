import { useState, useMemo, useCallback } from "react";

export function useCardList(items = [], cardType = "default") {
  // Format timestamp to locale string
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return "";

    try {
      // Handle different timestamp formats
      let date;
      if (typeof timestamp === "object" && timestamp.$date) {
        date = new Date(timestamp.$date);
      } else {
        date = new Date(timestamp);
      }

      return date.toLocaleString();
    } catch (error) {
      return timestamp;
    }
  }, []);

  // Get card configuration based on type and item
  const getCardConfig = useCallback(
    (item, type) => {
      switch (type) {
        case "alerts":
          return {
            title: item.err_name || "Unknown Error",
            flagText: item.err_code || undefined,
            description: formatTimestamp(item.ts),
          };

        case "incident-reports":
          return {
            title: `${item.error_name || item.Err_name || "Unknown Error"}${
              item.machine_id ? ` in ${item.machine_id}` : ""
            }`,
            flagText: undefined,
            description: formatTimestamp(item.ts),
          };

        case "workorders":
          return {
            title: item.title || `Workorder for ${item.machine_id}`,
            flagText: "Maintenance",
            description: formatTimestamp(item.created_at),
          };

        default:
          return {
            title: item.title || item.name || "Item",
            flagText: undefined,
            description: "",
          };
      }
    },
    [formatTimestamp]
  );

  const cardConfigs = useMemo(() => {
    return items.map((item) => getCardConfig(item, cardType));
  }, [items, cardType, getCardConfig]);

  return {
    cardConfigs,
    formatTimestamp,
    getCardConfig,
  };
}
