"use client";

import ShipmentCard from "../../components/shipmentCard/ShipmentCard";

export default function RootCauseAnalysis() {
  // Sample delayed shipments for testing
  const delayedShipments = [
    {
      shipment_id: "LL-2025-002",
      status: "delayed",
      origin: { city: "Los Angeles" },
      destination: { city: "Mexico City" },
      carrier: "TransMexico Freight",
      delay_reason: "Customs clearance delays at border crossing"
    },
    {
      shipment_id: "LL-2025-005", 
      status: "delayed",
      origin: { city: "Toronto" },
      destination: { city: "Houston" },
      carrier: "North Star Logistics",
      delay_reason: "Vehicle breakdown - replacement truck dispatched"
    }
  ];

  return (
    <main className="flex flex-col items-center w-full h-[calc(100vh-4rem)] mt-16 p-8">
      <h1 className="text-2xl font-bold mb-4">Root Cause Analysis</h1>
      <div className="w-full max-w-4xl">
        <h2 className="text-lg font-semibold mb-4">Delayed Shipments</h2>
        <div className="grid gap-4">
          {delayedShipments.map((shipment) => (
            <ShipmentCard key={shipment.shipment_id} shipment={shipment} />
          ))}
        </div>
      </div>
    </main>
  );
}