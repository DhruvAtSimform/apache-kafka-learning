import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";

export function asyncHandler<
  TParams extends ParamsDictionary = ParamsDictionary,
  TResBody = unknown,
  TReqBody = unknown,
  TReqQuery extends Query = Query,
>(
  handler: (
    request: Request<TParams, TResBody, TReqBody, TReqQuery>,
    response: Response<TResBody>,
    next: NextFunction,
  ) => Promise<void>,
): RequestHandler<TParams, TResBody, TReqBody, TReqQuery> {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}
