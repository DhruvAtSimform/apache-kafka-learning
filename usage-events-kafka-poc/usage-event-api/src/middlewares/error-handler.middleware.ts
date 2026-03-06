import type { NextFunction, Request, Response } from "express";

import { logger } from "@/config/logger.js";
import {
  HttpErrorCode,
  HttpException,
  HttpStatusCode,
} from "@/exceptions/http.exception.js";

export function errorHandlerMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  void next;

  if (error instanceof HttpException) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? null,
      },
    });
    return;
  }

  logger.error({ err: error }, "Unexpected application error");

  response.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: {
      code: HttpErrorCode.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
      details: null,
    },
  });
}
