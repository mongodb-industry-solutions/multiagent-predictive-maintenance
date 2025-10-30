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
        case "incident-reports":
          return {
            title: `${item.shipment_id || "Unknown Shipment"} - ${item.carrier || "Unknown Carrier"}`,
            flagText: "Logistics Analysis", 
            description: `${(item.delay_impact || "").substring(0, 80)}${(item.delay_impact || "").length > 80 ? "..." : ""}`,
            icon: "Guide",
            hasForm: true,
          };
        default:
          return {
            title: item.title || item.name || "Item",
            flagText: undefined,
            description: "",
            hasForm: false,
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
    selectable && items.length > 0 ? items[0]?._id : undefined
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
      setSelectedId(items[0]?._id);
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
