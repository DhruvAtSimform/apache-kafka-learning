# Benchmarking & Validation Guide

**For testing Kafka clients locally** | February 16, 2026

---

## Overview

This guide helps you:

1. **Benchmark** both libraries with YOUR actual workload
2. **Validate** which performs better in YOUR environment
3. **Measure** metrics that matter (throughput, latency, memory)
4. **Document** results for team decision-making

---

## Prerequisites

```bash
# Install dependencies
cd platformatic-kafka && pnpm install
cd ../confluent-kafka-js && pnpm install

# Start local Kafka (using docker-compose)
# from kafka-journal/ root:
docker-compose -f conduktor-kafka-multiple.yml up

# Verify topics exist
kafka-topics --bootstrap-server localhost:9092 --list
```

---

## Benchmark 1: Throughput Test (Messages/Second)

### What We're Measuring

Maximum messages per second each library can produce/consume.

### Test Script: Producer Throughput

**File:** `benchmark-producer.ts`

```typescript
import { performance } from "perf_hooks";

/**
 * Test 1: Measure producer throughput (msgs/sec)
 * Change PACKAGE_NAME to test different libraries
 */

const PACKAGE_NAME = "platformatic"; // or 'confluent'
const MESSAGES_COUNT = 10_000;
const MESSAGE_SIZE = 1024; // 1KB

let producer;

async function setupProducer() {
  if (PACKAGE_NAME === "platformatic") {
    const { Producer } = await import("@platformatic/kafka");
    producer = new Producer({
      clientId: "benchmark-producer",
      bootstrapBrokers: ["127.0.0.1:9092", "127.0.0.1:9093"],
    });
  } else {
    const { Kafka } = await import("@confluentinc/kafka-javascript").then(
      (m) => m.KafkaJS,
    );
    const kafka = new Kafka({
      kafkaJS: {
        brokers: ["127.0.0.1:9092", "127.0.0.1:9093"],
      },
    });
    producer = kafka.producer();
  }
  await producer.connect();
}

async function benchmarkProducerThroughput() {
  const messages = Array.from({ length: MESSAGES_COUNT }, (_, i) => ({
    topic: "benchmark-topic",
    key: `key-${i}`,
    value: Buffer.alloc(MESSAGE_SIZE, `msg-${i}`),
  }));

  // Warm up
  await producer.send({ messages: messages.slice(0, 100) });

  // Actual benchmark
  const startTime = performance.now();

  // Send in batches to avoid timeout
  const batchSize = 1000;
  for (let i = 0; i < MESSAGES_COUNT; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    await producer.send({ messages: batch });
  }

  const endTime = performance.now();
  const durationMs = endTime - startTime;
  const throughput = (MESSAGES_COUNT / durationMs) * 1000; // msgs/sec

  console.log(`
✅ Producer Throughput Benchmark (${PACKAGE_NAME})
   Messages sent: ${MESSAGES_COUNT.toLocaleString()}
   Message size: ${MESSAGE_SIZE} bytes
   Total time: ${durationMs.toFixed(2)} ms
   Throughput: ${throughput.toFixed(2)} msgs/sec
   Rate: ${(throughput / 1000).toFixed(2)} K msgs/sec
  `);

  return {
    package: PACKAGE_NAME,
    messagesCount: MESSAGES_COUNT,
    messageSize: MESSAGE_SIZE,
    durationMs,
    throughputMsgsPerSec: throughput,
  };
}

async function main() {
  try {
    await setupProducer();
    const results = await benchmarkProducerThroughput();
    await producer.disconnect();
    console.log("\n" + JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

main();
```

### Running the Test

```bash
# Test Platformatic
cd platformatic-kafka
pnpm exec tsx benchmark-producer.ts

# Test Confluent (assuming in confluent-kafka-js folder)
cd ../confluent-kafka-js
pnpm exec tsx benchmark-producer.ts
```

### Expected Results (1KB messages)

```
Platformatic Kafka:
   Throughput: ~20,000-40,000 msgs/sec (depends on hardware)

Confluent JS:
   Throughput: ~25,000-50,000 msgs/sec (C optimization advantage)
```

