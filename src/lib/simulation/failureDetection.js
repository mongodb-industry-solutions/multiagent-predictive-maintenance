// Failure detection logic (not React)
// Checks telemetry and generates alert if needed

const TEMP_THRESHOLD = 90;
const VIB_THRESHOLD = 1.2;

export function checkForAlert(machineData, alerts, status) {
  // Only one alert per excursion above threshold, and only if not already in alert status
  const tempAlertActive = alerts.some(
    (a) => a.err_code === "E12" && !a.resolved
  );
  const vibAlertActive = alerts.some(
    (a) => a.err_code === "E13" && !a.resolved
  );
  const now = new Date();
  // High temperature alert
  if (
    machineData.temperature.value > TEMP_THRESHOLD &&
    !tempAlertActive &&
    status !== "alert"
  ) {
    return {
      _id: "alert-" + now.getTime(),
      err_code: "E12",
      err_name: "High temperature",
      machine_id: "M1",
      ts: now.toLocaleString(),
      details: {
        temperature: machineData.temperature.value,
        vibration: machineData.vibration.value,
      },
    };
  }
  // High vibration alert
  if (
    machineData.vibration.value > VIB_THRESHOLD &&
    !vibAlertActive &&
    status !== "alert"
  ) {
    return {
      _id: "alert-" + now.getTime(),
      err_code: "E13",
      err_name: "High vibration",
      machine_id: "M1",
      ts: now.toLocaleString(),
      details: {
        temperature: machineData.temperature.value,
        vibration: machineData.vibration.value,
      },
    };
  }
  return null;
}
