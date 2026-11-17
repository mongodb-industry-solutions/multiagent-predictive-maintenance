// Machine telemetry simulation logic (not React)
// Returns initial machine data, updates telemetry, and simulates values
import {
  DEFAULT_SENSOR_READINGS,
  DEFAULT_THRESHOLDS,
} from "@/lib/factory/constants";

export function getInitialMachineData() {
  return {
    _id: { $oid: "684a976b2227bd01927f82af" },
    timestamp: { $date: new Date().toISOString() },
    metadata: {
      factory_id: "leafy_factory",
      prod_line_id: "ev_module_assembly",
      machine_id: "M1",
      station: "Laser Tab Welding",
    },
    vibration: { value: DEFAULT_SENSOR_READINGS.vibration, unit: "mm/s" },
    temperature: { value: DEFAULT_SENSOR_READINGS.temperature, unit: "Celcius" },
  };
}

function clampSideOfThreshold(sample, target, threshold) {
  if (target <= threshold) return Math.min(sample, threshold);
  return Math.max(sample, threshold + 0.1);
}

export function updateMachineTelemetry(
  prev,
  temp,
  vib,
  thresholds = DEFAULT_THRESHOLDS
) {
  const now = new Date();
  const tempThreshold = Number(
    thresholds?.temperature_threshold ?? DEFAULT_THRESHOLDS.temperature_threshold
  );
  const vibThreshold = Number(
    thresholds?.vibration_threshold ?? DEFAULT_THRESHOLDS.vibration_threshold
  );
  // Add small sensor noise without crossing threshold boundaries unintentionally
  const rawTemp = Number(temp) + (Math.random() - 0.5) * 1.2;
  const rawVib = Number(vib) + (Math.random() - 0.5) * 0.8;
  const clampedTemp = clampSideOfThreshold(rawTemp, Number(temp), tempThreshold);
  const clampedVib = Math.max(
    0,
    clampSideOfThreshold(rawVib, Number(vib), vibThreshold)
  );

  return {
    ...prev,
    timestamp: { $date: now.toISOString() },
    temperature: {
      ...prev.temperature,
      value: Number(clampedTemp.toFixed(1)),
    },
    vibration: {
      ...prev.vibration,
      value: Number(clampedVib.toFixed(1)),
    },
  };
}

export function startMachineSimulation() {}
export function stopMachineSimulation() {}