### Record Your Results

```
Test Date: _________
Environment: [describe your machine CPU/RAM]
Kafka Version: [from broker logs]

PLATFORMATIC KAFKA
  Messages: 10,000
  Duration: _____ ms
  Throughput: _____ msgs/sec

CONFLUENT JS
  Messages: 10,000
  Duration: _____ ms
  Throughput: _____ msgs/sec

Winner: _________ by ___% margin
```

---

## Benchmark 2: Latency Test (Milliseconds)

### What We're Measuring

Time from sending to receiving (p50, p95, p99).

### Test Script: Latency Test

```typescript
import { performance } from "perf_hooks";

const PACKAGE_NAME = "platformatic"; // or 'confluent'
const MESSAGES_COUNT = 1000;
const MESSAGE_SIZE = 1024;

let producer, consumer;
const latencies: number[] = [];

async function setupProducerConsumer() {
  if (PACKAGE_NAME === "platformatic") {
    const { Producer, Consumer } = await import("@platformatic/kafka");

    producer = new Producer({
      clientId: "benchmark-producer-latency",
      bootstrapBrokers: ["127.0.0.1:9092"],
    });

    consumer = new Consumer({
      clientId: "benchmark-consumer-latency",
      bootstrapBrokers: ["127.0.0.1:9092"],
      groupId: "benchmark-latency-group",
    });
  } else {
    const { Kafka } = await import("@confluentinc/kafka-javascript").then(
      (m) => m.KafkaJS,
    );
    const kafka = new Kafka({
      kafkaJS: {
        brokers: ["127.0.0.1:9092", "127.0.0.1:9093"],
      },
    });

    producer = kafka.producer();
    consumer = kafka.consumer({
      kafkaJS: { groupId: "benchmark-latency-group" },
    });
  }

  await producer.connect();
  await consumer.connect();
}

async function benchmarkLatency() {
  // Subscribe to topic
  await consumer.subscribe({
    topics: ["latency-test-topic"],
    fromBeginning: true,
  });

  // Start consumer in background
  let receivedCount = 0;
  const consumerPromise = consumer.run({
    eachMessage: async ({ message }) => {
      const timestamp = Buffer.from(
        message.value as unknown as Buffer,
      ).toString();
      const sentTime = parseInt(timestamp);
      const receivedTime = performance.now();
      const latency = receivedTime - sentTime;
      latencies.push(latency);
      receivedCount++;

      if (receivedCount >= MESSAGES_COUNT) {
        return; // Stop consuming
      }
    },
  });

  // Give consumer time to join group
  await new Promise((r) => setTimeout(r, 2000));

  // Send messages with timestamp
  console.log(`Sending ${MESSAGES_COUNT} messages...`);
  for (let i = 0; i < MESSAGES_COUNT; i++) {
    const timestamp = performance.now().toString();
    await producer.send({
      messages: [
        {
          topic: "latency-test-topic",
          key: `latency-${i}`,
          value: timestamp,
        },
      ],
    });

    // Small delay to allow consumer to process
    if (i % 100 === 0) await new Promise((r) => setTimeout(r, 10));
  }

  // Wait for all messages
  await new Promise((r) => setTimeout(r, 5000));

  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(MESSAGES_COUNT * 0.5)];
  const p95 = latencies[Math.floor(MESSAGES_COUNT * 0.95)];
  const p99 = latencies[Math.floor(MESSAGES_COUNT * 0.99)];
  const avg = latencies.reduce((a, b) => a + b, 0) / MESSAGES_COUNT;

  console.log(`
✅ Latency Benchmark (${PACKAGE_NAME})
   Messages tested: ${MESSAGES_COUNT}
   Average: ${avg.toFixed(2)} ms
   P50: ${p50.toFixed(2)} ms
   P95: ${p95.toFixed(2)} ms
   P99: ${p99.toFixed(2)} ms
   `);

  return {
    package: PACKAGE_NAME,
    avg,
    p50,
    p95,
    p99,
  };
}

async function main() {
  try {
    await setupProducerConsumer();
    const results = await benchmarkLatency();
    await producer.disconnect();
    await consumer.disconnect();
    console.log("\n" + JSON.stringify(results, null, 2));
  } catch (error) {
    console.error("Benchmark failed:", error);
    process.exit(1);
  }
}

main();
```

