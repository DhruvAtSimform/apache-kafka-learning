import type { NextFunction, Request, Response } from "express";

import { NotFoundException } from "@/exceptions/http.exception.js";

export function notFoundMiddleware(
  _request: Request,
  _response: Response,
  next: NextFunction,
): void {
  next(new NotFoundException("Route not found", undefined, "ROUTE_NOT_FOUND"));
}
