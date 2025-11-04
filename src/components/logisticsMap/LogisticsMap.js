'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

export default function LogisticsMap({ warehouses = [], carriers = [] }) {
  useEffect(() => {
    // Fix leaflet icons on client-side only
    if (typeof window !== 'undefined') {
      const L = require('leaflet')
      
      // Fix for default markers in Next.js
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      })
    }
  }, [])

  // Create custom icons
  const createCustomIcon = (color) => {
    if (typeof window === 'undefined') return null
    
    const L = require('leaflet')
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  }

  const warehouseIcon = createCustomIcon('blue')
  const carrierIcon = createCustomIcon('green')

  // Default center (shifted north to show more Mexico)
  const defaultCenter = [29.0, -100.0]
  const defaultZoom = 4

  return (
    <div className="h-full w-full border rounded-lg overflow-hidden">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Render Warehouse Markers */}
        {Array.isArray(warehouses) && warehouses.map((warehouse) => {
          const lat = warehouse.location?.coordinates?.lat || warehouse.location?.coordinates?.coordinates?.[1]
          const lng = warehouse.location?.coordinates?.lng || warehouse.location?.coordinates?.coordinates?.[0]
          
          if (!lat || !lng) return null
          
          return (
            <Marker
              key={warehouse.warehouse_id}
              position={[lat, lng]}
              icon={warehouseIcon}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold text-blue-600">🏭 {warehouse.name}</h3>
                  <p className="text-gray-600">{warehouse.location.city}, {warehouse.location.state}</p>
                  <p className="text-xs text-gray-500">Hub: {warehouse.location.hub_code}</p>
                  <div className="mt-2">
                    <p className="text-xs"><strong>Capacity:</strong> {warehouse.capacity?.max_volume_sqft?.toLocaleString()} sqft</p>
                    <p className="text-xs"><strong>Utilization:</strong> {(warehouse.capacity?.current_utilization * 100)?.toFixed(0)}%</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Render Carrier Headquarters */}
        {Array.isArray(carriers) && carriers.map((carrier) => {
          const lat = carrier.headquarters?.coordinates?.coordinates?.[1]
          const lng = carrier.headquarters?.coordinates?.coordinates?.[0]
          
          if (!lat || !lng) return null
          
          return (
            <Marker
              key={carrier.carrier_id}
              position={[lat, lng]}
              icon={carrierIcon}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold text-green-600">🚛 {carrier.name}</h3>
                  <p className="text-gray-600">{carrier.headquarters.city}, {carrier.headquarters.state}</p>
                  <p className="text-xs text-gray-500">Type: {carrier.type}</p>
                  <div className="mt-2">
                    <p className="text-xs"><strong>Fleet:</strong> {carrier.fleet?.total_vehicles} vehicles</p>
                    <p className="text-xs"><strong>Cost/mile:</strong> ${carrier.performance_metrics?.cost_per_mile}</p>
                    <p className="text-xs"><strong>Reliability:</strong> {carrier.performance_metrics?.reliability_score}/10</p>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}