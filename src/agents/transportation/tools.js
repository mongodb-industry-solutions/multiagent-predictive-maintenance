import { tool } from "@langchain/core/tools";
import { findNearestCarriers, findCarriersForLocation } from "../../lib/geospatial/carriers.js";
import getMongoClientPromise from "../../integrations/mongodb/client.js";

// Constants for cost calculations
const KM_TO_MILES_CONVERSION = 0.621371;
const WEIGHT_SURCHARGE_PER_KG = 2; // $2 per kg

/**
 * Tool to find nearest carriers to a specific location
 * Wraps our geospatial function with intelligent AI-friendly interface
 */
export const findNearestCarriersTool = tool(
  async ({ longitude, latitude, maxDistanceKm = 1000, limit = 5, priorityType = "proximity" }) => {
    try {
      console.log(`Finding carriers near [${longitude}, ${latitude}] within ${maxDistanceKm}km`);
      
      // Call our geospatial function
      const carriers = await findNearestCarriers(longitude, latitude, maxDistanceKm, limit);
      
      // Add optimization logic based on priority
      let optimizedCarriers = [...carriers];
      
      switch (priorityType) {
        case "cost":
          optimizedCarriers.sort((a, b) => 
            a.performance_metrics.cost_per_mile - b.performance_metrics.cost_per_mile
          );
          break;
          
        case "emissions":
          optimizedCarriers.sort((a, b) => 
            a.performance_metrics.emission_factor_kg_co2_per_mile - b.performance_metrics.emission_factor_kg_co2_per_mile
          );
          break;
          
        case "reliability":
          optimizedCarriers.sort((a, b) => 
            b.performance_metrics.reliability_score - a.performance_metrics.reliability_score
          );
          break;
          
        case "proximity":
        default:
          // Already sorted by distance from MongoDB
          break;
      }
      
      // Format response for AI agent
      const response = {
        searchLocation: { longitude, latitude },
        searchRadius: maxDistanceKm,
        priorityOptimization: priorityType,
        carriersFound: optimizedCarriers.length,
        carriers: optimizedCarriers.map(carrier => ({
          name: carrier.name,
          carrier_id: carrier.carrier_id,
          distance_km: carrier.distance_km,
          headquarters: {
            city: carrier.headquarters.city,
            state: carrier.headquarters.state,
            country: carrier.headquarters.country
          },
          performance: {
            cost_per_mile: carrier.performance_metrics.cost_per_mile,
            emissions_kg_per_mile: carrier.performance_metrics.emission_factor_kg_co2_per_mile,
            reliability_score: carrier.performance_metrics.reliability_score,
            on_time_delivery_rate: carrier.performance_metrics.on_time_delivery_rate
          },
          fleet: {
            total_vehicles: carrier.fleet.total_vehicles,
            capacity_per_vehicle_kg: carrier.fleet.capacity_per_vehicle_kg
          },
          specialties: carrier.specialties || []
        }))
      };
      
      return JSON.stringify(response, null, 2);
      
    } catch (error) {
      console.error('Error in findNearestCarriersTool:', error);
      return JSON.stringify({
        error: `Failed to find nearest carriers: ${error.message}`,
        searchLocation: { longitude, latitude }
      });
    }
  },
  {
    name: "find_nearest_carriers",
    description: "Find the nearest carriers to a specific location with optimization options. Use this tool to recommend carriers for shipments based on proximity and performance criteria.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["find_nearest_carriers"],
        },
        longitude: {
          type: "number",
          description: "Longitude of the pickup/delivery location (-180 to 180)",
        },
        latitude: {
          type: "number", 
          description: "Latitude of the pickup/delivery location (-90 to 90)",
        },
        maxDistanceKm: {
          type: "number",
          description: "Maximum search radius in kilometers (default: 1000km)",
          default: 1000,
        },
        limit: {
          type: "number",
          description: "Maximum number of carriers to return (default: 5)",
          default: 5,
        },
        priorityType: {
          type: "string",
          description: "Optimization priority: 'proximity' (nearest first), 'cost' (cheapest first), 'emissions' (greenest first), 'reliability' (most reliable first)",
          enum: ["proximity", "cost", "emissions", "reliability"],
          default: "proximity"
        }
      },
      required: ["name", "longitude", "latitude"],
    },
  }
);

/**
 * Tool to validate if carriers can serve a specific location (within their service area)
 * Uses geospatial intersection to check if location is within carrier service polygons
 */
