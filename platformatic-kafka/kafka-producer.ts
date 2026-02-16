import {
  jsonSerializer,
  Producer,
  stringSerializers,
} from "@platformatic/kafka";
import avro from "avsc";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Kafka broker configuration
 * Using EXTERNAL listeners for host machine access
 */
const DEFAULT_BROKERS = ["127.0.0.1:9092", "127.0.0.1:9093"];
const CONFIGURED_BROKERS = (process.env.KAFKA_BROKERS ?? "")
  .split(",")
  .map((broker) => broker.trim())
  .filter(Boolean);

const KAFKA_CONFIG = {
  brokers: (CONFIGURED_BROKERS.length
    ? CONFIGURED_BROKERS
    : DEFAULT_BROKERS) as string[],
  clientId: "platformatic-multi-format-producer",
  requestTimeout: 30000,
  retries: 3,
};

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User event payload structure
 */
interface UserEvent {
  event: string;
  userId: string;
  timestamp: string;
}

/**
 * Order event payload structure
 */
interface OrderEvent {
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

/**
 * Product event payload structure for Avro
 */
interface ProductEvent {
  productId: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  updatedAt: string;
}

// ============================================================================
// Avro Schemas with Version Control
// ============================================================================

/**
 * Avro schema for Product events (Version 1)
 * @description Initial schema version for product events
 * @version 1.0.0
 */
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
    { name: "updatedAt", type: "string", default: new Date().toISOString() },
  ],
});

/**
 * Avro schema for Product events (Version 2)
 * @description Enhanced schema with additional fields
 * @version 2.0.0
 * @changes Added description and tags fields
 */
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
    { name: "updatedAt", type: "string", default: new Date().toISOString() },
    { name: "description", type: ["null", "string"], default: null },
    { name: "tags", type: { type: "array", items: "string" }, default: [] },
  ],
});

/**
 * Custom Avro serializer for value encoding
 * @param schema - Avro schema to use for serialization
 * @returns Serialized buffer
 */
function createAvroSerializer<T>(schema: avro.Type) {
  return (value: T | undefined): Buffer => {
    if (!value) {
      throw new Error("Cannot serialize undefined value");
    }
    return schema.toBuffer(value);
  };
}

/**
 * Custom Avro deserializer for value decoding
 * @param schema - Avro schema to use for deserialization
 * @returns Deserialized object
 */
function createAvroDeserializer<T>(schema: avro.Type) {
  return (buffer: Buffer): T => {
    return schema.fromBuffer(buffer);
  };
}

// ============================================================================
// Producer Configurations
// ============================================================================

/**
 * String Producer Configuration
 * @description Producer for sending simple string messages
 * Use case: Logging, simple events, text-based messages
 */
const stringProducer = new Producer({
  clientId: `${KAFKA_CONFIG.clientId}-string`,
  bootstrapBrokers: KAFKA_CONFIG.brokers,
  serializers: stringSerializers,
  requestTimeout: KAFKA_CONFIG.requestTimeout,
  retries: KAFKA_CONFIG.retries,
});

/**
 * JSON Producer Configuration
 * @description Producer for sending structured JSON messages
 * Use case: Complex objects, nested data, most common format
 */
const jsonProducer = new Producer({
  clientId: `${KAFKA_CONFIG.clientId}-json`,
  bootstrapBrokers: KAFKA_CONFIG.brokers,
  serializers: {
    key: stringSerializers.key,
    value: jsonSerializer<Record<string, any>>,
    headerKey: stringSerializers.headerKey,
    headerValue: stringSerializers.headerValue,
  },
  requestTimeout: KAFKA_CONFIG.requestTimeout,
  retries: KAFKA_CONFIG.retries,
});

/**
 * Avro Producer Configuration (Schema V1)
 * @description Producer for sending Avro-encoded messages with schema version 1
 * Use case: High-performance, schema evolution, type safety
 */
