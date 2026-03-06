import { pinoHttp } from "pino-http";

import { logger } from "@/config/logger.js";

export const requestLoggerMiddleware = pinoHttp({
  logger,
});
