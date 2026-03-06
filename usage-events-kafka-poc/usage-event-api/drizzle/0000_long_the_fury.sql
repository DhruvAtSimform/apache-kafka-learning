CREATE TYPE "public"."metric_aggregate_type" AS ENUM('sum', 'event_count', 'unique_events', 'max');--> statement-breakpoint
CREATE TYPE "public"."organization_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"email" text NOT NULL,
	"address" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"lookup_key" text NOT NULL,
	"aggregate_type" "metric_aggregate_type" NOT NULL,
	"property_name" text NOT NULL,
	"filters" jsonb NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"status" "organization_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"metric_id" uuid NOT NULL,
	"customer_id" uuid,
	"idempotency_key" text NOT NULL,
	"quantity" numeric(20, 6) NOT NULL,
	"unique_id" text,
	"source" text NOT NULL,
	"event_timestamp" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"properties" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metrics" ADD CONSTRAINT "metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_customers" ADD CONSTRAINT "organization_customers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_customers" ADD CONSTRAINT "organization_customers_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_metric_id_metrics_id_fk" FOREIGN KEY ("metric_id") REFERENCES "public"."metrics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customers_external_id_unique" ON "customers" USING btree ("external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_unique" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "metrics_org_lookup_unique" ON "metrics" USING btree ("organization_id","lookup_key");--> statement-breakpoint
CREATE INDEX "metrics_org_idx" ON "metrics" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_customers_org_customer_unique" ON "organization_customers" USING btree ("organization_id","customer_id");--> statement-breakpoint
CREATE INDEX "organization_customers_org_idx" ON "organization_customers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_customers_customer_idx" ON "organization_customers" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_events_org_idempotency_unique" ON "usage_events" USING btree ("organization_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "usage_events_org_metric_idx" ON "usage_events" USING btree ("organization_id","metric_id");--> statement-breakpoint
CREATE INDEX "usage_events_metric_idx" ON "usage_events" USING btree ("metric_id");--> statement-breakpoint
CREATE INDEX "usage_events_ingested_at_idx" ON "usage_events" USING btree ("ingested_at");