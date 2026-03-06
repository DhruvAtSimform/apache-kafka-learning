import type { Request, Response } from "express";

import { usageEventsService } from "@/services/usage-events.service.js";
import {
  usageEventRequestSchema,
  usageEventResponseSchema,
  type UsageEventRequest,
} from "@/validators/usage-events.validator.js";
import { validateWithSchema } from "@/validators/validate-with-schema.js";

class UsageEventsController {
  async ingest(
    request: Request<unknown, unknown, UsageEventRequest>,
    response: Response,
  ): Promise<void> {
    const body = validateWithSchema(usageEventRequestSchema, request.body);
    const data = await usageEventsService.ingestUsageEvent(body);
    const result = validateWithSchema(usageEventResponseSchema, {
      success: true,
      data,
    });

    response.status(201).json(result);
  }
}

export const usageEventsController = new UsageEventsController();
