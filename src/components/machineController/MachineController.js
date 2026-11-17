import React from "react";
import Slider from "@mui/material/Slider";
import { Icon } from "@via-ds/icons";
import Image from "next/image";
import { useMachineController } from "./hooks";

export default function MachineController({
  status,
  temperature,
  vibration,
  onTemperatureChange,
  onVibrationChange,
  sliderFooter = null,
  sideFooter = null,
}) {
  useMachineController(); // For future extensibility
  return (
    <div className="mx-auto grid w-fit grid-cols-[10rem_16rem] items-center gap-x-20 gap-y-3">
      <div className="flex justify-center">
        <div className="relative">
          <Image
            src="/img/robot.png"
            alt="Machine"
            width={100}
            height={100}
            className="object-contain"
            priority
          />
          {status === "alert" && (
            <span className="absolute -right-1 -top-1">
              <Icon glyph="Warning" fill="red" size={25} />
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <div className="font-medium">Temperature</div>
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
          <div className="font-medium">Vibration</div>
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
      {sideFooter ? <div className="w-full">{sideFooter}</div> : <div />}
      {sliderFooter ? (
        <div className="flex justify-center">{sliderFooter}</div>
      ) : (
        <div />
      )}
    </div>
  );
}
