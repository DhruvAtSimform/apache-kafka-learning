import { and, eq } from "drizzle-orm";

import { db } from "@/infrastructure/db/client.js";
import {
  metricsTable,
  organizationsTable,
  usageEventsTable,
} from "@/infrastructure/db/schema.js";
import type {
  CreateUsageEventInput,
  MetricEntity,
  OrganizationEntity,
  UsageEventEntity,
  UsageEventsRepository,
} from "@/repositories/contracts/usage-events-repository.interface.js";

export class DrizzleUsageEventsRepository implements UsageEventsRepository {
  async create(input: CreateUsageEventInput): Promise<UsageEventEntity> {
    const [record] = await db
      .insert(usageEventsTable)
      .values({
        organizationId: input.organizationId,
        metricId: input.metricId,
        customerId: input.customerId,
        idempotencyKey: input.idempotencyKey,
        quantity: input.quantity,
        uniqueId: input.uniqueId,
        source: input.source,
        eventTimestamp: input.eventTimestamp,
        properties: input.properties,
      })
      .returning();

    return record;
  }

  async findById(id: string): Promise<UsageEventEntity | null> {
    const [record] = await db
      .select()
      .from(usageEventsTable)
      .where(eq(usageEventsTable.id, id))
      .limit(1);

    return record ?? null;
  }

  async findByOrganizationAndIdempotency(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<UsageEventEntity | null> {
    const [record] = await db
      .select()
      .from(usageEventsTable)
      .where(
        and(
          eq(usageEventsTable.organizationId, organizationId),
          eq(usageEventsTable.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async findOrganizationById(id: string): Promise<OrganizationEntity | null> {
    const [record] = await db
      .select({ id: organizationsTable.id, status: organizationsTable.status })
      .from(organizationsTable)
      .where(eq(organizationsTable.id, id))
      .limit(1);

    return record ?? null;
  }

  async findMetricById(
    organizationId: string,
    metricId: string,
  ): Promise<MetricEntity | null> {
    const [record] = await db
      .select()
      .from(metricsTable)
      .where(
        and(
          eq(metricsTable.organizationId, organizationId),
          eq(metricsTable.id, metricId),
        ),
      )
      .limit(1);

    return record ?? null;
  }

  async findMetricByLookupKey(
    organizationId: string,
    lookupKey: string,
  ): Promise<MetricEntity | null> {
    const [record] = await db
      .select()
      .from(metricsTable)
      .where(
        and(
          eq(metricsTable.organizationId, organizationId),
          eq(metricsTable.lookupKey, lookupKey),
        ),
      )
      .limit(1);

    return record ?? null;
  }
}
