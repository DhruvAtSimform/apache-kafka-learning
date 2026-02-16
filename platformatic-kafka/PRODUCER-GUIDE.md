# Platformatic Kafka Multi-Format Producer Guide

Comprehensive Kafka producer implementation supporting multiple message formats: String, JSON, and Avro with schema version control.

## Features

- ✅ **String Producer**: Simple text-based messages
- ✅ **JSON Producer**: Structured data with type safety
- ✅ **Avro Producer**: Schema-based serialization with version control
- ✅ **Type Safety**: Full TypeScript support
- ✅ **JSDoc Documentation**: Comprehensive inline documentation
- ✅ **Example Usage**: Ready-to-use examples for all formats

## Installation

```bash
pnpm install
```

## Dependencies

- `@platformatic/kafka`: Kafka client for Node.js
- `avsc`: Avro schema serialization library

## Message Formats

### 1. String Producer

**Use Cases:**
- Simple logging messages
- Text notifications
- Lightweight events

**Example:**
```typescript
await sendStringMessage(
  "notifications",
  "notif-1",
  "User registration completed successfully"
);
```

**Headers:**
- `contentType`: "text/plain"
- `producer`: "string-producer"
- `timestamp`: ISO 8601 timestamp

---

### 2. JSON Producer

**Use Cases:**
- Complex structured data
- Nested objects
- Most common message format

**Supported Types:**
- `UserEvent`: User activity events
- `OrderEvent`: E-commerce order events
- Custom objects

**Example - User Event:**
```typescript
const userEvent: UserEvent = {
  event: "user.login",
  userId: "user-123",
  timestamp: new Date().toISOString()
};

await sendJsonMessage("user-events", "user-123", userEvent);
```

**Example - Order Event:**
```typescript
const orderEvent: OrderEvent = {
  orderId: "order-456",
  customerId: "cust-789",
  amount: 1499.99,
  currency: "USD",
  status: "completed",
  createdAt: new Date().toISOString()
};

await sendJsonMessage("orders", "order-456", orderEvent);
```

**Headers:**
- `contentType`: "application/json"
- `producer`: "json-producer"
- `timestamp`: ISO 8601 timestamp

---

### 3. Avro Producer

**Use Cases:**
- High-performance applications
- Schema evolution requirements
- Strong type validation
- Binary serialization for efficiency

**Schema Versions:**

#### Version 1.0.0 (Basic Product Schema)
```typescript
{
  productId: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  updatedAt: string;
}
```

**Example:**
```typescript
const product: ProductEvent = {
  productId: "prod-001",
  name: "MacBook Pro",
  price: 2499.99,
  category: "Electronics",
  inStock: true,
  updatedAt: new Date().toISOString()
};

await sendAvroMessageV1("products", "prod-001", product);
```

#### Version 2.0.0 (Enhanced Schema)
Adds optional fields with backward compatibility:
- `description` (optional string)
- `tags` (optional array of strings)

**Example:**
```typescript
const enhancedProduct = {
  productId: "prod-002",
  name: "iPhone 15 Pro",
  price: 1199.99,
  category: "Electronics",
  inStock: true,
  updatedAt: new Date().toISOString(),
  description: "Latest flagship smartphone",
  tags: ["5G", "flagship", "iOS"]
};

await sendAvroMessageV2("products", "prod-002", enhancedProduct);
```

**Headers:**
- `contentType`: "application/avro"
- `producer`: "avro-producer-v1" or "avro-producer-v2"
- `schemaVersion`: "1.0.0" or "2.0.0"
- `timestamp`: ISO 8601 timestamp

---

## Configuration

### Kafka Broker Configuration

```typescript
const KAFKA_CONFIG = {
  brokers: ["localhost:9092", "localhost:9093"],
  clientId: "platformatic-multi-format-producer",
  requestTimeout: 30000,
  retries: 3
};
```

### Producer Instances

The code creates separate producer instances for each format:
- `stringProducer`: For string messages
- `jsonProducer`: For JSON messages
- `avroProducerV1`: For Avro V1 messages
- `avroProducerV2`: For Avro V2 messages

---

## API Reference

### String Producer

#### `sendStringMessage(topic, key, value)`

Sends a simple string message to Kafka.

**Parameters:**
- `topic` (string): Kafka topic name
- `key` (string): Message key
- `value` (string): String message value

**Returns:** `Promise<void>`

**Example:**
```typescript
await sendStringMessage(
  "notifications",
  "notif-1",
  "User registration completed"
);
```

---

### JSON Producer

#### `sendJsonMessage<T>(topic, key, value)`

Sends a JSON message to Kafka with type safety.

**Type Parameters:**
- `T extends Record<string, any>`: Type of the JSON object