export const validateServiceCoverageTool = tool(
  async ({ longitude, latitude, includePerformanceAnalysis = true }) => {
    try {
      console.log(`Validating service coverage for location [${longitude}, ${latitude}]`);
      
      // Call our geospatial function that uses $geoIntersects
      const availableCarriers = await findCarriersForLocation(longitude, latitude);
      
      if (availableCarriers.length === 0) {
        return JSON.stringify({
          location: { longitude, latitude },
          serviceAvailable: false,
          carriersWithCoverage: 0,
          message: "No carriers serve this location within their defined service areas",
          recommendation: "Consider expanding search radius or using nearest carrier analysis"
        });
      }
      
      // Analyze carrier options
      const carrierAnalysis = availableCarriers.map(carrier => {
        const analysis = {
          name: carrier.name,
          carrier_id: carrier.carrier_id,
          serviceAreas: carrier.service_areas || [],
          headquarters: {
            city: carrier.headquarters.city,
            state: carrier.headquarters.state,
            country: carrier.headquarters.country
          },
          fleet: {
            total_vehicles: carrier.fleet.total_vehicles,
            capacity_per_vehicle_kg: carrier.fleet.capacity_per_vehicle_kg
          },
          specialties: carrier.specialties || []
        };
        
        if (includePerformanceAnalysis) {
          analysis.performance = {
            cost_per_mile: carrier.performance_metrics.cost_per_mile,
            emissions_kg_per_mile: carrier.performance_metrics.emission_factor_kg_co2_per_mile,
            reliability_score: carrier.performance_metrics.reliability_score,
            on_time_delivery_rate: carrier.performance_metrics.on_time_delivery_rate,
            average_delivery_time_hours: carrier.performance_metrics.average_delivery_time_hours
          };
        }
        
        return analysis;
      });
      
      // Find best options by different criteria
      const bestByCost = [...carrierAnalysis].sort((a, b) => 
        a.performance.cost_per_mile - b.performance.cost_per_mile
      )[0];
      
      const bestByEmissions = [...carrierAnalysis].sort((a, b) => 
        a.performance.emissions_kg_per_mile - b.performance.emissions_kg_per_mile
      )[0];
      
      const bestByReliability = [...carrierAnalysis].sort((a, b) => 
        b.performance.reliability_score - a.performance.reliability_score
      )[0];
      
      const response = {
        location: { longitude, latitude },
        serviceAvailable: true,
        carriersWithCoverage: availableCarriers.length,
        carriers: carrierAnalysis,
        recommendations: {
          mostCostEffective: bestByCost ? {
            name: bestByCost.name,
            cost_per_mile: bestByCost.performance.cost_per_mile
          } : null,
          mostEcoFriendly: bestByEmissions ? {
            name: bestByEmissions.name,
            emissions_kg_per_mile: bestByEmissions.performance.emissions_kg_per_mile
          } : null,
          mostReliable: bestByReliability ? {
            name: bestByReliability.name,
            reliability_score: bestByReliability.performance.reliability_score
          } : null
        }
      };
      
      return JSON.stringify(response, null, 2);
      
    } catch (error) {
      console.error('Error in validateServiceCoverageTool:', error);
      return JSON.stringify({
        error: `Failed to validate service coverage: ${error.message}`,
        location: { longitude, latitude }
      });
    }
  },
  {
    name: "validate_service_coverage",
    description: "Validate if carriers can serve a specific location by checking if the location falls within their defined service areas. Returns carriers with coverage and performance analysis.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["validate_service_coverage"],
        },
        longitude: {
          type: "number",
          description: "Longitude of the location to validate (-180 to 180)",
        },
        latitude: {
          type: "number",
          description: "Latitude of the location to validate (-90 to 90)",
        },
        includePerformanceAnalysis: {
          type: "boolean",
          description: "Whether to include detailed performance metrics in the analysis (default: true)",
          default: true
        }
      },
      required: ["name", "longitude", "latitude"],
    },
  }
);

/**
 * Tool to format and structure carrier alternatives with real data from MongoDB
 * Takes recommended carrier names and shipment details to create structured alternatives
 */