### Record Your Results

```
LATENCY TEST RESULTS

PLATFORMATIC KAFKA
  P50: _____ ms
  P95: _____ ms
  P99: _____ ms
  Avg: _____ ms

CONFLUENT JS
  P50: _____ ms
  P95: _____ ms
  P99: _____ ms
  Avg: _____ ms

Analysis:
  - P50 similar? [true/false]
  - P99 within SLA? [true/false]
  - Acceptable for your use case? [true/false]
```

---

## Benchmark 3: Memory Usage

### What We're Measuring

Heap memory used during sustained load.

### Test Script: Memory Profile

```typescript
async function profileMemoryUsage() {
  const DURATION_MS = 60_000; // 1 minute
  const SEND_INTERVAL_MS = 100; // Send message every 100ms

  console.log("Memory profiling for", PACKAGE_NAME);

  // Initial heap
  if (global.gc) global.gc(); // Force GC
  const heapBefore = process.memoryUsage().heapUsed / 1024 / 1024; // MB

  const startTime = Date.now();
  let messageCount = 0;

  // Send messages while recording memory
  const interval = setInterval(async () => {
    try {
      await producer.send({
        messages: [
          {
            topic: "memory-test",
            value: Buffer.alloc(1024, "x"),
          },
        ],
      });
      messageCount++;
    } catch (e) {
      // Ignore
    }
  }, SEND_INTERVAL_MS);

  // Collect memory samples
  const samples: number[] = [];
  const sampleInterval = setInterval(() => {
    const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024;
    samples.push(heapUsed);
  }, 1000);

  // Wait for duration
  await new Promise((r) => setTimeout(r, DURATION_MS));

  clearInterval(interval);
  clearInterval(sampleInterval);

  const heapAfter = process.memoryUsage().heapUsed / 1024 / 1024;
  const peakMemory = Math.max(...samples);
  const avgMemory = samples.reduce((a, b) => a + b) / samples.length;

  console.log(`
✅ Memory Profile (${PACKAGE_NAME})
   Duration: ${DURATION_MS}ms
   Messages sent: ${messageCount}
   Heap before: ${heapBefore.toFixed(2)} MB
   Heap after: ${heapAfter.toFixed(2)} MB
   Average: ${avgMemory.toFixed(2)} MB
   Peak: ${peakMemory.toFixed(2)} MB
   Growth: ${(heapAfter - heapBefore).toFixed(2)} MB
  `);

  return {
    package: PACKAGE_NAME,
    heapBefore,
    heapAfter,
    peakMemory,
    avgMemory,
    growth: heapAfter - heapBefore,
  };
}
```

### Record Your Results

```
MEMORY USAGE TEST

PLATFORMATIC KAFKA
  Peak memory: _____ MB
  Average memory: _____ MB
  Growth: _____ MB

CONFLUENT JS
  Peak memory: _____ MB
  Average memory: _____ MB
  Growth: _____ MB

Assessment:
  - Memory leak detected? [yes/no]
  - Peak acceptable? [yes/no]
```

---

## Benchmark 4: Concurrency Test

### What We're Measuring

Behavior with multiple concurrent consumers/producers.

### Test: 5 concurrent consumers

