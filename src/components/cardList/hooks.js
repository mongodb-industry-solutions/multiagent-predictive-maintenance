import { useState, useMemo, useCallback, useEffect } from "react";

export function useCardList(
  items = [],
  cardType = "default",
  selectable = false,
  selectedIdProp,
  onSelectProp,
  listDescription
) {
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
      let icon = undefined;
      let titleColor = undefined;
      let descColor = undefined;
      let flagTextColor = undefined;
      let iconColor = undefined;
      let hasForm = false;
      switch (type) {
        case "alerts":
          icon = "Warning";
          titleColor = "#5B0000";
          descColor = "#5B0000";
          flagTextColor = "#5B0000";
          iconColor = "#5B0000";
          break;
        case "incident-reports":
          icon = "Guide";
          hasForm = true;
          break;
        case "workorders":
          icon = "Wrench";
          hasForm = true;
          break;
        default:
          break;
      }
      switch (type) {
        case "alerts":
          return {
            title: `${item.err_code || ""}${
              item.err_code && item.err_name ? " - " : ""
            }${item.err_name || "Unknown Error"}`,
            flagText: formatTimestamp(item.ts),
            description: "",
            icon,
            titleColor,
            descColor,
            flagTextColor,
            iconColor,
            hasForm,
          };
        case "incident-reports":
          return {
            title: `${item.error_name || item.Err_name || "Unknown Error"}${
              item.machine_id ? ` in ${item.machine_id}` : ""
            }`,
            flagText: undefined,
            description: formatTimestamp(item.ts),
            icon,
            titleColor,
            descColor,
            flagTextColor,
            iconColor,
            hasForm,
          };
        case "workorders":
          // Title: WO- + first 5 chars of _id uppercased
          let woId = item._id || item.Id || "";
          let woShort =
            typeof woId === "string" ? woId.slice(0, 5).toUpperCase() : "";
          return {
            title: `WO-${woShort}`,
            flagText: "Maintenance",
            description: formatTimestamp(item.created_at),
            icon,
            titleColor,
            descColor,
            flagTextColor,
            iconColor,
            hasForm,
          };
        default:
          return {
            title: item.title || item.name || "Item",
            flagText: undefined,
            description: "",
            icon,
            titleColor,
            descColor,
            flagTextColor,
            iconColor,
            hasForm,
          };
      }
    },
    [formatTimestamp]
  );

  const cardConfigs = useMemo(() => {
    return items.map((item) => getCardConfig(item, cardType));
  }, [items, cardType, getCardConfig]);

  // Radio selection logic
  const [selectedId, setSelectedId] = useState(
    selectable && items.length > 0
      ? items[0]?.["_id"] || items[0]?.Id
      : undefined
  );

  // Keep in sync with controlled selectedIdProp
  useEffect(() => {
    if (selectable && selectedIdProp !== undefined) {
      setSelectedId(selectedIdProp);
    }
  }, [selectedIdProp, selectable]);

  // When items change, reset selection to first
  useEffect(() => {
    if (selectable && items.length > 0) {
      setSelectedId(items[0]?.["_id"] || items[0]?.Id);
    }
  }, [items, selectable]);

  const handleRadioSelect = (id) => {
    setSelectedId(id);
    if (onSelectProp) onSelectProp(id);
  };

  // Segmented control state per card (by id)
  const [viewById, setViewById] = useState({});
  const getView = (id) => viewById[id] || "form";
  const setView = (id, value) =>
    setViewById((prev) => ({ ...prev, [id]: value }));

  // List description
  const cardListDescription = listDescription || "";

  return {
    cardConfigs,
    formatTimestamp,
    getCardConfig,
    selectedId,
    handleRadioSelect,
    getView,
    setView,
    cardListDescription,
  };
}
