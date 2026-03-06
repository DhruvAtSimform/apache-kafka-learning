import { env } from "@/config/env.js";

export const workerConfig = {
  kafka: {
    brokers: env.KAFKA_BROKERS,
    clientId: env.KAFKA_CLIENT_ID,
    ssl: env.KAFKA_SSL,
    sasl:
      env.KAFKA_SASL_MECHANISM &&
      env.KAFKA_SASL_USERNAME &&
      env.KAFKA_SASL_PASSWORD
        ? {
            mechanism: env.KAFKA_SASL_MECHANISM,
            username: env.KAFKA_SASL_USERNAME,
            password: env.KAFKA_SASL_PASSWORD,
          }
        : undefined,
    topic: "usage-events",
    groupId: env.KAFKA_USAGE_EVENTS_CONSUMER_GROUP_ID,
  },
  workers: {
    consumers: env.KAFKA_USAGE_EVENTS_CONSUMERS,
  },
} as const;
