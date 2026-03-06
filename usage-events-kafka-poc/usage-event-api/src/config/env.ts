import "dotenv/config";

const DEFAULT_PORT = 3000;
const DEFAULT_KAFKA_BROKERS = ["127.0.0.1:9092"];

type SaslMechanism = "plain" | "scram-sha-256" | "scram-sha-512";

function parsePort(value: string | undefined): number {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    return DEFAULT_PORT;
  }

  return port;
}

function parseBrokers(value: string | undefined): string[] {
  if (!value) {
    return DEFAULT_KAFKA_BROKERS;
  }

  const brokers = value
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

  return brokers.length > 0 ? brokers : DEFAULT_KAFKA_BROKERS;
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

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parsePort(process.env.PORT),
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  KAFKA_BROKERS: parseBrokers(process.env.KAFKA_BROKERS),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID ?? "usage-event-api",
  KAFKA_SSL: parseBoolean(process.env.KAFKA_SSL, false),
  KAFKA_SASL_MECHANISM: parseSaslMechanism(process.env.KAFKA_SASL_MECHANISM),
  KAFKA_SASL_USERNAME: process.env.KAFKA_SASL_USERNAME,
  KAFKA_SASL_PASSWORD: process.env.KAFKA_SASL_PASSWORD,
} as const;
