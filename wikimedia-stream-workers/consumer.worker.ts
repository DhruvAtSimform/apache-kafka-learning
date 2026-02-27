/**
 * Consumer Worker
 * ===============
 * Runs in its own process (forked by the primary).
 * Each worker is a separate Kafka consumer in the same consumer group.
 * Kafka's cooperative-sticky rebalancing distributes partitions across workers.
 *
 * Uses eachBatch + OpenSearch bulk API for high-throughput indexing.
 *
 * Can also be run standalone: `npx tsx consumer.worker.ts`
 */

import { configDotenv } from "dotenv";
configDotenv();

import { KafkaJS } from "@confluentinc/kafka-javascript";
import { config } from "./config.js";
import { OpenSearchClient } from "./opensearch/index.js";

const { Kafka } = KafkaJS;

const workerId = process.env.WORKER_ID ?? process.pid.toString();

const kafka = new Kafka({
  kafkaJS: {
    clientId: `wikimedia-consumer-${workerId}`,
    brokers: config.kafka.brokers,
  },
});

const opensearch = new OpenSearchClient(
  config.opensearch.node,
  config.opensearch.password,
  config.opensearch.index,
);

// ── Metrics ──────────────────────────────────────────────
let totalBatches = 0;
let totalMessages = 0;
let totalIndexed = 0;
let totalErrors = 0;

function logMetrics(): void {
  console.log(
    `[consumer:${workerId}] Metrics — batches: ${totalBatches} | messages: ${totalMessages} | indexed: ${totalIndexed} | errors: ${totalErrors}`,
  );
}

// Log metrics every 30 seconds
const metricsInterval = setInterval(logMetrics, 30_000);

// ── Main ─────────────────────────────────────────────────
async function start(): Promise<void> {
  console.log(`[consumer:${workerId}] Starting...`);
  console.log(
    `[consumer:${workerId}] Brokers: ${config.kafka.brokers.join(", ")}`,
  );
  console.log(`[consumer:${workerId}] Topic: ${config.kafka.topic}`);
  console.log(`[consumer:${workerId}] Group: ${config.kafka.groupId}`);

  // Ensure the OpenSearch index exists before consuming
  await opensearch.ensureIndex();

  const consumer = kafka.consumer({
    kafkaJS: { groupId: config.kafka.groupId },
    "partition.assignment.strategy": "cooperative-sticky",
    "auto.commit.enable": true,
    "auto.commit.interval.ms": 5000,
    // Fetch tuning — pull larger batches from the broker
    "fetch.min.bytes": 1024, // wait for at least 1KB
    "fetch.wait.max.ms": 1000, // or 1000ms, whichever comes first
    "max.partition.fetch.bytes": 1048576, // 1 MB per partition
    // improtant to detect the consumer status incase processing takes a long time.
    // It could happens let's say if your database stall or hits the max conneciton, db locsk, etc. In those cases, 
    // the consumer will be marked as dead and trigger a rebalance, allowing other consumers to take over the partitions.
    // However the bottleneck is not consumer but the database, so it may not help much. 
    // Always good to fine tune or helath check your underline systems... if it is bound to take long time then you better set
    // health check and poll internval longer to avoid unnecessary rebalance/ auto kill and auto restarts by admin.
    // "max.poll.interval.ms": "5 minutes"
    // "heartbeat.interval.ms": 3000, // send heartbeats every 3s to avoid being considered dead
    // "session.timeout.ms": 10000, // if no heartbeat received in 10s, consider the consumer dead
  });

  await consumer.connect();
  await consumer.subscribe({ topics: [config.kafka.topic] });

  await consumer.run({
    eachBatch: async ({
      batch,
      resolveOffset,
      heartbeat,
      isRunning,
      isStale,
    }) => {
      if (!isRunning() || isStale()) return;

      totalBatches++;
      const batchSize = batch.messages.length;

      // ── Parse all messages in the batch ─────────────────
      const docs: Array<{ id: string; body: Record<string, unknown> }> = [];

      for (const message of batch.messages) {
        if (!isRunning() || isStale()) break;

        const rawValue = message.value?.toString();
        if (!rawValue) continue;

        try {
          const payload = JSON.parse(rawValue) as Record<string, unknown>;
          const meta = payload["meta"] as Record<string, unknown> | undefined;
          const id =
            (meta?.["id"] as string) ??
            `${batch.topic}-${batch.partition}-${message.offset}`;

          docs.push({ id, body: payload });
        } catch {
          totalErrors++;
          // Skip unparseable messages
        }
      }

      // ── Bulk-index to OpenSearch ────────────────────────
      if (docs.length > 0) {
        try {
          const result = await opensearch.bulkIndex(docs);
          totalIndexed += result.indexed;
          totalErrors += result.errors;
        } catch (error) {
          console.error(
            `[consumer:${workerId}] Bulk index failed for batch of ${docs.length}:`,
            error,
          );
          totalErrors += docs.length;
        }
      }

      // ── Resolve offset to the last message in the batch ─
      const lastMessage = batch.messages[batch.messages.length - 1];
      if (lastMessage) {
        resolveOffset(lastMessage.offset);
      }
      await heartbeat();

      totalMessages += batchSize;

      // Log per-batch summary (but not too noisy)
      if (totalBatches % 10 === 0) {
        console.log(
          `[consumer:${workerId}] Batch #${totalBatches}: ${batchSize} msgs, ${docs.length} indexed | partition=${batch.partition}`,
        );
      }
    },
  });

  // ── Graceful shutdown ──────────────────────────────────
  const shutdown = async () => {
    console.log(`[consumer:${workerId}] Shutting down...`);
    clearInterval(metricsInterval);
    logMetrics();
    try {
      await consumer.disconnect();
    } catch (error) {
      console.error(`[consumer:${workerId}] Disconnect error:`, error);
    }
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  // Notify primary that consumer is ready
  if (process.send) {
    process.send({ type: "ready", role: "consumer", pid: process.pid });
  }
}

start().catch((error) => {
  console.error(`[consumer:${workerId}] Fatal error:`, error);
  process.exit(1);
});