const avroProducerV1 = new Producer({
  clientId: `${KAFKA_CONFIG.clientId}-avro-v1`,
  bootstrapBrokers: KAFKA_CONFIG.brokers,
  serializers: {
    key: stringSerializers.key,
    value: createAvroSerializer<ProductEvent>(PRODUCT_SCHEMA_V1),
    headerKey: stringSerializers.headerKey,
    headerValue: stringSerializers.headerValue,
  },
  requestTimeout: KAFKA_CONFIG.requestTimeout,
  retries: KAFKA_CONFIG.retries,
});

/**
 * Avro Producer Configuration (Schema V2)
 * @description Producer for sending Avro-encoded messages with schema version 2
 * Use case: Enhanced schema with backward compatibility
 */
const avroProducerV2 = new Producer({
  clientId: `${KAFKA_CONFIG.clientId}-avro-v2`,
  bootstrapBrokers: KAFKA_CONFIG.brokers,
  serializers: {
    key: stringSerializers.key,
    value: createAvroSerializer<
      ProductEvent & { description?: string | null; tags?: string[] }
    >(PRODUCT_SCHEMA_V2),
    headerKey: stringSerializers.headerKey,
    headerValue: stringSerializers.headerValue,
  },
  requestTimeout: KAFKA_CONFIG.requestTimeout,
  retries: KAFKA_CONFIG.retries,
});

// ============================================================================
// Producer Functions
// ============================================================================

/**
 * Send a simple string message to Kafka
 * @param topic - Kafka topic name
 * @param key - Message key
 * @param value - String message value
 * @returns Promise that resolves when message is sent
 * @example
 * ```typescript
 * await sendStringMessage(
 *   "notifications",
 *   "notif-1",
 *   "User registration completed"
 * );
 * ```
 */
async function sendStringMessage(
  topic: string,
  key: string,
  value: string,
): Promise<void> {
  console.log(`\n📤 [STRING] Sending to topic: ${topic}`);
  console.log(`   Key: ${key}`);
  console.log(`   Value: ${value}`);

  await stringProducer.send({
    messages: [
      {
        topic,
        key,
        value,
        headers: {
          contentType: "text/plain",
          producer: "string-producer",
          timestamp: new Date().toISOString(),
        },
      },
    ],
    acks: 1,
  });

  console.log(`✅ [STRING] Successfully sent to ${topic}`);
}

/**
 * Send a JSON message to Kafka
 * @param topic - Kafka topic name
 * @param key - Message key
 * @param value - JSON object to send
 * @returns Promise that resolves when message is sent
 * @example
 * ```typescript
 * await sendJsonMessage("user-events", "user-123", {
 *   event: "user.login",
 *   userId: "user-123",
 *   timestamp: new Date().toISOString()
 * });
 * ```
 */
