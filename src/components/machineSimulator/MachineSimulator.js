import React from "react";
import Button from "@leafygreen-ui/button";
import Code from "@leafygreen-ui/code";
import Slider from "@mui/material/Slider";

// UI only, logic in hooks.js
export default function MachineSimulator({
  isRunning,
  onStart,
  onStop,
  machineData,
  status,
  temperature,
  vibration,
  onTemperatureChange,
  onVibrationChange,
  alerts,
  onAlertExpand,
  expandedAlertId,
}) {
  return (
    <div className="flex flex-col h-[80vh] w-full p-6 mt-6 mb-6">
      {/* Start/Stop Button */}
      <div className="mb-4">
        {isRunning ? (
          <Button variant="danger" onClick={onStop}>
            Stop Simulator
          </Button>
        ) : (
          <Button variant="primary" onClick={onStart}>
            Start Simulator
          </Button>
        )}
      </div>
      {/* Main Content Split */}
      <div className="flex flex-1 gap-4">
        {/* Left: Code Card (55%) */}
        <div className="w-[55%] p-2 flex flex-col h-full">
          <div className="font-semibold mb-2">Machine Telemetry</div>
          <Code
            language="json"
            className="flex-1 min-h-[300px] max-h-[600px] h-[calc(80vh-120px)]"
            style={{ minHeight: 0 }}
          >
            {machineData ? JSON.stringify(machineData, null, 2) : {}}
          </Code>
        </div>
        {/* Right: Status, Icon, Sliders, Alerts (45%) */}
        <div className="w-[45%] flex flex-col gap-4 h-full">
          {/* Status on top */}
          <div className="mb-2">
            <span className="text-lg font-bold">
              Status:{" "}
              <span
                className={
                  status === "running"
                    ? "text-green-600"
                    : status === "alert"
                    ? "text-red-600"
                    : "text-gray-500"
                }
              >
                {status}
              </span>
            </span>
          </div>
          {/* Icon and Sliders side by side */}
          <div className="flex flex-row items-center gap-4 w-full">
            {/* Machine Icon */}
            <div className="flex items-center justify-center w-1/2">
              <span className="text-5xl">🛠️</span>
            </div>
            {/* Sliders */}
            <div className="flex flex-col gap-6 w-1/2">
              <div>
                <div className="font-medium mb-1">Temperature</div>
                <Slider
                  value={temperature}
                  min={0}
                  max={120}
                  step={0.1}
                  onChange={(_, v) => onTemperatureChange(v)}
                  valueLabelDisplay="auto"
                />
              </div>
              <div>
                <div className="font-medium mb-1">Vibration</div>
                <Slider
                  value={vibration}
                  min={0}
                  max={2}
                  step={0.01}
                  onChange={(_, v) => onVibrationChange(v)}
                  valueLabelDisplay="auto"
                />
              </div>
            </div>
          </div>
          {/* Alerts List */}
          <div className="flex flex-col gap-2 mt-2 flex-1 overflow-y-auto max-h-[calc(80vh-180px)]">
            <div className="font-semibold mb-1">Alerts</div>
            {alerts.length === 0 && (
              <div className="text-gray-400">No alerts</div>
            )}
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="bg-red-50 border border-red-200 rounded p-2"
                style={{ minWidth: 0 }}
              >
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => onAlertExpand(alert._id)}
                >
                  <div>
                    <span className="font-bold">{alert.err_code}</span> -{" "}
                    {alert.err_name}
                  </div>
                  <div className="text-xs text-gray-500">{alert.ts}</div>
                  <div>{expandedAlertId === alert._id ? "▼" : "▶"}</div>
                </div>
                {expandedAlertId === alert._id && (
                  <div className="mt-2">
                    <div className="bg-white h-55 w-full max-w-full overflow-x-hiden">
                      <Code
                        language="json"
                        className="!h-full !min-h-0 !max-h-full !overflow-x-hiden !overflow-y-auto whitespace-pre text-xs"
                      >
                        {alert ? JSON.stringify(alert, null, 2) : {}}
                      </Code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
