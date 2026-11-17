// Failure detection logic (not React)
// Checks telemetry and generates alert if needed
import { DEFAULT_THRESHOLDS } from "@/lib/factory/constants";
import { buildUnifiedAlert } from "@/lib/api/alerts";

export function checkForAlert(
  machineData,
  alerts = [],
  status = "running",
  thresholds = DEFAULT_THRESHOLDS
) {
  const tempThreshold = Number(
    thresholds?.temperature_threshold ?? DEFAULT_THRESHOLDS.temperature_threshold
  );
  const vibThreshold = Number(
    thresholds?.vibration_threshold ?? DEFAULT_THRESHOLDS.vibration_threshold
  );
  const tempValue = Number(machineData?.temperature?.value);
  const vibValue = Number(machineData?.vibration?.value);

  // Only one alert per excursion above threshold, and only if not already in alert status
  const tempAlertActive = alerts.some(
    (a) => a.err_code === "E12" && !a.resolved
  );
  const vibAlertActive = alerts.some(
    (a) => a.err_code === "E13" && !a.resolved
  );
  const nowIso = new Date().toISOString();

  // High temperature alert
  if (tempValue > tempThreshold && !tempAlertActive && status !== "alert") {
    const unified = buildUnifiedAlert(
      {
        metric: "temperature",
        value: tempValue,
        threshold: tempThreshold,
        timestamp: nowIso,
      },
      {
        temperature: tempValue,
        vibration: vibValue,
        thresholds: {
          temperature_threshold: tempThreshold,
          vibration_threshold: vibThreshold,
        },
        origin: "predictive-maintenance",
        dataSource: "local",
      }
    );
    return {
      ...unified,
      _id: "alert-" + Date.now(),
      ts: nowIso,
    };
  }

  // High vibration alert
  if (vibValue > vibThreshold && !vibAlertActive && status !== "alert") {
    const unified = buildUnifiedAlert(
      {
        metric: "vibration",
        value: vibValue,
        threshold: vibThreshold,
        timestamp: nowIso,
      },
      {
        temperature: tempValue,
        vibration: vibValue,
        thresholds: {
          temperature_threshold: tempThreshold,
          vibration_threshold: vibThreshold,
        },
        origin: "predictive-maintenance",
        dataSource: "local",
      }
    );
    return {
      ...unified,
      _id: "alert-" + Date.now(),
      ts: nowIso,
    };
  }

  return null;
}
