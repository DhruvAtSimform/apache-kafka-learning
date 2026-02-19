import {
  Consumer,
  stringDeserializers,
  jsonDeserializer,
} from "@platformatic/kafka";
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
  clientId: "platformatic-multi-format-consumer",
  groupId: "consumer-group-1",
};

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

/**
 * Create Avro deserializer
 */
function createAvroDeserializer(schema: avro.Type) {
  return (buffer: Buffer | undefined) => {
    if (!buffer) {
      throw new Error("Cannot deserialize undefined buffer");
    }
    return schema.fromBuffer(buffer);
  };
}

function bufferDeserializer(data: Buffer | undefined) {
  if (!data || !Buffer.isBuffer(data)) {
    return undefined;
  }
  return data;
}

// ============================================================================
// Consumer Examples
// ============================================================================

/**
 * String Consumer - Listens to notifications topic
 * @description Consumes simple string messages from notifications topic
 */
async function consumeStringMessages() {
  console.log("\n📥 [STRING CONSUMER] Starting...");
  console.log("   Listening on topic: notifications");

  const consumer = new Consumer({
    clientId: `${KAFKA_CONFIG.clientId}-string`,
    bootstrapBrokers: KAFKA_CONFIG.brokers,
    groupId: `${KAFKA_CONFIG.groupId}-string`,
    groupProtocol: "classic",
    deserializers: stringDeserializers,
  });

  const stream = await consumer.consume({
    topics: ["notifications"],
    mode: "earliest",
  });

  console.log("✅ [STRING CONSUMER] Running...");

  // Stream-based with async iterator
  for await (const message of stream) {
    const key = message.key?.toString();
    const value = message.value?.toString();
    const headers = message.headers;

    console.log(`\n📨 [STRING] Received message:`);
    console.log(`   Topic: ${message.topic}`);
    console.log(`   Partition: ${message.partition}`);
    console.log(`   Offset: ${message.offset}`);
    console.log(`   Key: ${key}`);
    console.log(`   Value: ${value}`);
    console.log(`   Timestamp: ${new Date(Number(message.timestamp))}`);
    if (headers) {
      console.log(`   Headers:`);
      for (const [k, v] of headers.entries()) {
        console.log(`      ${k}: ${v}`);
      }
    }
  }
}

/**
 * JSON Consumer - Listens to user-events and orders topics
 * @description Consumes structured JSON messages from multiple topics
 */
async function consumeJsonMessages() {
  console.log("\n📥 [JSON CONSUMER] Starting...");
  console.log("   Listening on topics: user-events, orders");

  const consumer = new Consumer({
    clientId: `${KAFKA_CONFIG.clientId}-json`,
    bootstrapBrokers: KAFKA_CONFIG.brokers,
    groupId: `${KAFKA_CONFIG.groupId}-json`,
    groupProtocol: "classic",
    deserializers: {
      key: stringDeserializers.key,
      value: jsonDeserializer<Record<string, any>>,
      headerKey: stringDeserializers.headerKey,
      headerValue: stringDeserializers.headerValue,
    },
  });

  const stream = await consumer.consume({
    topics: ["user-events", "orders"],
    mode: "earliest",
  });

  console.log("✅ [JSON CONSUMER] Running...");

  // Stream-based with async iterator
  for await (const message of stream) {
    const key = message.key?.toString();
    const value = message.value;
    const headers = message.headers;

    console.log(`\n📨 [JSON] Received message:`);
    console.log(`   Topic: ${message.topic}`);
    console.log(`   Partition: ${message.partition}`);
    console.log(`   Offset: ${message.offset}`);
    console.log(`   Key: ${key}`);
    console.log(`   Value:`, JSON.stringify(value, null, 2));
    if (headers) {
      console.log(`   Headers:`);
      for (const [k, v] of headers.entries()) {
        console.log(`      ${k}: ${v}`);
      }
    }

    // Type-safe processing based on topic
    if (message.topic === "user-events") {
      console.log(`   [Processing user event: ${value?.event}]`);
    } else if (message.topic === "orders") {
      console.log(
        `   [Processing order: ${value?.orderId} - ${value?.status}]`,
      );
    }
  }
}

/**
 * Avro Consumer - Listens to products topic
 * @description Consumes Avro-encoded messages with schema version detection
 */
