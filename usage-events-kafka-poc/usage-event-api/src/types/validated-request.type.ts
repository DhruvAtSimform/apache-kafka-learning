import type { Request } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";

export interface ValidatedRequestData<
  TParams extends ParamsDictionary = ParamsDictionary,
  TQuery extends Query = Query,
  TBody = unknown,
> {
  params: TParams;
  query: TQuery;
  body: TBody;
}

export type ValidatedRequest<
  TParams extends ParamsDictionary = ParamsDictionary,
  TResBody = unknown,
  TReqBody = unknown,
  TReqQuery extends Query = Query,
> = Request<TParams, TResBody, TReqBody, TReqQuery> & {
  validated: ValidatedRequestData<TParams, TReqQuery, TReqBody>;
};