**Parameters:**
- `topic` (string): Kafka topic name
- `key` (string): Message key
- `value` (T): JSON object to send

**Returns:** `Promise<void>`

**Example:**
```typescript
const userEvent: UserEvent = {
  event: "user.login",
  userId: "user-123",
  timestamp: new Date().toISOString()
};
await sendJsonMessage("user-events", "user-123", userEvent);
```

---

### Avro Producer

#### `sendAvroMessageV1(topic, key, value)`

Sends an Avro-encoded message using Schema V1.

**Parameters:**
- `topic` (string): Kafka topic name
- `key` (string): Message key
- `value` (ProductEvent): Product event object

**Returns:** `Promise<void>`

**Example:**
```typescript
const product: ProductEvent = {
  productId: "prod-001",
  name: "MacBook Pro",
  price: 2499.99,
  category: "Electronics",
  inStock: true,
  updatedAt: new Date().toISOString()
};
await sendAvroMessageV1("products", "prod-001", product);
```

#### `sendAvroMessageV2(topic, key, value)`

Sends an Avro-encoded message using Schema V2 with enhanced fields.

**Parameters:**
- `topic` (string): Kafka topic name
- `key` (string): Message key
- `value` (ProductEvent & extras): Enhanced product object

**Returns:** `Promise<void>`

**Example:**
```typescript
const enhancedProduct = {
  productId: "prod-002",
  name: "iPhone 15 Pro",
  price: 1199.99,
  category: "Electronics",
  inStock: true,
  updatedAt: new Date().toISOString(),
  description: "Latest flagship smartphone",
  tags: ["5G", "flagship", "iOS"]
};
await sendAvroMessageV2("products", "prod-002", enhancedProduct);
```

---

## Running the Examples

```bash
# Install dependencies
pnpm install

# Development mode with hot reload
pnpm run dev

# Build TypeScript
pnpm run build

# Run compiled JavaScript
pnpm start
```

---

## Schema Evolution Best Practices

### Backward Compatibility

When evolving schemas, follow these rules:

1. **Add optional fields**: Use default values
2. **Don't remove fields**: Mark as deprecated instead
3. **Don't change field types**: Create new fields if needed
4. **Use unions for nullable**: `["null", "string"]`

### Version Control

Each schema version should:
- Have a unique version number (semver)
- Document changes in JSDoc comments
- Maintain backward compatibility
- Be tested with old and new consumers

### Example Migration (V1 → V2)

```typescript
// V1 Schema
{ name: "price", type: "double" }

// V2 Schema (backward compatible)
{
  name: "price",
  type: "double"
},
{
  name: "description",
  type: ["null", "string"],
  default: null  // Allows V1 messages to work
}
```

---

## Type Definitions

### UserEvent
```typescript
interface UserEvent {
  event: string;
  userId: string;
  timestamp: string;
}
```

### OrderEvent
```typescript
interface OrderEvent {
  orderId: string;
  customerId: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
}
```

### ProductEvent
```typescript
interface ProductEvent {
  productId: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  updatedAt: string;
}
```

---

## Error Handling

All producer functions include:
- Automatic retries (configurable)
- Request timeouts (30s default)
- Comprehensive error logging
- Graceful shutdown

**Example Error Handling:**
```typescript
try {
  await sendJsonMessage("topic", "key", data);
} catch (error) {
  console.error("Failed to send message:", error);
  // Handle error appropriately
}
```

---

## Performance Considerations

### String vs JSON vs Avro

| Format | Size | Speed | Schema | Use Case |
|--------|------|-------|--------|----------|
| String | Smallest for text | Fastest | None | Simple messages |
| JSON | Medium | Fast | Loose | General purpose |
| Avro | Smallest for objects | Very Fast | Strict | High throughput |

### Recommendations

- **Use String** for simple notifications and logs
- **Use JSON** for most application events (human-readable, flexible)
- **Use Avro** for high-volume events and when schema evolution is needed

### Batch Processing

For high throughput, consider batching messages:

```typescript
// Send multiple messages in one call
await jsonProducer.send({
  messages: [
    { topic: "events", key: "key1", value: data1 },
    { topic: "events", key: "key2", value: data2 },
    { topic: "events", key: "key3", value: data3 }
  ]
});
```

---

## Testing

### Prerequisites

1. **Kafka brokers** running on `localhost:9092` and `localhost:9093`
2. **Topics created** (or auto-creation enabled)
3. **Dependencies installed**: `pnpm install`

### Run Tests

```bash
# Run all examples
pnpm run dev

# The output will show:
# 📤 [STRING] Sending to topic: notifications
# ✅ [STRING] Successfully sent to notifications
# 📤 [JSON] Sending to topic: user-events
# ✅ [JSON] Successfully sent to user-events
# ...
```

