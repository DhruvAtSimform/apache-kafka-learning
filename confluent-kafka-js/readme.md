Confluent Kafka JavaScript (TypeScript) examples

This folder mirrors the multi-format producer/consumer setup from
platformatic-kafka, but uses Confluent's @confluentinc/kafka-javascript package
with the KafkaJS-compatible (promisified) API.

Files

- kafka-producer.ts: sends string, JSON, and Avro messages with headers
- kafka-consumer.ts: consumes per-format or multi-topic with header-based
  decoding

Install

1. cd confluent-kafka-js
2. pnpm install

Run

1. Start producer: pnpm dev
2. Start consumer: pnpm dev:consumer

Environment
KAFKA_BROKERS can be set as a comma-separated list (default is 127.0.0.1:9092,9093).

Notes vs platformatic-kafka

- Serialization is manual (strings, JSON.stringify, avro.toBuffer)
- Headers are plain objects (not a Map), so we normalize header values
- The consumer loop is driven by consumer.run with eachMessage callbacks

Reference

- https://www.npmjs.com/package/@confluentinc/kafka-javascript
- https://github.com/confluentinc/confluent-kafka-javascript
