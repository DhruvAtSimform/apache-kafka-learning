import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const organizationStatusEnum = pgEnum("organization_status", [
  "active",
  "inactive",
]);

export const metricAggregateTypeEnum = pgEnum("metric_aggregate_type", [
  "sum",
  "event_count",
  "unique_events",
  "max",
]);

export type MetricFilter = {
  key: string;
  values: string[];
};

export const organizationsTable = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description"),
  status: organizationStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const customersTable = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    externalId: text("external_id").notNull(),
    email: text("email").notNull(),
    address: jsonb("address").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("customers_external_id_unique").on(table.externalId),
    uniqueIndex("customers_email_unique").on(table.email),
  ],
);

export const organizationCustomersTable = pgTable(
  "organization_customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("organization_customers_org_customer_unique").on(
      table.organizationId,
      table.customerId,
    ),
    index("organization_customers_org_idx").on(table.organizationId),
    index("organization_customers_customer_idx").on(table.customerId),
  ],
);

export const metricsTable = pgTable(
  "metrics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    lookupKey: text("lookup_key").notNull(),
    aggregateType: metricAggregateTypeEnum("aggregate_type").notNull(),
    propertyName: text("property_name").notNull(),
    filters: jsonb("filters").$type<MetricFilter[]>().notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("metrics_org_lookup_unique").on(
      table.organizationId,
      table.lookupKey,
    ),
    index("metrics_org_idx").on(table.organizationId),
  ],
);

export const usageEventsTable = pgTable(
  "usage_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    metricId: uuid("metric_id")
      .notNull()
      .references(() => metricsTable.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id").references(() => customersTable.id, {
      onDelete: "set null",
    }),
    idempotencyKey: text("idempotency_key").notNull(),
    quantity: numeric("quantity", { precision: 20, scale: 6 }).notNull(),
    uniqueId: text("unique_id"),
    source: text("source").notNull(),
    eventTimestamp: timestamp("event_timestamp", {
      withTimezone: true,
    }).notNull(),
    ingestedAt: timestamp("ingested_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    properties: jsonb("properties").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    uniqueIndex("usage_events_org_idempotency_unique").on(
      table.organizationId,
      table.idempotencyKey,
    ),
    index("usage_events_org_metric_idx").on(
      table.organizationId,
      table.metricId,
    ),
    index("usage_events_metric_idx").on(table.metricId),
    index("usage_events_ingested_at_idx").on(table.ingestedAt),
  ],
);
