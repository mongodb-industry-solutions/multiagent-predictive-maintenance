import Card from "@leafygreen-ui/card";

export default function ShipmentCard({ shipment }) {
  // Status color mapping
  const getStatusStyle = (status) => {
    switch (status.toLowerCase()) {
      case 'delayed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="mb-4 p-0 overflow-hidden">
      <div className="flex">
        {/* Section 1: Status prominente */}
        <div className={`p-4 border-r border-gray-200 flex-shrink-0 w-48 ${getStatusStyle(shipment.status)}`}>
          <div className="text-2xl font-bold uppercase tracking-wide">
            {shipment.status}
          </div>
          <div className="text-sm font-semibold mt-1">
            {shipment.shipment_id}
          </div>
        </div>

        {/* Section 2: Route information */}
        <div className="p-4 border-r border-gray-200 flex-1">
          {/* <div className="text-lg font-semibold mb-2">Route</div> */}
          <div className="text-gray-700">
            <span className="font-medium">{shipment.origin.city}</span>
            <span className="mx-3 text-gray-500">→</span>
            <span className="font-medium">{shipment.destination.city}</span>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Carrier: {shipment.carrier}
          </div>
        </div>

        {/* Section 3: Additional info */}
        <div className="p-4 flex-1">
          {shipment.delay_reason && (
            <div>
              <div className="text-sm font-semibold text-gray-700 mb-1">Delay Reason:</div>
              <div className="text-sm text-gray-600">{shipment.delay_reason}</div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}