async function sendJsonMessage<T extends Record<string, any>>(
  topic: string,
  key: string,
  value: T,
): Promise<void> {
  console.log(`\n📤 [JSON] Sending to topic: ${topic}`);
  console.log(`   Key: ${key}`);
  console.log(`   Value: ${JSON.stringify(value, null, 2)}`);

  await jsonProducer.send({
    messages: [
      {
        topic,
        key,
        value,
        headers: {
          contentType: "application/json",
          producer: "json-producer",
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });

  console.log(`✅ [JSON] Successfully sent to ${topic}`);
}

/**
 * Send an Avro-encoded message to Kafka using Schema V1
 * @param topic - Kafka topic name
 * @param key - Message key
 * @param value - Product event object
 * @returns Promise that resolves when message is sent
 * @example
 * ```typescript
 * await sendAvroMessageV1("products", "prod-456", {
 *   productId: "prod-456",
 *   name: "Laptop",
 *   price: 999.99,
 *   category: "Electronics",
 *   inStock: true,
 *   updatedAt: new Date().toISOString()
 * });
 * ```
 */
async function sendAvroMessageV1(
  topic: string,
  key: string,
  value: ProductEvent,
): Promise<void> {
  console.log(`\n📤 [AVRO V1] Sending to topic: ${topic}`);
  console.log(`   Key: ${key}`);
  console.log(`   Value: ${JSON.stringify(value, null, 2)}`);
  console.log(`   Schema Version: 1.0.0`);

  await avroProducerV1.send({
    messages: [
      {
        topic,
        key,
        value,
        headers: {
          contentType: "application/avro",
          producer: "avro-producer-v1",
          schemaVersion: "1.0.0",
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });

  console.log(`✅ [AVRO V1] Successfully sent to ${topic}`);
}

/**
 * Send an Avro-encoded message to Kafka using Schema V2
 * @param topic - Kafka topic name
 * @param key - Message key
 * @param value - Enhanced product event object with optional fields
 * @returns Promise that resolves when message is sent
 * @example
 * ```typescript
 * await sendAvroMessageV2("products", "prod-789", {
 *   productId: "prod-789",
 *   name: "Smartphone",
 *   price: 799.99,
 *   category: "Electronics",
 *   inStock: true,
 *   updatedAt: new Date().toISOString(),
 *   description: "Latest model with advanced features",
 *   tags: ["5G", "flagship", "premium"]
 * });
 * ```
 */
async function sendAvroMessageV2(
  topic: string,
  key: string,
  value: ProductEvent & { description?: string | null; tags?: string[] },
): Promise<void> {
  console.log(`\n📤 [AVRO V2] Sending to topic: ${topic}`);
  console.log(`   Key: ${key}`);
  console.log(`   Value: ${JSON.stringify(value, null, 2)}`);
  console.log(`   Schema Version: 2.0.0`);

  await avroProducerV2.send({
    messages: [
      {
        topic,
        key,
        value,
        headers: {
          contentType: "application/avro",
          producer: "avro-producer-v2",
          schemaVersion: "2.0.0",
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });

  console.log(`✅ [AVRO V2] Successfully sent to ${topic}`);
}

/**
 * Close all producers gracefully
 */
async function closeProducers(): Promise<void> {
  console.log("\n🔌 Closing all producers...");
  await Promise.all([
    stringProducer.close(),
    jsonProducer.close(),
    avroProducerV1.close(),
    avroProducerV2.close(),
  ]);
  console.log("✅ All producers closed");
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Main function demonstrating all producer types
 */
async function runExamples(): Promise<void> {
  try {
    console.log("🚀 Kafka Multi-Format Producer Examples");
    console.log(`📍 Brokers: ${KAFKA_CONFIG.brokers.join(", ")}`);
    console.log("=".repeat(60));

    // Example 1: String Producer
    await sendStringMessage(
      "notifications",
      `notification-${Date.now()}`,
      "User registration completed successfully",
    );

    // Example 2: JSON Producer - User Event
    const userEvent: UserEvent = {
      event: "user.login",
      userId: "user-123",
      timestamp: new Date().toISOString(),
    };
    await sendJsonMessage("user-events", "user-123", userEvent);

    // Example 3: JSON Producer - Order Event
    const orderEvent: OrderEvent = {
      orderId: "order-456",
      customerId: "custom-789",
      amount: 1499.99,
      currency: "USD",
      status: "completed",
      createdAt: new Date().toISOString(),
    };
    await sendJsonMessage("orders", "order-456", orderEvent);

    // Example 4: Avro Producer V1
    const productV1: ProductEvent = {
      productId: "prod-001",
      name: "MacBook Pro",
      price: 2499.99,
      category: "Electronics",
      inStock: true,
      updatedAt: new Date().toISOString(),
    };
    await sendAvroMessageV1("products", "prod-001", productV1);

    // Example 5: Avro Producer V2 (with enhanced fields)
    const productV2 = {
      productId: "prod-002",
      name: "iPhone 15 Pro",
      price: 1199.99,
      category: "Electronics",
      inStock: true,
      updatedAt: new Date().toISOString(),
      description: "Latest flagship smartphone with A17 Pro chip",
      tags: ["5G", "flagship", "iOS"],
    };
    await sendAvroMessageV2("products", "prod-002", productV2);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 All examples completed successfully!");
  } catch (error) {
    console.error("\n❌ Producer failed:", error);
    throw error;
  } finally {
    await closeProducers();
  }
}

// Run examples
runExamples().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
