export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.MONGODB_URI || !process.env.DATABASE_NAME) return;

  const { triggerConnectedFactoryBackgroundInit } = await import(
    "./lib/connectedFactory/seedData.js"
  );
  const { triggerAuditTrailBackgroundInit } = await import(
    "./lib/auditTrail/seedData.js"
  );
  const { triggerDeploymentCalendarSync } = await import(
    "./lib/simulation/productionCalendar.js"
  );
  const { triggerPredictiveMaintenanceSeedSync } = await import(
    "./lib/simulation/predictiveSeedSync.js"
  );
  const { triggerKnowledgeGraphBackgroundInit } = await import(
    "./lib/knowledgeGraph/seedData.js"
  );
  // Run non-blocking in the background on server startup:
  // - If already provisioned, verifies in ~15ms with zero writes.
  // - On first deploy to an environment, populates only missing Connected Factory
  //   and Agentic Audit Trail records and indexes safely across pods.
  void triggerConnectedFactoryBackgroundInit();
  void triggerAuditTrailBackgroundInit();
  // Idempotently upgrades/aligns Predictive Maintenance knowledge collections
  // (manuals, interviews, inventory, maintenance_staff, seeded workorders) to the current seed version.
  void triggerPredictiveMaintenanceSeedSync();
  // Idempotently upserts the Leafy Factory knowledge graph and its traversal indexes.
  void triggerKnowledgeGraphBackgroundInit();
  // On new staging/production deployments (identified by DEPLOYMENT_ID),
  // regenerates production_calendar for PRODUCTION_CALENDAR_MONTHS once per release.
  void triggerDeploymentCalendarSync();
}
