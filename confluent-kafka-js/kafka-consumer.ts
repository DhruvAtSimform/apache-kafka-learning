import { KafkaJS } from "@confluentinc/kafka-javascript";
import avro from "avsc";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_BROKERS = ["127.0.0.1:9092", "127.0.0.1:9093"];
const CONFIGURED_BROKERS = (process.env.KAFKA_BROKERS ?? "")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const KAFKA_CONFIG = {
  brokers: (CONFIGURED_BROKERS.length
    ? CONFIGURED_BROKERS
    : DEFAULT_BROKERS) as string[],
  clientId: "confluent-multi-format-consumer",
  groupId: "consumer-group-1",
};

const { Kafka } = KafkaJS;
const kafka = new Kafka({
  kafkaJS: {
    clientId: KAFKA_CONFIG.clientId,
    brokers: KAFKA_CONFIG.brokers,
  },
});

// ============================================================================
// Avro Schemas (must match producer schemas)
// ============================================================================

const PRODUCT_SCHEMA_V1 = avro.Type.forSchema({
  type: "record",
  name: "Product",
  namespace: "com.example.events",
  fields: [
    { name: "productId", type: "string" },
    { name: "name", type: "string" },
    { name: "price", type: "double" },
    { name: "category", type: "string" },
    { name: "inStock", type: "boolean" },
    { name: "updatedAt", type: "string" },
  ],
});

const PRODUCT_SCHEMA_V2 = avro.Type.forSchema({
  type: "record",
  name: "Product",
  namespace: "com.example.events",
  fields: [
    { name: "productId", type: "string" },
    { name: "name", type: "string" },
    { name: "price", type: "double" },
    { name: "category", type: "string" },
    { name: "inStock", type: "boolean" },
    { name: "updatedAt", type: "string" },
    { name: "description", type: ["null", "string"], default: null },
    { name: "tags", type: { type: "array", items: "string" }, default: [] },
  ],
});

// ============================================================================
// Helpers
// ============================================================================

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
  if (!headers) return;
  console.log("   Headers:");
  for (const [k, v] of Object.entries(headers)) {
    const rendered = Array.isArray(v)
      ? v.map((item) => (Buffer.isBuffer(item) ? item.toString() : item))
      : Buffer.isBuffer(v)
        ? v.toString()
        : v;
    console.log(`      ${k}: ${rendered}`);
  }
}

async function setupShutdown(consumer: ReturnType<typeof kafka.consumer>) {
  const shutdown = async () => {
    console.log("Shutting down consumer...");
    try {
      await consumer.disconnect();
    } catch (error) {
      console.error("Failed to disconnect consumer:", error);
    } finally {
      process.exit(0);
    }
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

// ============================================================================
// Consumer Examples
// ============================================================================

async function consumeStringMessages() {
  console.log("String consumer starting");

  const consumer = kafka.consumer({
    kafkaJS: { groupId: `${KAFKA_CONFIG.groupId}-string` },
    "partition.assignment.strategy": "cooperative-sticky",
  });

  await consumer.connect();
  await consumer.subscribe({ topics: ["notifications"]}, );
  await setupShutdown(consumer);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log("\n[STRING] Received message:");
      console.log(`   Topic: ${topic}`);
      console.log(`   Partition: ${partition}`);
      console.log(`   Offset: ${message.offset}`);
      console.log(`   Key: ${message.key?.toString()}`);
      console.log(`   Value: ${message.value?.toString()}`);
      console.log(`   Timestamp: ${message.timestamp}`);
      logHeaders(message.headers);
    },
  });
}

async function consumeJsonMessages() {
  console.log("JSON consumer starting");

  const consumer = kafka.consumer({
    kafkaJS: { groupId: `${KAFKA_CONFIG.groupId}-json` },
  });

  await consumer.connect();
  await consumer.subscribe({
    topics: ["user-events", "orders"],
  });
  await setupShutdown(consumer);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const rawValue = message.value?.toString();
      const value = rawValue ? JSON.parse(rawValue) : null;

      console.log("\n[JSON] Received message:");
      console.log(`   Topic: ${topic}`);
      console.log(`   Partition: ${partition}`);
      console.log(`   Offset: ${message.offset}`);
      console.log(`   Key: ${message.key?.toString()}`);
      console.log(`   Value: ${JSON.stringify(value, null, 2)}`);
      logHeaders(message.headers);

      if (topic === "user-events") {
        console.log(`   [Processing user event: ${value?.event}]`);
      } else if (topic === "orders") {
        console.log(
          `   [Processing order: ${value?.orderId} - ${value?.status}]`,
        );
      }
    },
  });
}

