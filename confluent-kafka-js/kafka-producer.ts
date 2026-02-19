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
  clientId: "confluent-multi-format-producer",
};

const { Kafka } = KafkaJS;
const kafka = new Kafka({
  kafkaJS: {
    clientId: KAFKA_CONFIG.clientId,
    brokers: KAFKA_CONFIG.brokers,
  },
});

// ============================================================================
// Type Definitions
// ============================================================================

interface UserEvent {
  event: string;
  userId: string;
  timestamp: string;
}

interface OrderEvent {
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}

interface ProductEvent {
  productId: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  updatedAt: string;
}

// ============================================================================
// Avro Schemas (must match consumer schemas)
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
    { name: "updatedAt", type: "string", default: new Date().toISOString() },
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
    { name: "updatedAt", type: "string", default: new Date().toISOString() },
    { name: "description", type: ["null", "string"], default: null },
    { name: "tags", type: { type: "array", items: "string" }, default: [] },
  ],
});

function createAvroSerializer<T>(schema: avro.Type) {
  return (value: T): Buffer => schema.toBuffer(value);
}

// ============================================================================
// Producer Functions
// ============================================================================

const producer = kafka.producer({
  "batch.size": 400, // keep it large in real production env to optimize throughput
});

async function sendStringMessage(
  topic: string,
  key: string,
  value: string,
): Promise<void> {
  console.log(`Sending string to ${topic}`);
  await producer.send({
    topic,
    messages: [
      {
        key,
        value,
        headers: {
          contentType: "text/plain",
          producer: "confluent-string-producer",
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });
}

async function sendJsonMessage<T extends object>(
  topic: string,
  key: string,
  value: T,
): Promise<void> {
  console.log(`Sending JSON to ${topic}`);
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: JSON.stringify(value),
        headers: {
          contentType: "application/json",
          producer: "confluent-json-producer",
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });
}

async function sendAvroMessageV1(
  topic: string,
  key: string,
  value: ProductEvent,
): Promise<void> {
  console.log(`Sending Avro V1 to ${topic}`);
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: createAvroSerializer<ProductEvent>(PRODUCT_SCHEMA_V1)(value),
        headers: {
          contentType: "application/avro",
          producer: "confluent-avro-producer-v1",
          schemaVersion: "1.0.0",
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });
}

async function sendAvroMessageV2(
  topic: string,
  key: string,
  value: ProductEvent & { description?: string | null; tags?: string[] },
): Promise<void> {
  console.log(`Sending Avro V2 to ${topic}`);
  await producer.send({
    topic,
    messages: [
      {
        key,
        value: createAvroSerializer<typeof value>(PRODUCT_SCHEMA_V2)(value),
        headers: {
          contentType: "application/avro",
          producer: "confluent-avro-producer-v2",
          schemaVersion: "2.0.0",
          timestamp: new Date().toISOString(),
        },
      },
    ],
  });
}

// ============================================================================
// Example Usage
// ============================================================================

async function runExamples(): Promise<void> {
  try {
    console.log("Kafka multi-format producer (Confluent)");
    console.log(`Brokers: ${KAFKA_CONFIG.brokers.join(", ")}`);

    await producer.connect();

    await sendStringMessage(
      "notifications",
      `notification-${Date.now()}`,
      "User registration completed successfully",
    );

    const userEvent: UserEvent = {
      event: "user.login",
      userId: "user-123",
      timestamp: new Date().toISOString(),
    };
    await sendJsonMessage("user-events", "user-123", userEvent);

    const orderEvent: OrderEvent = {
      orderId: "order-456",
      customerId: "customer-789",
      amount: 1499.99,
      currency: "USD",
      status: "completed",
      createdAt: new Date().toISOString(),
    };
    await sendJsonMessage("orders", "order-456", orderEvent);

    const productV1: ProductEvent = {
      productId: "prod-001",
      name: "MacBook Pro",
      price: 2499.99,
      category: "Electronics",
      inStock: true,
      updatedAt: new Date().toISOString(),
    };
    await sendAvroMessageV1("products", "prod-001", productV1);

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

    console.log("All producer examples completed");
  } catch (error) {
    console.error("Producer failed:", error);
    throw error;
  } finally {
    await producer.disconnect();
  }
}

runExamples().catch((error) => {
  console.error("Fatal error:", error);
  process.exitCode = 1;
});
