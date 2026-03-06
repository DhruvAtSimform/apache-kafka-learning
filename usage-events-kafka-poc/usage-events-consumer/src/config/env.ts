import "dotenv/config";

type SaslMechanism = "plain" | "scram-sha-256" | "scram-sha-512";

function parseBrokers(value: string | undefined): string[] {
  if (!value) {
    return ["127.0.0.1:9092"];
  }

  const brokers = value
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

  return brokers.length > 0 ? brokers : ["127.0.0.1:9092"];
}

function parseBoolean(
  value: string | undefined,
  defaultValue = false,
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

function parseSaslMechanism(
  value: string | undefined,
): SaslMechanism | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();

  if (
    normalized === "plain" ||
    normalized === "scram-sha-256" ||
    normalized === "scram-sha-512"
  ) {
    return normalized;
  }

  return undefined;
}

function parsePositiveInteger(
  value: string | undefined,
  defaultValue: number,
): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return defaultValue;
  }

  return parsed;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  KAFKA_BROKERS: parseBrokers(process.env.KAFKA_BROKERS),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID ?? "usage-events-consumer",
  KAFKA_SSL: parseBoolean(process.env.KAFKA_SSL, false),
  KAFKA_SASL_MECHANISM: parseSaslMechanism(process.env.KAFKA_SASL_MECHANISM),
  KAFKA_SASL_USERNAME: process.env.KAFKA_SASL_USERNAME,
  KAFKA_SASL_PASSWORD: process.env.KAFKA_SASL_PASSWORD,
  KAFKA_USAGE_EVENTS_CONSUMER_GROUP_ID:
    process.env.KAFKA_USAGE_EVENTS_CONSUMER_GROUP_ID ??
    "usage-events-processing-group",
  KAFKA_USAGE_EVENTS_CONSUMERS: parsePositiveInteger(
    process.env.KAFKA_USAGE_EVENTS_CONSUMERS,
    1,
  ),
} as const;
