import { Router } from "express";

import { usageEventsController } from "@/controllers/usage-events.controller.js";
import { asyncHandler } from "@/middlewares/async-handler.middleware.js";

export const usageEventsRouter = Router();

usageEventsRouter.post("/ingest", asyncHandler(usageEventsController.ingest));
