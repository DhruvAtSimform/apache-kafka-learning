import type { ZodTypeAny, z } from "zod";
import {
  BadRequestException,
  HttpErrorCode,
} from "@/exceptions/http.exception.js";

export function validateWithSchema<T extends ZodTypeAny>(
  schema: T,
  payload: unknown,
): z.output<T> {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new BadRequestException(
      "Validation failed",
      {
        fields: result.error.issues.map((issue) => ({
          message: issue.message,
          path: issue.path.join("."),
        })),
      },
      HttpErrorCode.VALIDATION_ERROR,
    );
  }

  return result.data;
}