### Verify Messages

Use kafka-console-consumer to verify:

```bash
# String messages
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic notifications --from-beginning

# JSON messages
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic user-events --from-beginning

# Avro messages (binary)
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic products --from-beginning
```

---

## Troubleshooting

### Common Issues

**1. Connection refused**
```
Error: connect ECONNREFUSED 127.0.0.1:9092
```
**Solution:** Verify Kafka brokers are running
```bash
docker-compose ps  # Check if Kafka containers are up
```

**2. Serialization errors**
```
Error: Invalid Avro schema
```
**Solution:** Verify data matches schema definition

**3. Timeout errors**
```
Error: Request timed out
```
**Solution:** 
- Increase `requestTimeout` value
- Check network connectivity
- Verify broker addresses

**4. Module not found**
```
Error: Cannot find module 'avsc'
```
**Solution:** Install dependencies
```bash
pnpm install
```

---

## Advanced Usage

### Custom Headers

Add custom headers to messages:

```typescript
await jsonProducer.send({
  messages: [{
    topic: "events",
    key: "key1",
    value: data,
    headers: {
      customHeader: "custom-value",
      userId: "user-123",
      traceId: "trace-abc-xyz"
    }
  }]
});
```

### Partitioning Strategy

Control message partitioning:

```typescript
// Explicit partition
await jsonProducer.send({
  messages: [{
    topic: "events",
    key: "key1",
    value: data,
    partition: 0  // Send to specific partition
  }]
});

// Key-based partitioning (default)
// Messages with same key go to same partition
await jsonProducer.send({
  messages: [{
    topic: "events",
    key: "user-123",  // All 'user-123' messages go to same partition
    value: data
  }]
});
```

### Compression

Enable compression for better network efficiency:

```typescript
const producer = new Producer({
  clientId: "my-producer",
  bootstrapBrokers: brokers,
  serializers: jsonSerializer<MyType>,
  compression: true  // Enable compression
});
```

---

## Code Organization

### Project Structure

```
platformatic-kafka/
├── kafka-producer.ts      # Main producer implementation
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── readme.md              # Library overview
└── PRODUCER-GUIDE.md      # This guide
```

### Code Sections

The `kafka-producer.ts` file is organized into sections:

1. **Configuration**: Broker settings and constants
2. **Type Definitions**: TypeScript interfaces
3. **Avro Schemas**: Schema definitions with version control
4. **Producer Configurations**: Producer instances
5. **Producer Functions**: Send functions with JSDoc
6. **Example Usage**: Demo code

---

## Future Enhancements

- [ ] Schema Registry integration (Confluent/Apicurio)
- [ ] Consumer examples
- [ ] Batch message support optimization
- [ ] Compression support documentation
- [ ] Metrics and monitoring integration
- [ ] Dead letter queue handling
- [ ] Transaction support
- [ ] Idempotent producer configuration

---

## Best Practices

### 1. Use Type Safety
```typescript
// ✅ Good: Type-safe
interface MyEvent {
  id: string;
  timestamp: string;
}
await sendJsonMessage<MyEvent>(topic, key, event);

// ❌ Bad: Untyped
await sendJsonMessage(topic, key, { id: 123, timestamp: Date.now() });
```

### 2. Handle Errors Properly
```typescript
// ✅ Good: Error handling
try {
  await sendMessage(topic, key, value);
} catch (error) {
  logger.error("Failed to send message", { error, topic, key });
  // Implement retry logic or dead letter queue
}

// ❌ Bad: No error handling
await sendMessage(topic, key, value);
```

### 3. Use Meaningful Keys
```typescript
// ✅ Good: Partition by entity
await sendJsonMessage("orders", `order-${orderId}`, orderData);

// ❌ Bad: Random keys break ordering
await sendJsonMessage("orders", UUID.random(), orderData);
```

### 4. Document Schema Changes
```typescript
/**
 * @version 2.0.0
 * @changes Added optional description field
 * @backward-compatible Yes
 */
const SCHEMA_V2 = avro.Type.forSchema({...});
```

---

## Resources

- [kafka-producer.ts](./kafka-producer.ts) - Main implementation
- [Platformatic Kafka Documentation](https://docs.platformatic.dev/)
- [Apache Avro Specification](https://avro.apache.org/docs/current/)
- [Kafka Protocol Guide](https://kafka.apache.org/protocol)
- [Avro Schema Evolution](https://docs.confluent.io/platform/current/schema-registry/avro.html)

---

## License

MIT

---

## Questions & Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [examples](#running-the-examples)
3. Open an issue on GitHub
4. Check Platformatic documentation

---

**Last Updated:** February 2026
