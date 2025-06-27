import React from "react";
import Slider from "@mui/material/Slider";
import Icon from "@leafygreen-ui/icon";
import Image from "next/image";
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
    <div className="flex flex-row items-center gap-3 w-full h-full min-h-[100px] max-h-[120px]">
      {/* Machine Image with alert icon */}
      <div
        className="flex items-center justify-center relative"
        style={{ flexBasis: "60%", flexGrow: 0, flexShrink: 0 }}
      >
        <Image
          src="/img/robot.png"
          alt="Machine"
          width={100}
          height={100}
          className="object-contain"
          priority
        />
        {status === "alert" && (
          <span className="absolute top-1 right-12">
            <Icon glyph="Warning" fill="red" size={25} />
          </span>
        )}
      </div>
      {/* Sliders */}
      <div
        className="flex flex-col gap-1"
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
            size="small"
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
            size="small"
          />
        </div>
      </div>
    </div>
  );
}