async function consumeAvroMessages() {
  console.log("Avro consumer starting");

  const consumer = kafka.consumer({
    kafkaJS: { groupId: `${KAFKA_CONFIG.groupId}-avro` },
  });

  await consumer.connect();
  await consumer.subscribe({ topics: ["products"], });
  await setupShutdown(consumer);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log("\n[AVRO] Received message:");
      console.log(`   Topic: ${topic}`);
      console.log(`   Partition: ${partition}`);
      console.log(`   Offset: ${message.offset}`);
      console.log(`   Key: ${message.key?.toString()}`);

      const schemaVersion =
        getHeader(message.headers, "schemaVersion") ?? "1.0.0";
      console.log(`   Schema Version: ${schemaVersion}`);
      logHeaders(message.headers);

      try {
        if (!message.value) {
          throw new Error("Missing Avro buffer payload");
        }
        const schema =
          schemaVersion === "2.0.0" ? PRODUCT_SCHEMA_V2 : PRODUCT_SCHEMA_V1;
        const value = schema.fromBuffer(message.value);
        console.log(`   Decoded Value: ${JSON.stringify(value, null, 2)}`);
        console.log(
          `   [Processing product: ${value.productId} - ${value.name}]`,
        );
      } catch (error) {
        console.error("   Failed to deserialize Avro message:", error);
      }
    },
  });
}

async function consumeMultipleTopics() {
  console.log("Multi-topic consumer starting");

  const consumer = kafka.consumer({
    kafkaJS: { groupId: `${KAFKA_CONFIG.groupId}-multi` },
  });

  await consumer.connect();
  await consumer.subscribe({
    topics: ["notifications", "user-events", "orders", "products"],
  });
  await setupShutdown(consumer);

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const contentType =
        getHeader(message.headers, "contentType") ?? "unknown";

      console.log("\n[MULTI] Received message:");
      console.log(`   Topic: ${topic}`);
      console.log(`   Partition: ${partition}`);
      console.log(`   Offset: ${message.offset}`);
      console.log(`   Key: ${message.key?.toString()}`);
      console.log(`   Content-Type: ${contentType}`);
      logHeaders(message.headers);

      try {
        if (contentType === "text/plain") {
          console.log(`   Value (string): ${message.value?.toString()}`);
        } else if (contentType === "application/json") {
          const jsonStr = message.value?.toString();
          const value = jsonStr ? JSON.parse(jsonStr) : null;
          console.log(`   Value (JSON): ${JSON.stringify(value, null, 2)}`);
        } else if (contentType === "application/avro") {
          const schemaVersion =
            getHeader(message.headers, "schemaVersion") ?? "1.0.0";
          if (!message.value) {
            throw new Error("Missing Avro buffer payload");
          }
          const schema =
            schemaVersion === "2.0.0" ? PRODUCT_SCHEMA_V2 : PRODUCT_SCHEMA_V1;
          const value = schema.fromBuffer(message.value);
          console.log(
            `   Value (Avro - Schema ${schemaVersion}): ${JSON.stringify(value, null, 2)}`,
          );
        } else {
          console.log("   Value (raw):", message.value);
        }
      } catch (error) {
        console.error("   Failed to deserialize message:", error);
      }
    },
  });
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  console.log("Kafka multi-format consumer (Confluent)");
  console.log(`Brokers: ${KAFKA_CONFIG.brokers.join(", ")}`);
  console.log(`Group ID: ${KAFKA_CONFIG.groupId}`);

  try {
    // Uncomment one of the following to test:

    // await consumeStringMessages();
    // await consumeJsonMessages();
    // await consumeAvroMessages();
    await consumeMultipleTopics();
  } catch (error) {
    console.error("Consumer failed:", error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
