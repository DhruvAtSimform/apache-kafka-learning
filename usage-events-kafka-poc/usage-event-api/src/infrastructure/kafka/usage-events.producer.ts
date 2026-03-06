import { createHash } from "node:crypto";

import { KafkaJS } from "@confluentinc/kafka-javascript";

import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";

type UsageEventMessage = {
  eventId: string;
  organizationId: string;
  metricId: string;
  metricLookupKey: string;
  customerId?: string;
  idempotencyKey: string;
  quantity: string;
  uniqueId: string | null;
  source: string;
  eventTimestamp: string;
  ingestedAt: string;
  properties: Record<string, unknown>;
};

const USAGE_EVENTS_TOPIC = "usage-events";
const KAFKA_KEY_MAX_BYTES = 200;

function createMessageKey(input: {
  organizationId: string;
  metricLookupKey: string;
  customerId?: string;
}): string {
  const customerId = input.customerId ?? "anonymous";
  const rawKey = `${input.organizationId}:${input.metricLookupKey}:${customerId}`;

  if (Buffer.byteLength(rawKey, "utf8") <= KAFKA_KEY_MAX_BYTES) {
    return rawKey;
  }

  const digest = createHash("sha256").update(rawKey).digest("hex");
  const compactKey = `${input.organizationId}:${input.metricLookupKey}:h:${digest}`;

  if (Buffer.byteLength(compactKey, "utf8") <= KAFKA_KEY_MAX_BYTES) {
    return compactKey;
  }

  return `h:${digest}`;
}

const { Kafka } = KafkaJS;

const sasl =
  env.KAFKA_SASL_MECHANISM && env.KAFKA_SASL_USERNAME && env.KAFKA_SASL_PASSWORD
    ? {
        mechanism: env.KAFKA_SASL_MECHANISM,
        username: env.KAFKA_SASL_USERNAME,
        password: env.KAFKA_SASL_PASSWORD,
      }
    : undefined;

const kafka = new Kafka({
  kafkaJS: {
    clientId: env.KAFKA_CLIENT_ID,
    brokers: env.KAFKA_BROKERS,
    ssl: env.KAFKA_SSL,
    ...(sasl ? { sasl } : {}),
  },
});

const producer = kafka.producer({
  "enable.idempotence": true,
  acks: -1,
  retries: 2147483647,
  "max.in.flight.requests.per.connection": 5,
  "compression.type": "zstd",
  "linger.ms": 20,
  "batch.size": 131072,
  "delivery.timeout.ms": 120000,
  "request.timeout.ms": 30000,
});

class UsageEventsProducer {
  private isConnected = false;
  private connectPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    if (this.connectPromise) {
      await this.connectPromise;
      return;
    }

    this.connectPromise = (async () => {
      await producer.connect();
      this.isConnected = true;
      logger.info(
        {
          topic: USAGE_EVENTS_TOPIC,
          brokers: env.KAFKA_BROKERS,
          clientId: env.KAFKA_CLIENT_ID,
        },
        "Kafka usage-events producer connected",
      );
    })();

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    await producer.disconnect();
    this.isConnected = false;
    logger.info("Kafka usage-events producer disconnected");
  }

  async publish(message: UsageEventMessage): Promise<void> {
    await this.connect();

    const key = createMessageKey({
      organizationId: message.organizationId,
      metricLookupKey: message.metricLookupKey,
      customerId: message.customerId,
    });

    await producer.send({
      topic: USAGE_EVENTS_TOPIC,
      messages: [
        {
          key,
          value: JSON.stringify(message),
          headers: {
            contentType: "application/json",
            schemaVersion: "1",
            idempotencyKey: message.idempotencyKey,
            organizationId: message.organizationId,
            metricLookupKey: message.metricLookupKey,
          },
        },
      ],
    });
  }
}

export const usageEventsProducer = new UsageEventsProducer();