```typescript
async function testConcurrency() {
  const CONSUMER_COUNT = 5;
  const MESSAGE_COUNT = 1000;

  console.log(`Testing ${CONSUMER_COUNT} concurrent consumers...`);

  // Create consumers
  const consumers = Array.from({ length: CONSUMER_COUNT }, (_, i) => {
    if (PACKAGE_NAME === "platformatic") {
      return new Consumer({
        clientId: `concurrent-consumer-${i}`,
        bootstrapBrokers: ["127.0.0.1:9092"],
        groupId: "concurrent-test",
      });
    } else {
      const { Kafka } = require("@confluentinc/kafka-javascript").KafkaJS;
      const kafka = new Kafka({
        kafkaJS: { brokers: ["127.0.0.1:9092"] },
      });
      return kafka.consumer({
        kafkaJS: { groupId: "concurrent-test" },
      });
    }
  });

  // Connect all
  await Promise.all(consumers.map((c) => c.connect()));

  // Subscribe all
  await Promise.all(
    consumers.map((c) =>
      c.subscribe({ topics: ["concurrent-test"], fromBeginning: false }),
    ),
  );

  const startTime = performance.now();
  let totalMessages = 0;

  // Start all consumers
  await Promise.all(
    consumers.map((c) =>
      c.run({
        eachMessage: async () => {
          totalMessages++;
          if (totalMessages >= MESSAGE_COUNT) {
            return;
          }
        },
      }),
    ),
  );

  // Produce test messages
  for (let i = 0; i < MESSAGE_COUNT / CONSUMER_COUNT; i++) {
    await producer.send({
      messages: [
        {
          topic: "concurrent-test",
          value: `message-${i}`,
        },
      ],
    });
  }

  // Wait for consumption
  await new Promise((r) => setTimeout(r, 5000));

  const endTime = performance.now();
  const durationMs = endTime - startTime;

  console.log(`
✅ Concurrency Test (${PACKAGE_NAME})
   Consumers: ${CONSUMER_COUNT}
   Total processed: ${totalMessages}
   Duration: ${durationMs.toFixed(2)} ms
   Throughput: ${((totalMessages / durationMs) * 1000).toFixed(2)} msgs/sec
  `);

  // Cleanup
  await Promise.all(consumers.map((c) => c.disconnect()));
}
```

---

## Full Benchmark Suite Script

Combine all tests:

```typescript
import { performance } from "perf_hooks";

async function runFullBenchmarkSuite() {
  console.log("========================================");
  console.log("KAFKA CLIENT BENCHMARK SUITE");
  console.log("========================================\n");

  const results = {
    platformatic: {},
    confluent: {},
  };

  for (const pkg of ["platformatic", "confluent"]) {
    console.log(`\n📊 Testing ${pkg.toUpperCase()}\n`);

    // Setup
    // ... setup code ...

    // Test 1: Throughput
    results[pkg].throughput = await benchmarkProducerThroughput();

    // Test 2: Latency
    results[pkg].latency = await benchmarkLatency();

    // Test 3: Memory
    results[pkg].memory = await profileMemoryUsage();

    // Test 4: Concurrency
    results[pkg].concurrency = await testConcurrency();

    // Cleanup
    // ... cleanup code ...
  }

  // Print summary
  console.log("\n========================================");
  console.log("BENCHMARK SUMMARY");
  console.log("========================================\n");

  console.log(JSON.stringify(results, null, 2));

  // Save to file
  const fs = await import("fs").then((m) => m.promises);
  await fs.writeFile(
    `benchmark-results-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(results, null, 2),
  );

  console.log("\n✅ Results saved to file");
}

runFullBenchmarkSuite();
```

---

## Analysis & Interpretation

### Interpreting Results

```
Throughput:
  - Confluent > Platformatic by 20%? Normal (C optimization)
  - Platformatic > Confluent? Something unusual, investigate
  - Either < 5K msgs/sec? Check broker/network

Latency:
  - P99 < 10ms? Excellent (acceptable for most use cases)
  - P99 > 50ms? Potential issue, check network
  - Large gap between P50 and P99? GC pauses, acceptable

Memory:
  - Growing over time? Potential leak
  - Peak > 500MB? High for single producer/consumer
  - Stable? Good behavior

Concurrency:
  - Linear scaling? Good
  - Sub-linear? Expected (contention)
  - Degradation? Check consumer lag
```

### Decision Based on Results

```
If Platformatic achieves ✅:
  - Throughput >= 80% of requirement
  - P99 latency <= SLA
  - Memory < 200MB
  - Scales linearly with consumers
  → SAFE to use Platformatic

