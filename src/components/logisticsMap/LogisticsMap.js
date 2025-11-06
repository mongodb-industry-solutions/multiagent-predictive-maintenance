'use client'

import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

export default function LogisticsMap({ warehouses = [], carriers = [], feasibleCarriers = [], inheritedShipment = null }) {
  // Debug: Check what we receive
  console.log('🗺️ LogisticsMap received inheritedShipment:', inheritedShipment);
  console.log('🚛 LogisticsMap received feasibleCarriers:', feasibleCarriers);
  
  // Simple city coordinates lookup
  const getCityCoordinates = (city, state, country) => {
    const locations = {
      'Los Angeles, CA, US': [34.0522, -118.2437],
      'Monterrey, Nuevo León, MX': [25.6866, -100.3161],
      'Chicago, IL, US': [41.8781, -87.6298],
      'Toronto, ON, CA': [43.6532, -79.3832],
      'Mexico City, CDMX, MX': [19.4326, -99.1332]
    };
    
    const key = `${city}, ${state}, ${country}`;
    return locations[key] || null;
  };
  
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

  // Create custom carrier icons with specific colors
  const createCarrierIcon = (color, index) => {
    if (typeof window === 'undefined') return null
    
    const L = require('leaflet')
    
    // Create a custom HTML marker with the carrier color
    return new L.DivIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: white;
          font-size: 10px;
        ">
          ${index + 1}
        </div>
      `,
      className: 'custom-carrier-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -13]
    })
  }

  const warehouseIcon = createCustomIcon('blue')
  const carrierIcon = createCustomIcon('green')
  const feasibleCarrierIcon = createCustomIcon('orange')
  const originIcon = createCustomIcon('red')
  const destinationIcon = createCustomIcon('green')

  // Generate distinct colors for each carrier
  const getCarrierColor = (index) => {
    const colors = [
      '#FF4444', // Bright Red
      '#2196F3', // Blue  
      '#4CAF50', // Green
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#00BCD4', // Cyan
      '#FF5722', // Deep Orange
      '#607D8B', // Blue Grey
      '#795548', // Brown
      '#E91E63'  // Pink
    ];
    return colors[index % colors.length];
  };

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
        {!inheritedShipment && Array.isArray(warehouses) && warehouses.map((warehouse) => {
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
        {!inheritedShipment && Array.isArray(carriers) && carriers.map((carrier) => {
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

        {/* Render Feasible Carriers (recommended by Transportation Planning Agent) */}
        {Array.isArray(feasibleCarriers) && feasibleCarriers.map((carrier, index) => {
          const lat = carrier.headquarters?.coordinates?.coordinates?.[1]
          const lng = carrier.headquarters?.coordinates?.coordinates?.[0]
          
          if (!lat || !lng) return null
          
          const carrierColor = getCarrierColor(index);
          
          return (
            <Marker
              key={`feasible-${carrier.carrier_id || index}`}
              position={[lat, lng]}
              icon={createCarrierIcon(carrierColor, index)}
            >
              <Popup>
                <div className="text-sm">
                  <h3 className="font-semibold" style={{color: carrierColor}}>🎯 {carrier.name}</h3>
                  <p className="text-orange-500 text-xs font-medium mb-1">✅ RECOMMENDED ALTERNATIVE</p>
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

        {/* Render Service Area Polygons for Feasible Carriers */}
        {Array.isArray(feasibleCarriers) && feasibleCarriers.map((carrier, index) => {
          if (!carrier.service_area_geometry || !carrier.service_area_geometry.coordinates) return null;
          
          const carrierColor = getCarrierColor(index);
          const geometry = carrier.service_area_geometry;
          
          // Handle GeoJSON Polygon structure
          if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
            // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
            const polygonCoords = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            
            return (
              <Polygon
                key={`${carrier.carrier_id || index}-polygon`}
                positions={polygonCoords}
                pathOptions={{
                  color: carrierColor,
                  weight: 2.5,
                  opacity: 0.9,
                  fillColor: carrierColor,
                  fillOpacity: 0.15
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <h3 className="font-semibold" style={{color: carrierColor}}>
                      🎯 {carrier.name} Coverage Area
                    </h3>
                    <p className="text-gray-600">Service Region</p>
                    <p className="text-xs text-gray-500">Type: {carrier.type}</p>
                    <p className="text-xs text-orange-500 font-medium">✅ RECOMMENDED</p>
                  </div>
                </Popup>
              </Polygon>
            );
          }
          
          return null;
        })}

        {/* Render Shipment Route when we have inheritedShipment */}
        {inheritedShipment && 
         inheritedShipment.origin && 
         inheritedShipment.destination && (() => {
           const originCoords = getCityCoordinates(
             inheritedShipment.origin.city, 
             inheritedShipment.origin.state, 
             inheritedShipment.origin.country
           );
           const destCoords = getCityCoordinates(
             inheritedShipment.destination.city, 
             inheritedShipment.destination.state, 
             inheritedShipment.destination.country
           );
           
           if (!originCoords || !destCoords) return false;
           
           return (
             <>
               {/* Origin Marker */}
               <Marker
                 position={originCoords}
                 icon={originIcon}
               >
                 <Popup>
                   <div className="text-sm">
                     <h3 className="font-semibold text-red-600">🏁 Origin</h3>
                     <p className="text-gray-600">{inheritedShipment.origin.city}, {inheritedShipment.origin.state}</p>
                     <p className="text-xs text-gray-500">Shipment: {inheritedShipment.shipment_id}</p>
                     <p className="text-xs text-red-500 font-medium">Status: Delayed</p>
                   </div>
                 </Popup>
               </Marker>
               
               {/* Destination Marker */}
               <Marker
                 position={destCoords}
                 icon={destinationIcon}
               >
                 <Popup>
                   <div className="text-sm">
                     <h3 className="font-semibold text-green-600">🎯 Destination</h3>
                     <p className="text-gray-600">{inheritedShipment.destination.city}, {inheritedShipment.destination.state}</p>
                     <p className="text-xs text-gray-500">Shipment: {inheritedShipment.shipment_id}</p>
                     <p className="text-xs text-red-500 font-medium">Status: Delayed</p>
                   </div>
                 </Popup>
               </Marker>
               
               {/* Route Line */}
               <Polyline
                 positions={[originCoords, destCoords]}
                 pathOptions={{
                   color: 'red',
                   weight: 3,
                   opacity: 0.8,
                   dashArray: '10, 10'
                 }}
               />
             </>
           );
         })()}
      </MapContainer>
    </div>
  )
}