// Telemetry API

export async function persistTelemetry(telemetry) {
  const doc = {
    ts:
      telemetry.timestamp && telemetry.timestamp.$date
        ? { $date: telemetry.timestamp.$date }
        : { $date: new Date().toISOString() },
    metadata: telemetry.metadata,
    temperature: telemetry.temperature.value,
    vibration: telemetry.vibration.value,
  };
  await fetch("/api/action/insertOne", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "insertOne",
      collection: "telemetry",
      document: doc,
    }),
  });
}
