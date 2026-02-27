import { KafkaJS } from "@confluentinc/kafka-javascript";

import { opensearchClient } from "../opensearch-client/index.js";

const DEFAULT_BROKERS = ["127.0.0.1:9092", "127.0.0.1:9093"];
const CONFIGURED_BROKERS = (process.env.KAFKA_BROKERS ?? "")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const BROKERS = CONFIGURED_BROKERS.length
  ? CONFIGURED_BROKERS
  : DEFAULT_BROKERS;

const TOPIC = process.env.WIKIMEDIA_TOPIC ?? "wikimedia-events";
const GROUP_ID =
  process.env.WIKIMEDIA_CONSUMER_GROUP_ID ?? "wikimedia-opensearch-group";

const { Kafka } = KafkaJS;
const kafka = new Kafka({
  kafkaJS: {
    clientId: "wikimedia-poc-consumer",
    brokers: BROKERS,
  },
});

type HeaderValue = Buffer | string | Array<Buffer | string> | undefined;
type HeaderMap = Record<string, HeaderValue> | undefined;

function headerToString(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) {
    const first = value[0];
    return Buffer.isBuffer(first) ? first.toString() : first;
  }

  return Buffer.isBuffer(value) ? value.toString() : value;
}

function getHeader(headers: HeaderMap, key: string): string | undefined {
  return headerToString(headers?.[key]);
}

function logHeaders(headers: HeaderMap): void {
  if (!headers) {
    return;
  }

  console.log("   Headers:");
  for (const [key, value] of Object.entries(headers)) {
    const rendered = Array.isArray(value)
      ? value.map((item) => (Buffer.isBuffer(item) ? item.toString() : item))
      : Buffer.isBuffer(value)
        ? value.toString()
        : value;

    console.log(`      ${key}: ${rendered}`);
  }
}

export async function startWikimediaEventsConsumer(): Promise<void> {
  console.log("Wikimedia Kafka consumer starting...");
  console.log(`Brokers: ${BROKERS.join(", ")}`);
  console.log(`Topic: ${TOPIC}`);
  console.log(`Group ID: ${GROUP_ID}`);

  await opensearchClient.ensureIndex();

  const consumer1 = kafka.consumer({
    kafkaJS: { groupId: GROUP_ID },
    "partition.assignment.strategy": "cooperative-sticky",
    // #NOTE: make sure you handle this carefully in production to process 'at-least-once', or 'at-most-once' or 'exactly-once' semantics based on your use case. 
    // For simplicity, we're using auto-commit here, which provides 'at-least-once' processing guarantees.
    //  Also use the idempotent processing logic in your system. e.x use the id in opensearch indexing
    "auto.commit.enable": true, // Enable auto-commit of offsets
    "auto.commit.interval.ms": 5000, // Auto-commit every 5 seconds
  });

  await consumer1.connect();
  await consumer1.subscribe({ topics: [TOPIC] });

    await consumer1.run({
      // eachMessage: async ({ topic, partition, message }) => {
      //   await processKafkaMessage(topic, partition.toString(), message);
      // },
      eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        isRunning,
        isStale,
      }) => {
        for (const message of batch.messages) {
          if (!isRunning() || isStale()) break;

          try {
            await processKafkaMessage(
              batch.topic,
              batch.partition.toString(),
              message,
            );
            // Manually resolve the offset after processing the message
            resolveOffset(message.offset);
            await heartbeat();
          } catch (error) {
            console.error("   Failed to parse/index Wikimedia event:", error);
          }
        }
      },
    });


    const consumer2 = kafka.consumer({
      kafkaJS: { groupId: GROUP_ID },
      "partition.assignment.strategy": "cooperative-sticky",
      // #NOTE: make sure you handle this carefully in production to process 'at-least-once', or 'at-most-once' or 'exactly-once' semantics based on your use case.
      // For simplicity, we're using auto-commit here, which provides 'at-least-once' processing guarantees.
      //  Also use the idempotent processing logic in your system. e.x use the id in opensearch indexing
      "auto.commit.enable": true, // Enable auto-commit of offsets
      "auto.commit.interval.ms": 5000, // Auto-commit every 5 seconds
    });

    await consumer2.connect();
    await consumer2.subscribe({ topics: [TOPIC] });

    await consumer2.run({
      // eachMessage: async ({ topic, partition, message }) => {
      //   await processKafkaMessage(topic, partition.toString(), message);
      // },
      eachBatch: async ({
        batch,
        resolveOffset,
        heartbeat,
        isRunning,
        isStale,
      }) => {
        for (const message of batch.messages) {
          if (!isRunning() || isStale()) break;

          try {
            await processKafkaMessage(
              batch.topic,
              batch.partition.toString(),
              message,
            );
            // Manually resolve the offset after processing the message
            // resolveOffset(message.offset);
            // await heartbeat();
          } catch (error) {
            console.error("   Failed to parse/index Wikimedia event:", error);
          }
        }
      },
    });



  const shutdown = async () => {
    console.log("Shutting down Wikimedia consumer...");

    try {
      await consumer1.disconnect();
      await consumer2.disconnect();
    } catch (error) {
      console.error("Failed to disconnect consumer:", error);
    }
  };

  process.once("SIGINT", () => {
    void shutdown();
  });

  process.once("SIGTERM", () => {
    void shutdown();
  });

}

async function processKafkaMessage (topic: string, partition: string, message: KafkaJS.KafkaMessage) {
  const rawValue = message.value?.toString();
  const contentType =
    getHeader(message.headers, "contentType") ?? "unknown";

  console.log("\n[WIKIMEDIA] Received message:");
  console.log(`   Topic: ${topic}`);
  console.log(`   Partition: ${partition}`);
  console.log(`   Offset: ${message.offset}`);
  console.log(`   Key: ${message.key?.toString()}`);
  console.log(`   Content-Type: ${contentType}`);
  logHeaders(message.headers);

  if (!rawValue) {
    console.warn("   Empty message value. Skipping.");
    return;
  }

  try {
    const payload = JSON.parse(rawValue) as Record<string, unknown>;

    // Kafka consumer generally auto commits the offset asynchronously, so we don't need to manually commit here.
    // however if we wanted to ensure that we only commit after successful processing, we could use the `autoCommit: false` option in the consumer configuration
    // and then call `await consumer.commitOffsets()` here after indexing.

    // in kafkajs, we can controll manuall offsets with ```eachBatch``` instead of `eachMessage`, which gives us more control over when to commit offsets. For simplicity, we're using `eachMessage` here, which will auto-commit after processing each message.
    const meta = payload['meta'] as Record<string, unknown> | undefined;
    const id = meta?.['id'] as string | undefined ?? `${topic}-${partition}-${message.offset}`;
    const indexResponse = await opensearchClient.putDocument(id, payload);

    console.log(
      `   Indexed event in OpenSearch (id: ${indexResponse.statusCode} ?? "unknown")})`,
      indexResponse.body,
    );
  } catch (error) {
    console.error("   Failed to parse/index Wikimedia event:", error);
  }
}

if (process.argv[1]?.endsWith("wikimedia-events.consumer.ts")) {
  startWikimediaEventsConsumer().catch((error) => {
    console.error("Wikimedia consumer failed:", error);
    process.exitCode = 1;
  });
}