async function consumeAvroMessages() {
  console.log("\n📥 [AVRO CONSUMER] Starting...");
  console.log("   Listening on topic: products");

  const consumer = new Consumer({
    clientId: `${KAFKA_CONFIG.clientId}-avro`,
    bootstrapBrokers: KAFKA_CONFIG.brokers,
    groupId: `${KAFKA_CONFIG.groupId}-avro`,
    groupProtocol: "classic",
    deserializers: {
      key: stringDeserializers.key,
      value: bufferDeserializer,
      headerKey: stringDeserializers.headerKey,
      headerValue: stringDeserializers.headerValue,
    },
  });

  const stream = await consumer.consume({
    topics: ["products"],
    mode: "earliest",
  });

  console.log("✅ [AVRO CONSUMER] Running...");

  // Stream-based with async iterator
  for await (const message of stream) {
    const key = message.key?.toString();
    const headers = message.headers;
    const schemaVersion = headers?.get("schemaVersion") || "1.0.0";
    const valueBuffer = message.value as Buffer | undefined;

    console.log(`\n📨 [AVRO] Received message:`);
    console.log(`   Topic: ${message.topic}`);
    console.log(`   Partition: ${message.partition}`);
    console.log(`   Offset: ${message.offset}`);
    console.log(`   Key: ${key}`);
    console.log(`   Schema Version: ${schemaVersion}`);
    if (headers) {
      console.log(`   Headers:`);
      for (const [k, v] of headers.entries()) {
        console.log(`      ${k}: ${v}`);
      }
    }

    // Deserialize based on schema version
    try {
      if (!valueBuffer) {
        throw new Error("Missing Avro buffer payload");
      }

      let value;
      if (schemaVersion === "2.0.0") {
        value = PRODUCT_SCHEMA_V2.fromBuffer(valueBuffer);
        console.log(`   [Using Schema V2]`);
      } else {
        value = PRODUCT_SCHEMA_V1.fromBuffer(valueBuffer);
        console.log(`   [Using Schema V1]`);
      }

      console.log(`   Decoded Value:`, JSON.stringify(value, null, 2));
      console.log(
        `   [Processing product: ${value.productId} - ${value.name}]`,
      );
    } catch (error) {
      console.error(`   ❌ Failed to deserialize Avro message:`, error);
    }
  }
}

/**
 * Multi-topic Consumer - Listens to all topics
 * @description Consumes from all topics with automatic format detection
 */
async function consumeMultipleTopics() {
  console.log("\n📥 [MULTI-TOPIC CONSUMER] Starting...");
  console.log(
    "   Listening on topics: notifications, user-events, orders, products",
  );

  const consumer = new Consumer({
    clientId: `${KAFKA_CONFIG.clientId}-multi`,
    bootstrapBrokers: KAFKA_CONFIG.brokers,
    groupId: `${KAFKA_CONFIG.groupId}-multi`,
    groupProtocol: "consumer",
    deserializers: {
      key: stringDeserializers.key,
      value: bufferDeserializer,
      headerKey: stringDeserializers.headerKey,
      headerValue: stringDeserializers.headerValue,
    }});


  const stream = await consumer.consume({
    topics: ["notifications", "user-events", "orders", "products"],
    mode: "latest",
  });

  console.log("✅ [MULTI-TOPIC CONSUMER] Running...");

  // Stream-based with async iterator
  for await (const message of stream) {
    const key = message.key?.toString();
    const headers = message.headers;
    const contentType = headers?.get("contentType") || "unknown";

    console.log(`\n📨 [MULTI] Received message:`);
    console.log(`   Topic: ${message.topic}`);
    console.log(`   Partition: ${message.partition}`);
    console.log(`   Offset: ${message.offset}`);
    console.log(`   Key: ${key}`);
    console.log(`   Content-Type: ${contentType}`);
    if (headers) {
      console.log(`   Headers:`);
      for (const [k, v] of headers.entries()) {
        console.log(`      ${k}: ${v}`);
      }
    }

    // Deserialize based on content type
    try {
      const valueBuffer = message.value as Buffer | undefined;
      if (contentType === "text/plain") {
        const value = valueBuffer?.toString();
        console.log(`   Value (string): ${value}`);
      } else if (contentType === "application/json") {
        const jsonStr = valueBuffer?.toString();
        const value = jsonStr ? JSON.parse(jsonStr) : null;
        console.log(`   Value (JSON):`, JSON.stringify(value, null, 2));
      } else if (contentType === "application/avro") {
        const schemaVersion = headers?.get("schemaVersion") || "1.0.0";
        if (!valueBuffer) {
          throw new Error("Missing Avro buffer payload");
        }
        const schema =
          schemaVersion === "2.0.0" ? PRODUCT_SCHEMA_V2 : PRODUCT_SCHEMA_V1;
        const value = schema.fromBuffer(valueBuffer);
        console.log(
          `   Value (Avro - Schema ${schemaVersion}):`,
          JSON.stringify(value, null, 2),
        );
      } else {
        console.log(`   Value (raw):`, message.value);
      }
    } catch (error) {
      console.error(`   ❌ Failed to deserialize message:`, error);
    }
  }
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Main function to run consumer examples
 * Uncomment the consumer you want to test
 */
async function main() {
  console.log("🚀 Kafka Multi-Format Consumer Examples");
  console.log(`📍 Brokers: ${KAFKA_CONFIG.brokers.join(", ")}`);
  console.log(`👥 Group ID: ${KAFKA_CONFIG.groupId}`);
  console.log("=".repeat(60));

  try {
    // Uncomment ONE of the following to test:

    // Option 1: String Consumer
    // await consumeStringMessages();

    // Option 2: JSON Consumer
    // await consumeJsonMessages();

    // Option 3: Avro Consumer
    // await consumeAvroMessages();

    // Option 4: Multi-topic Consumer (recommended for testing)
    await consumeMultipleTopics();

    console.log("\n✅ Consumer is running. Press Ctrl+C to stop.");
  } catch (error) {
    console.error("\n❌ Consumer failed:", error);
    process.exitCode = 1;
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down consumer...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down consumer...");
  process.exit(0);
});

// Run the consumer
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
