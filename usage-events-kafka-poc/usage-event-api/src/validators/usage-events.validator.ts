import { z } from "zod";

const lookupKeyRegex = /^[a-z][a-z0-9_]{1,62}[a-z0-9]$/;

export const usageEventRequestSchema = z
  .object({
    organizationId: z.string().uuid(),
    metricLookupKey: z
      .string()
      .regex(
        lookupKeyRegex,
        "metricLookupKey must be lowercase snake_case and 3-64 chars",
      ),
    customerId: z.string().uuid().optional(),
    idempotencyKey: z.string().min(8).max(128).optional(),
    source: z.string().min(2).max(128),
    timestamp: z.coerce.date().optional(),
    properties: z.record(z.unknown()),
  })
  .strict();

export type UsageEventRequest = z.infer<typeof usageEventRequestSchema>;

export const usageEventResponseDataSchema = z
  .object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    metricId: z.string().uuid(),
    idempotencyKey: z.string(),
    quantity: z.string(),
    uniqueId: z.string().nullable(),
    source: z.string(),
    eventTimestamp: z.string().datetime(),
    ingestedAt: z.string().datetime(),
  })
  .strict();

export const usageEventResponseSchema = z
  .object({
    success: z.literal(true),
    data: usageEventResponseDataSchema,
  })
  .strict();

export type UsageEventResponse = z.infer<typeof usageEventResponseSchema>;
