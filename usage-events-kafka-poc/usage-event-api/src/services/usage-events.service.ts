import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  HttpErrorCode,
  NotFoundException,
} from "@/exceptions/http.exception.js";
import { usageEventsProducer } from "@/infrastructure/kafka/usage-events.producer.js";
import { DrizzleUsageEventsRepository } from "@/repositories/drizzle-usage-events.repository.js";
import type { UsageEventRequest } from "@/validators/usage-events.validator.js";

const usageEventsRepository = new DrizzleUsageEventsRepository();

function parseNumericQuantity(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed.toString();
    }
  }

  throw new BadRequestException(
    "Metric property value must be numeric",
    {
      field: "properties",
    },
    HttpErrorCode.VALIDATION_ERROR,
  );
}

class UsageEventsService {
  async ingestUsageEvent(payload: UsageEventRequest) {
    const organization = await usageEventsRepository.findOrganizationById(
      payload.organizationId,
    );

    if (!organization) {
      throw new NotFoundException("Organization not found");
    }

    if (organization.status !== "active") {
      throw new BadRequestException(
        "Organization is inactive",
        {
          field: "organizationId",
        },
        HttpErrorCode.VALIDATION_ERROR,
      );
    }

    const metric = await usageEventsRepository.findMetricByLookupKey(
      payload.organizationId,
      payload.metricLookupKey,
    );

    if (!metric) {
      throw new NotFoundException("Metric not found for organization");
    }

    const metricValue = payload.properties[metric.propertyName];

    if (metricValue === undefined || metricValue === null) {
      throw new BadRequestException(
        `properties.${metric.propertyName} is required`,
        {
          field: `properties.${metric.propertyName}`,
        },
        HttpErrorCode.VALIDATION_ERROR,
      );
    }

    const isUniqueEventsMetric = metric.aggregateType === "unique_events";
    const uniqueId = isUniqueEventsMetric ? String(metricValue) : undefined;
    const quantity = isUniqueEventsMetric
      ? "1"
      : parseNumericQuantity(metricValue);

    const event = await usageEventsRepository.create({
      organizationId: payload.organizationId,
      metricId: metric.id,
      customerId: payload.customerId,
      idempotencyKey: payload.idempotencyKey ?? randomUUID(),
      quantity,
      uniqueId,
      source: payload.source,
      eventTimestamp: payload.timestamp ?? new Date(),
      properties: payload.properties,
    });

    await usageEventsProducer.publish({
      eventId: event.id,
      organizationId: event.organizationId,
      metricId: event.metricId,
      metricLookupKey: payload.metricLookupKey,
      customerId: payload.customerId,
      idempotencyKey: event.idempotencyKey,
      quantity: event.quantity,
      uniqueId: event.uniqueId,
      source: event.source,
      eventTimestamp: event.eventTimestamp.toISOString(),
      ingestedAt: event.ingestedAt.toISOString(),
      properties: event.properties,
    });

    return {
      id: event.id,
      organizationId: event.organizationId,
      metricId: event.metricId,
      idempotencyKey: event.idempotencyKey,
      quantity: event.quantity,
      uniqueId: event.uniqueId,
      source: event.source,
      eventTimestamp: event.eventTimestamp.toISOString(),
      ingestedAt: event.ingestedAt.toISOString(),
    };
  }
}

export const usageEventsService = new UsageEventsService();
