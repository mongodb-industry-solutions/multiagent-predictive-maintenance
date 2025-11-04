'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { H3, Description } from "@leafygreen-ui/typography"
import LeafyGreenProvider from "@leafygreen-ui/leafygreen-provider"

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch warehouses
        const warehousesRes = await fetch('/api/data?collection=warehouses')
        const warehousesData = await warehousesRes.json()
        
        // Fetch carriers
        const carriersRes = await fetch('/api/data?collection=carriers')
        const carriersData = await carriersRes.json()
        
        // Validate that we got arrays
        setWarehouses(Array.isArray(warehousesData) ? warehousesData : [])
        setCarriers(Array.isArray(carriersData) ? carriersData : [])
        
        console.log('Warehouses loaded:', warehousesData?.length)
        console.log('Carriers loaded:', carriersData?.length)
      } catch (error) {
        console.error('Error fetching data:', error)
        setWarehouses([])
        setCarriers([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
            <div className="font-semibold mb-4">Transportation Planning Agent</div>
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center bg-gray-50 rounded-lg p-8 w-full">
                
                
              </div>
            </div>
          </section>
        </div>
      </main>
    </LeafyGreenProvider>
  )
}