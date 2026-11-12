export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.MONGODB_URI || !process.env.DATABASE_NAME) return;

  const { triggerConnectedFactoryBackgroundInit } = await import(
    "./lib/connectedFactory/seedData.js"
  );
  // Run non-blocking in the background on server startup:
  // - If already provisioned, verifies in ~15ms with zero writes.
  // - On first deploy to an environment, populates only missing Connected Factory
  //   records and indexes safely across pods.
  void triggerConnectedFactoryBackgroundInit();
}
