// Machine telemetry simulation logic (not React)
// Returns initial machine data, updates telemetry, and simulates values

export function getInitialMachineData() {
  return {
    _id: { $oid: "684a976b2227bd01927f82af" },
    timestamp: { $date: new Date().toISOString() },
    metadata: {
      factory_id: "qro_fact_1",
      prod_line_id: 1,
      machine_id: 1,
    },
    vibration: { value: 0.22, unit: "mm/s" },
    temperature: { value: 70.96, unit: "Celcius" },
  };
}

export function updateMachineTelemetry(prev, temp, vib) {
  // Simulate telemetry update with random noise around slider values
  const now = new Date();
  // Add small random noise to the slider values
  const randomTemp = temp + (Math.random() - 0.5) * 2; // ±1°C
  const randomVib = vib + (Math.random() - 0.5) * 0.04; // ±0.02 mm/s
  return {
    ...prev,
    timestamp: { $date: now.toISOString() },
    temperature: { ...prev.temperature, value: Number(randomTemp.toFixed(2)) },
    vibration: { ...prev.vibration, value: Number(randomVib.toFixed(3)) },
  };
}

// Optionally, you could add random noise to values if desired
export function startMachineSimulation() {}
export function stopMachineSimulation() {}
