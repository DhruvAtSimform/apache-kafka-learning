import type { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";

import { healthService } from "@/services/health.service.js";
import type { HealthQuery } from "@/validators/health.validator.js";
import { healthQuerySchema } from "@/validators/health.validator.js";
import { validateWithSchema } from "@/validators/validate-with-schema.js";

class HealthController {
  async getHealth(
    request: Request<ParamsDictionary, unknown, unknown, HealthQuery>,
    response: Response,
  ): Promise<void> {
    const query = validateWithSchema(healthQuerySchema, request.query);

    void query;

    const health = healthService.getStatus();

    response.status(200).json({
      success: true,
      data: health,
    });
  }
}

export const healthController = new HealthController();
