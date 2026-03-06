import { z } from "zod";

import { DrizzleUsageEventsRepository } from "@/repositories/drizzle-usage-events.repository.js";

const usageEventsKafkaMessageSchema = z
  .object({
    organizationId: z.string().uuid(),
    metricId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    idempotencyKey: z.string().min(8).max(128),
    source: z.string().min(2).max(128),
    eventTimestamp: z.coerce.date(),
    properties: z.record(z.unknown()),
  })
  .strict();

type UsageEventsKafkaMessage = z.infer<typeof usageEventsKafkaMessageSchema>;

export class UsageEventsMessageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageEventsMessageValidationError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const value = error as { code?: string };
  return value.code === "23505";
}

function parseQuantity(value: string): string {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new UsageEventsMessageValidationError(
      "properties.<metric.propertyName> must contain a numeric string value for non-unique metrics",
    );
  }

  return parsed.toString();
}

class UsageEventsConsumerService {
  private readonly repository = new DrizzleUsageEventsRepository();

  async processRawMessage(rawValue: string): Promise<{
    created: boolean;
    idempotencyKey: string;
  }> {
    let parsedJson: unknown;

    try {
      parsedJson = JSON.parse(rawValue);
    } catch {
      throw new UsageEventsMessageValidationError(
        "Kafka message value is not valid JSON",
      );
    }

    const payload = usageEventsKafkaMessageSchema.parse(parsedJson);
    return this.processPayload(payload);
  }

  private async processPayload(payload: UsageEventsKafkaMessage): Promise<{
    created: boolean;
    idempotencyKey: string;
  }> {
    const metric = await this.repository.findMetricById(
      payload.organizationId,
      payload.metricId,
    );

    if (!metric) {
      throw new UsageEventsMessageValidationError(
        "Metric not found for organization",
      );
    }

    const metricPropertyValue = payload.properties[metric.propertyName];

    if (typeof metricPropertyValue !== "string") {
      throw new UsageEventsMessageValidationError(
        `properties.${metric.propertyName} must exist and be a string`,
      );
    }

    const metricFiltersByKey = new Map(
      metric.filters.map((filter) => [filter.key, filter]),
    );

    for (const [propertyKey, propertyValue] of Object.entries(
      payload.properties,
    )) {
      if (propertyKey === metric.propertyName) {
        continue;
      }

      const filter = metricFiltersByKey.get(propertyKey);
      if (!filter) {
        continue;
      }

      if (typeof propertyValue !== "string") {
        throw new UsageEventsMessageValidationError(
          `properties.${propertyKey} must be a string when used as a metric filter`,
        );
      }

      if (!filter.values.includes(propertyValue)) {
        throw new UsageEventsMessageValidationError(
          `properties.${propertyKey} must match one of the allowed filter values`,
        );
      }
    }

    const isUniqueEvents = metric.aggregateType === "unique_events";
    const uniqueId = isUniqueEvents ? metricPropertyValue : undefined;
    const quantity = isUniqueEvents ? "1" : parseQuantity(metricPropertyValue);

    try {
      await this.repository.create({
        organizationId: payload.organizationId,
        metricId: payload.metricId,
        customerId: payload.customerId,
        idempotencyKey: payload.idempotencyKey,
        quantity,
        uniqueId,
        source: payload.source,
        eventTimestamp: payload.eventTimestamp,
        properties: payload.properties,
      });

      return { created: true, idempotencyKey: payload.idempotencyKey };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const existingEvent =
        await this.repository.findByOrganizationAndIdempotency(
          payload.organizationId,
          payload.idempotencyKey,
        );

      if (!existingEvent) {
        throw error;
      }

      return { created: false, idempotencyKey: payload.idempotencyKey };
    }
  }
}

export const usageEventsConsumerService = new UsageEventsConsumerService();
