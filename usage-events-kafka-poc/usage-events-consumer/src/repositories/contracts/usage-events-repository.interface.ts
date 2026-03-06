export interface UsageEventEntity {
  id: string;
  organizationId: string;
  metricId: string;
  customerId: string | null;
  idempotencyKey: string;
  quantity: string;
  uniqueId: string | null;
  source: string;
  eventTimestamp: Date;
  ingestedAt: Date;
  properties: Record<string, unknown>;
}

export interface CreateUsageEventInput {
  organizationId: string;
  metricId: string;
  customerId?: string;
  idempotencyKey: string;
  quantity: string;
  uniqueId?: string;
  source: string;
  eventTimestamp: Date;
  properties: Record<string, unknown>;
}

export interface MetricEntity {
  id: string;
  organizationId: string;
  name: string;
  lookupKey: string;
  aggregateType: "sum" | "event_count" | "unique_events" | "max";
  propertyName: string;
  filters: Array<{ key: string; values: string[] }>;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageEventsRepository {
  create(input: CreateUsageEventInput): Promise<UsageEventEntity>;
  findByOrganizationAndIdempotency(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<UsageEventEntity | null>;
  findMetricById(
    organizationId: string,
    metricId: string,
  ): Promise<MetricEntity | null>;
}
