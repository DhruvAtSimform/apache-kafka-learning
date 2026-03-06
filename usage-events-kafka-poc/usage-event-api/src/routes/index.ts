import type { Express } from "express";

import { healthRouter } from "@/routes/health.routes.js";
import { usageEventsRouter } from "@/routes/usage-events.routes.js";

export function registerRoutes(app: Express): void {
  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/usage-events", usageEventsRouter);
}
