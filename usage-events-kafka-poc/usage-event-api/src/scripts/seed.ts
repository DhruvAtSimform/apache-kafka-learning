import { eq } from "drizzle-orm";

import { db } from "@/infrastructure/db/client.js";
import {
  customersTable,
  metricsTable,
  organizationCustomersTable,
  organizationsTable,
} from "@/infrastructure/db/schema.js";

async function seed(): Promise<void> {
  const existingOrganization = (
    await db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(eq(organizationsTable.slug, "acme-org"))
      .limit(1)
  )[0];

  const organizationId =
    existingOrganization?.id ??
    (
      await db
        .insert(organizationsTable)
        .values({
          name: "Acme Org",
          slug: "acme-org",
          description: "Sample tenant organization",
          status: "active",
        })
        .returning({ id: organizationsTable.id })
    )[0]?.id;

  if (!organizationId) {
    throw new Error("Failed to seed organization");
  }

  const [insertedCustomer] = await db
    .insert(customersTable)
    .values({
      externalId: "cust_ext_001",
      email: "billing@acme.test",
      address: {
        line1: "100 Main Street",
        city: "San Francisco",
        country: "US",
        postalCode: "94105",
      },
    })
    .onConflictDoNothing({ target: customersTable.externalId })
    .returning();

  const customerId =
    insertedCustomer?.id ??
    (
      await db
        .select({ id: customersTable.id })
        .from(customersTable)
        .where(eq(customersTable.externalId, "cust_ext_001"))
        .limit(1)
    )[0]?.id;

  if (!customerId) {
    throw new Error("Failed to seed customer");
  }

  await db
    .insert(organizationCustomersTable)
    .values({
      organizationId,
      customerId,
    })
    .onConflictDoNothing({
      target: [
        organizationCustomersTable.organizationId,
        organizationCustomersTable.customerId,
      ],
    });

  await db
    .insert(metricsTable)
    .values({
      organizationId,
      name: "Token Usage",
      lookupKey: "token_usage",
      aggregateType: "sum",
      propertyName: "tokens",
      filters: [
        { key: "model", values: ["gpt-5.3-codex", "sonnet 4.6", "opus 4.6"] },
      ],
      description: "Tracks token usage",
    })
    .onConflictDoNothing({
      target: [metricsTable.organizationId, metricsTable.lookupKey],
    });
}

void seed();
