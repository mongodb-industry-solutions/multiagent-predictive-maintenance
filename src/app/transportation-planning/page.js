'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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
  const [warehouses, setWarehouses] = useState([])
  const [carriers, setCarriers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inheritedShipment, setInheritedShipment] = useState(null)
  const [agentActive, setAgentActive] = useState(false)
  const [agentLogs, setAgentLogs] = useState([])
  const [alternativeRoutes, setAlternativeRoutes] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check for inherited shipment from RCA
        const shipmentData = sessionStorage.getItem('inherited_shipment')
        if (shipmentData) {
          const parsedShipment = JSON.parse(shipmentData)
          setInheritedShipment(parsedShipment)
          console.log('Inherited shipment from RCA:', parsedShipment)
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
      
      // TODO: Call Transportation Planning Agent with our geospatial tools
      // This will use findNearestCarriersTool and validateServiceCoverageTool
      
      // Simulate for now
      setTimeout(() => {
        const mockRoutes = [
          {
            id: 1,
            carrier: "MidwestExpress",
            estimated_cost: 850,
            estimated_time_hours: 18,
            reliability_score: 0.92,
            emissions_kg: 45,
            status: "Available"
          },
          {
            id: 2,
            carrier: "RapidLogistics", 
            estimated_cost: 780,
            estimated_time_hours: 22,
            reliability_score: 0.88,
            emissions_kg: 52,
            status: "Available"
          }
        ]
        
        setAlternativeRoutes(mockRoutes)
        setAgentLogs(prev => [...prev, {
          type: "final",
          values: {
            content: `Found ${mockRoutes.length} alternative route options`
          }
        }])
        setAgentActive(false)
      }, 3000)
      
    } catch (error) {
      console.error("Error finding alternatives:", error)
      setAgentActive(false)
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
                <LogisticsMap warehouses={warehouses} carriers={carriers} />
              )}
            </div>
          </section>

          {/* Right Section: Transportation Agent */}
          <section className="flex flex-col w-1/2 border border-gray-200 rounded-xl bg-white p-4 m-2 overflow-hidden min-w-[320px] min-h-[320px]">
            {/* Inherited Shipment Info */}
            {inheritedShipment && (
              <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <Subtitle className="text-orange-800 mb-1">🚨 Emergency Rerouting</Subtitle>
                <div className="text-sm text-orange-700">
                  <div><strong>Shipment:</strong> {inheritedShipment.shipment_id}</div>
                  <div><strong>Failed Carrier:</strong> {inheritedShipment.carrier}</div>
                  <div><strong>Root Cause:</strong> {inheritedShipment.root_cause}</div>
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
              <div className="flex-1 min-h-0 overflow-hidden">
                <CardList
                  items={alternativeRoutes}
                  idField="id"
                  cardType="alternative-routes"
                  maxHeight="max-h-full"
                  emptyText="No alternative routes found"
                  listTitle="Alternative Routes"
                  listDescription="AI-recommended alternative carriers and routes."
                />
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