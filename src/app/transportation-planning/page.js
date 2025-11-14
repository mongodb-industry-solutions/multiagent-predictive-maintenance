'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Button from "@leafygreen-ui/button"
import { H3, Description, Subtitle } from "@leafygreen-ui/typography"
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider"
import AgentStatus from "@/components/agentStatus/AgentStatus"
import CardList from "@/components/cardList/CardList"

// Import LogisticsMap dynamically to avoid SSR issues with Leaflet
const LogisticsMap = dynamic(() => import('../../components/logisticsMap/LogisticsMap'), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-gray-500">Loading map...</p>
      </div>
    </div>
  )
})

export default function TransportationPlanningPage() {
  const router = useRouter()
  const [warehouses, setWarehouses] = useState([])
  const [carriers, setCarriers] = useState([])
  const [feasibleCarriers, setFeasibleCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inheritedShipment, setInheritedShipment] = useState(null)
  const [agentActive, setAgentActive] = useState(false)
  const [agentLogs, setAgentLogs] = useState([])
  const [alternativeRoutes, setAlternativeRoutes] = useState([])
  const [selectedRoute, setSelectedRoute] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check for inherited shipment from RCA
        const shipmentData = sessionStorage.getItem('inherited_shipment')
        if (shipmentData) {
          const parsedShipment = JSON.parse(shipmentData)
          console.log('Inherited shipment from RCA:', parsedShipment)
          
          // Fetch complete shipment details from MongoDB if we have a shipment_id
          if (parsedShipment.shipment_id) {
            try {
              const fullShipmentRes = await fetch(`/api/data?collection=shipments&filter={"shipment_id":"${parsedShipment.shipment_id}"}`)
              const fullShipmentData = await fullShipmentRes.json()
              
              if (fullShipmentData && fullShipmentData.length > 0) {
                // Merge RCA data (root_cause, delay_impact) with complete shipment data
                const completeShipment = {
                  ...fullShipmentData[0],
                  root_cause: parsedShipment.root_cause,
                  delay_impact: parsedShipment.delay_impact
                }
                setInheritedShipment(completeShipment)
                console.log('Complete shipment with RCA data:', completeShipment)
              } else {
                // Fallback to RCA data only if full shipment not found
                setInheritedShipment(parsedShipment)
              }
            } catch (error) {
              console.error('Error fetching complete shipment:', error)
              setInheritedShipment(parsedShipment)
            }
          } else {
            setInheritedShipment(parsedShipment)
          }
        }
        
        // Fetch warehouses
        const warehousesRes = await fetch('/api/data?collection=warehouses')
        const warehousesData = await warehousesRes.json()
        
        // Fetch carriers
        const carriersRes = await fetch('/api/data?collection=carriers')
        const carriersData = await carriersRes.json()
        
        setWarehouses(warehousesData)
        setCarriers(carriersData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Function to fetch full carrier data for feasible carriers
  const fetchFeasibleCarrierData = async (carrierNames) => {
    try {
      const carrierPromises = carrierNames.map(async (carrierName) => {
        const response = await fetch(`/api/data?collection=carriers&filter={"name":"${carrierName}"}`)
        const carrierData = await response.json()
        return carrierData.length > 0 ? carrierData[0] : null
      })
      
      const feasibleCarrierData = await Promise.all(carrierPromises)
      const validCarriers = feasibleCarrierData.filter(carrier => carrier !== null)
      console.log('Fetched feasible carriers data:', validCarriers)
      setFeasibleCarriers(validCarriers)
    } catch (error) {
      console.error('Error fetching feasible carrier data:', error)
    }
  }

  const handleFindAlternatives = async () => {
    if (!inheritedShipment) return
    
    setAgentActive(true)
    setAgentLogs([])
    setAlternativeRoutes([])
    
    try {
      console.log('Finding alternative routes for shipment:', inheritedShipment.shipment_id)
      
      setAgentLogs(prev => [...prev, {
        type: "user",
        values: {
          content: `Finding alternative routes for delayed shipment ${inheritedShipment.shipment_id}\nOriginal carrier: ${inheritedShipment.carrier}\nRoot cause: ${inheritedShipment.root_cause}`
        }
      }])
      
      // Call Transportation Planning Agent with real geospatial tools
      const response = await fetch('/api/agent/transportation-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          shipmentData: inheritedShipment 
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        setAgentLogs(prev => [...prev, {
          type: "final",
          values: {
            content: result.agent_response
          }
        }])
        
        // Use structured alternatives from the format_alternatives tool
        if (result.alternatives && result.alternatives.length > 0) {
          console.log('Using structured alternatives from agent:', result.alternatives);
          setAlternativeRoutes(result.alternatives);
          
          // Extract carrier names and fetch their full data
          const carrierNames = result.alternatives.map(alt => alt.carrier);
          await fetchFeasibleCarrierData(carrierNames);
        } else {
          // Fallback: parse from text if no structured data available
          console.log('No structured alternatives, parsing from text');
          const agentText = result.agent_response
          const alternativeRoutes = []
          
          // Look for "Northern Freight" recommendation
          if (agentText.includes("Northern Freight")) {
            alternativeRoutes.push({
              id: 1,
              carrier: "Northern Freight",
              estimated_cost: 950,
              estimated_time_hours: 20,
              reliability_score: 0.78,
              emissions_kg: 45,
              status: "Available",
              recommendation_type: "Primary",
              specialties: ["fragile", "regulated"]
            })
          }
          
          // Look for "Fresh Express" recommendation  
          if (agentText.includes("Fresh Express")) {
            alternativeRoutes.push({
              id: 2,
              carrier: "Fresh Express", 
              estimated_cost: 1020,
              estimated_time_hours: 18,
              reliability_score: 0.91,
              emissions_kg: 38,
              status: "Available",
              recommendation_type: "Secondary",
              specialties: ["temperature_controlled", "medical_supplies"]
            })
          }
          
          // Fallback alternatives if parsing fails
          if (alternativeRoutes.length === 0) {
            alternativeRoutes.push(
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
            )
          }
          
          setAlternativeRoutes(alternativeRoutes)
          
          // Extract carrier names and fetch their full data for fallback routes too
          const carrierNames = alternativeRoutes.map(alt => alt.carrier);
          await fetchFeasibleCarrierData(carrierNames);
        }
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
      
      setAgentActive(false)
      
    } catch (error) {
      console.error("Error finding alternatives:", error)
      setAgentLogs(prev => [...prev, {
        type: "error",
        values: {
          content: `Error: ${error.message}`
        }
      }])
      setAgentActive(false)
    }
  }

  // Handle route selection
  const handleRouteSelection = (selectedId) => {
    const route = alternativeRoutes.find(r => r.id === selectedId)
    console.log('Selected route:', route)
    setSelectedRoute(route)
  }

  // Navigate to Risk Analysis with selected route
  const handleAnalyzeRisk = () => {
    if (selectedRoute && inheritedShipment) {
      const riskAnalysisData = {
        carrier: selectedRoute.carrier,
        route: {
          origin: inheritedShipment.origin,
          destination: inheritedShipment.destination
        },
        shipment_id: inheritedShipment.shipment_id,
        cost: selectedRoute.estimated_cost,
        time_hours: selectedRoute.estimated_time_hours,
        reliability_score: selectedRoute.reliability_score,
        emissions_kg: selectedRoute.emissions_kg
      }
      
      // Store selected route for Risk Analysis
      sessionStorage.setItem('selected_route_for_risk', JSON.stringify(riskAnalysisData))
      
      // Navigate to Risk Analysis
      router.push('/risk-analysis')
    }
  }

  return (
    <LeafyGreenProvider baseFontSize={16}>
      <main className="flex flex-col w-full h-full">
        {/* Page Title & Subheader */}
        <div className="flex flex-col items-start justify-center px-6 py-4">
          <H3 className="mb-1 text-left">Transportation Planning</H3>
          <Description className="text-left max-w-2xl mb-2">
            Interactive logistics network visualization with AI-powered carrier optimization and route planning.
          </Description>
        </div>
        
        <div className="flex flex-1 min-h-0 w-full gap-6 px-2 pb-4">
          {/* Left Section: Network Map */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            <div className="font-semibold mb-4">Logistics Network Map</div>
            <div className="flex-1 min-h-0">
              {loading ? (
                <div className="h-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-500">Loading network data...</p>
                  </div>
                </div>
              ) : (
                <LogisticsMap 
                  warehouses={warehouses} 
                  carriers={carriers} 
                  feasibleCarriers={feasibleCarriers}
                  inheritedShipment={inheritedShipment}
                />
              )}
            </div>
          </section>

          {/* Right Section: Transportation Agent */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* Inherited Shipment Info */}
            {inheritedShipment && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Subtitle className="text-orange-800 mb-1">🚨 Delayed Shipment Details</Subtitle>
                <div className="text-sm text-orange-700 space-y-1">
                  <div><strong>Shipment ID:</strong> {inheritedShipment.shipment_id}</div>
                  {inheritedShipment.origin && (
                    <div><strong>Origin:</strong> {inheritedShipment.origin.city}, {inheritedShipment.origin.state}, {inheritedShipment.origin.country}</div>
                  )}
                  {inheritedShipment.destination && (
                    <div><strong>Destination:</strong> {inheritedShipment.destination.city}, {inheritedShipment.destination.state}, {inheritedShipment.destination.country}</div>
                  )}
                  <div><strong>Failed Carrier:</strong> {inheritedShipment.carrier}</div>
                  {/* <div><strong>Root Cause:</strong> {inheritedShipment.root_cause}</div> */}
                </div>
              </div>
            )}
            
            {/* Agent Status */}
            <div className="mb-4">
              <AgentStatus
                isActive={agentActive}
                logs={agentLogs}
                statusText="Transportation Planning Agent"
                activeText="Finding Alternatives"
                inactiveText="Ready"
              />
            </div>
            
            {/* Action Button */}
            {inheritedShipment && !agentActive && alternativeRoutes.length === 0 && (
              <div className="mb-4">
                <Button
                  variant="primary"
                  onClick={handleFindAlternatives}
                  className="w-full"
                >
                  Find Alternative Routes
                </Button>
              </div>
            )}
            
            {/* Alternative Routes */}
            {alternativeRoutes.length > 0 && (
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <CardList
                    items={alternativeRoutes}
                    idField="id"
                    cardType="alternative-routes"
                    maxHeight="max-h-full"
                    emptyText="No alternative routes found"
                    listTitle="Alternative Routes"
                    listDescription="AI-recommended alternative carriers and routes. Select one to analyze risks."
                    selectable={true}
                    onSelect={handleRouteSelection}
                    selectedId={selectedRoute?.id}
                  />
                </div>
                
                {/* Analyze Risk Button */}
                {selectedRoute && (
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <Button
                      variant="primary"
                      onClick={handleAnalyzeRisk}
                      className="w-full"
                    >
                      🎯 Analyze Risk for {selectedRoute.carrier}
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Empty State */}
            {!inheritedShipment && (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center bg-gray-50 rounded-lg p-8 w-full">
                  <div className="text-gray-500 mb-2">No delayed shipment to analyze</div>
                  <div className="text-sm text-gray-400">
                    Go to Root Cause Analysis to select a shipment for rerouting
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </LeafyGreenProvider>
  )
}