export const formatAlternativesTool = tool(
  async ({ carrierNames, shipmentDetails, origin, destination }) => {
    try {
      console.log(`Formatting alternatives for carriers: ${carrierNames.join(', ')}`);
      
      // Get MongoDB connection
      const client = await getMongoClientPromise();
      const dbName = process.env.DATABASE_NAME;
      if (!dbName) {
        throw new Error("DATABASE_NAME environment variable is required but not set");
      }
      
      const db = client.db(dbName);
      const carriersCollection = db.collection("carriers");
      
      // Fetch real carrier data from MongoDB
      const carriers = await carriersCollection.find({ 
        name: { $in: carrierNames } 
      }).toArray();
      
      if (carriers.length === 0) {
        return JSON.stringify({
          error: "No matching carriers found in database",
          requested_carriers: carrierNames
        });
      }
      
      // Calculate rough distance for cost estimation (Toronto to LA ≈ 3400km)
      const estimatedDistance = 3400; // km, rough estimate for cross-border routes
      
      // Structure alternatives with real data
      const alternatives = carriers.map((carrier, index) => {
        const metrics = carrier.performance_metrics;
        const fleet = carrier.fleet;
        
        // Calculate estimated cost based on distance and carrier cost per mile
        const distanceInMiles = estimatedDistance * KM_TO_MILES_CONVERSION;
        const baseCost = distanceInMiles * metrics.cost_per_mile;
        const weightSurcharge = (shipmentDetails.weight_kg || 0) * WEIGHT_SURCHARGE_PER_KG;
        const estimatedCost = Math.round(baseCost + weightSurcharge);
        
        // Calculate estimated time based on distance and average speed
        const estimatedTimeHours = Math.round(estimatedDistance / fleet.average_speed_kmh);
        
        // Calculate emissions
        const emissionsKg = Math.round(distanceInMiles * metrics.emission_factor_kg_co2_per_mile);
        
        return {
          id: index + 1,
          carrier: carrier.name,
          carrier_id: carrier.carrier_id,
          estimated_cost: estimatedCost,
          estimated_time_hours: estimatedTimeHours,
          reliability_score: metrics.reliability_score || metrics.on_time_delivery_rate,
          on_time_delivery_rate: metrics.on_time_delivery_rate,
          emissions_kg: emissionsKg,
          status: "Available",
          recommendation_type: index === 0 ? "Primary" : index === 1 ? "Secondary" : "Alternative",
          specialties: carrier.specialties || [],
          fleet_size: fleet.total_vehicles,
          capacity_per_vehicle_kg: fleet.capacity_per_vehicle_kg,
          headquarters: {
            city: carrier.headquarters.city,
            state: carrier.headquarters.state,
            country: carrier.headquarters.country
          }
        };
      });
      
      const response = {
        success: true,
        shipment_id: shipmentDetails.shipment_id,
        alternatives_count: alternatives.length,
        alternatives: alternatives,
        metadata: {
          estimated_distance_km: estimatedDistance,
          origin: origin,
          destination: destination,
          shipment_weight_kg: shipmentDetails.weight_kg,
          shipment_value_usd: shipmentDetails.value_usd
        }
      };
      
      return JSON.stringify(response, null, 2);
      
    } catch (error) {
      console.error('Error in formatAlternativesTool:', error);
      return JSON.stringify({
        error: `Failed to format alternatives: ${error.message}`,
        requested_carriers: carrierNames
      });
    }
  },
  {
    name: "format_alternatives",
    description: "Format recommended carriers into structured alternatives with real data from MongoDB. Use this after finding suitable carriers to create the final recommendations with cost, time, and performance data.",
    schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool for identification purposes",
          enum: ["format_alternatives"],
        },
        carrierNames: {
          type: "array",
          description: "Array of carrier names to format into structured alternatives",
          items: {
            type: "string"
          },
          minItems: 1
        },
        shipmentDetails: {
          type: "object",
          description: "Shipment details for cost and time calculations",
          properties: {
            shipment_id: { type: "string" },
            weight_kg: { type: "number" },
            value_usd: { type: "number" },
            priority: { type: "string" },
            special_handling: { 
              type: "array", 
              items: { type: "string" }
            }
          },
          required: ["shipment_id"]
        },
        origin: {
          type: "string",
          description: "Origin location string (e.g., 'Toronto, ON, CA')"
        },
        destination: {
          type: "string", 
          description: "Destination location string (e.g., 'Los Angeles, CA, US')"
        }
      },
      required: ["name", "carrierNames", "shipmentDetails", "origin", "destination"],
    },
  }
);