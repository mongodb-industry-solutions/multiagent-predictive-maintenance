import React from "react";
import Slider from "@mui/material/Slider";
import { useMachineController } from "./hooks";

export default function MachineController({
  status,
  temperature,
  vibration,
  onTemperatureChange,
  onVibrationChange,
}) {
  useMachineController(); // For future extensibility
  return (
    <div className="flex flex-row items-center gap-4 w-full h-full">
      {/* Machine Icon */}
      <div
        className="flex items-center justify-center"
        style={{ flexBasis: "60%", flexGrow: 0, flexShrink: 0 }}
      >
        <span className="text-6xl">🛠️</span>
      </div>
      {/* Sliders */}
      <div
        className="flex flex-col gap-6"
        style={{ flexBasis: "40%", flexGrow: 1, flexShrink: 1 }}
      >
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
  );
}