If Confluent needed for ✅:
  - Throughput > 50K msgs/sec consistently
  - P99 < 5ms non-negotiable
  - Memory critical constraint impossible to meet
  → MUST use Confluent JS
```

---

## Real-World Workload Test

Don't just test synthetic workloads. Test YOUR workload:

```typescript
/**
 * Test with YOUR actual message size and format
 */

const REALISTIC_CONFIG = {
  messageSize: 5 * 1024, // 5KB (your average)
  format: 'json', // or 'avro', 'protobuf'
  batchSize: 500,
  duration: 300_000, // 5 minutes
  parallelConsumers: 3,
};

async function testRealisticWorkload() {
  // Use actual message structure
  const message = {
    userId: 'user-12345',
    timestamp: new Date().toISOString(),
    event: 'user.purchase',
    data: {
      productId: 'prod-456',
      amount: 99.99,
      currency: 'USD',
      metadata: { ... },
    },
  };

  // Test with your actual size
  const serialized = JSON.stringify(message);
  console.log(`Real message size: ${serialized.length} bytes`);

  // Run benchmark
  await benchmarkWithRealWorkload(serialized);
}
```

---

## Reporting Results

### Template for Team

```markdown
# Kafka Client Benchmark Report

**Date:** [date]
**Tester:** [name]
**Environment:** [CPU/RAM/OS]

## Test Configuration

- Messages: 10,000
- Size: 1KB
- Brokers: 2
- Duration: [X minutes]

## Results Summary

| Metric                    | Platformatic | Confluent  | Winner |
| ------------------------- | ------------ | ---------- | ------ |
| Throughput                | X msgs/sec   | Y msgs/sec | [X/Y]  |
| P50 Latency               | X ms         | Y ms       | [X/Y]  |
| P99 Latency               | X ms         | Y ms       | [X/Y]  |
| Peak Memory               | X MB         | Y MB       | [X/Y]  |
| Concurrency (5 consumers) | X msgs/sec   | Y msgs/sec | [X/Y]  |

## Analysis

- Platformatic performance: [satisfactory/needs investigation]
- Confluent performance: [expected/better than expected]
- Recommendation: [Platformatic/Confluent]

## Details

[Include JSON results file]
```

---

## Benchmark Best Practices

✅ **Do:**

- [ ] Run tests multiple times (3x minimum)
- [ ] Use actual message sizes from production
- [ ] Test with YOUR exact broker configuration
- [ ] Record environment details (CPU model, RAM, OS)
- [ ] Test under realistic network conditions
- [ ] Document all configuration changes

❌ **Don't:**

- [ ] Benchmark once and decide
- [ ] Use tiny messages (unrealistic)
- [ ] Run on saturated system
- [ ] Mix different configurations
- [ ] Before/after GC in same test
- [ ] Trust synthetic benchmarks alone

---

## Repeatability

Save your test setup:

```bash
# Makefile for benchmarks
benchmark-throughput:
	cd platformatic-kafka && pnpm exec tsx benchmark-producer.ts
	cd confluent-kafka-js && pnpm exec tsx benchmark-producer.ts

benchmark-latency:
	cd platformatic-kafka && pnpm exec tsx benchmark-latency.ts
	cd confluent-kafka-js && pnpm exec tsx benchmark-latency.ts

benchmark-all:
	$(MAKE) benchmark-throughput
	$(MAKE) benchmark-latency

# Run same way each time:
# make benchmark-all
```

---

## Final Validation

After benchmarking, verify readiness:

```
[ ] Tested with YOUR message size
[ ] Tested with YOUR throughput requirement
[ ] Tested with YOUR broker configuration
[ ] Results consistent across 3+ runs
[ ] Performance gap < 30% (smaller = easier to justify)
[ ] Memory behavior acceptable
[ ] Team reviewed and understood results
[ ] Created baseline for future comparisons
[ ] Documented in decision record (ADR)
```

---

**Ready to benchmark?** Pick a test above and start measuring!

**Having issues?** Check [PRODUCTION-CHECKLIST.md](./PRODUCTION-CHECKLIST.md) Runbook section.
