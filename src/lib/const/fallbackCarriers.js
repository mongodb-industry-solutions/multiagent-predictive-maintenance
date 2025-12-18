/**
 * Fallback carrier configurations for Transportation Planning
 * Used when agent response doesn't contain structured alternatives
 */

export const FALLBACK_CARRIERS = {
  // Known carriers that agents might mention
  NORTHERN_FREIGHT: {
    id: 1,
    carrier: "Northern Freight",
    estimated_cost: 950,
    estimated_time_hours: 20,
    reliability_score: 0.78,
    emissions_kg: 45,
    status: "Available",
    recommendation_type: "Primary",
    specialties: ["fragile", "regulated"]
  },
  
  FRESH_EXPRESS: {
    id: 2,
    carrier: "Fresh Express", 
    estimated_cost: 1020,
    estimated_time_hours: 18,
    reliability_score: 0.91,
    emissions_kg: 38,
    status: "Available",
    recommendation_type: "Secondary",
    specialties: ["temperature_controlled", "medical_supplies"]
  }
};

export const DEFAULT_ALTERNATIVES = [
  {
    id: 1,
    carrier: "Recommended Carrier A",
    estimated_cost: 850,
    estimated_time_hours: 18,
    reliability_score: 0.88,
    emissions_kg: 42,
    status: "Available"
  },
  {
    id: 2,
    carrier: "Recommended Carrier B",
    estimated_cost: 920,
    estimated_time_hours: 16,
    reliability_score: 0.92,
    emissions_kg: 38,
    status: "Available"
  }
];

/**
 * Parse agent response text for known carrier mentions
 * @param {string} agentText - Agent response text
 * @returns {Array} - Array of matching fallback carriers
 */
export function parseFallbackCarriers(agentText) {
  const alternatives = [];
  
  if (agentText.includes("Northern Freight")) {
    alternatives.push(FALLBACK_CARRIERS.NORTHERN_FREIGHT);
  }
  
  if (agentText.includes("Fresh Express")) {
    alternatives.push(FALLBACK_CARRIERS.FRESH_EXPRESS);
  }
  
  // Return default alternatives if no specific carriers found
  return alternatives.length > 0 ? alternatives : DEFAULT_ALTERNATIVES;
}