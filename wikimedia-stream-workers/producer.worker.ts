/**
 * Producer Worker
 * ===============
 * Runs in its own process (forked by the primary).
 * Connects to the Wikimedia SSE stream and produces events into Kafka.
 *
 * Can also be run standalone: `npx tsx producer.worker.ts`
 */

import { configDotenv } from "dotenv";
configDotenv();

import EventSource from "eventsource";
import { KafkaJS } from "@confluentinc/kafka-javascript";
import { config } from "./config.js";

const { Kafka } = KafkaJS;

const kafka = new Kafka({
  kafkaJS: {
    clientId: `wikimedia-producer-${process.pid}`,
    brokers: config.kafka.brokers,
  },
});

const producer = kafka.producer({
  "enable.idempotence": true,
  acks: -1,
  "delivery.timeout.ms": 120000,
  "request.timeout.ms": 30000,
  retries: 2147483647,
  "max.in.flight.requests.per.connection": 5,
  "compression.type": "snappy",
  "linger.ms": 50,
  "batch.size": 32 * 1024,
});

let messageCount = 0;

async function start(): Promise<void> {
  console.log(`[producer:${process.pid}] Starting...`);
  console.log(
    `[producer:${process.pid}] Brokers: ${config.kafka.brokers.join(", ")}`,
  );
  console.log(`[producer:${process.pid}] Topic: ${config.kafka.topic}`);

  await producer.connect();

  const eventSource = new EventSource(config.wikimedia.streamUrl, {
    headers: {
      "User-Agent": "wikimedia-stream-workers/1.0 (kafka-journal project)",
      Accept: "text/event-stream",
    },
  });

  eventSource.onopen = () => {
    console.log(`[producer:${process.pid}] Connected to Wikimedia SSE stream`);
  };

  eventSource.onmessage = (message: MessageEvent) => {
    if (!message?.data) return;

    try {
      const payload = JSON.parse(message.data) as Record<string, unknown>;
      const meta = payload["meta"] as Record<string, unknown> | undefined;
      const eventKey = (meta?.["id"] as string) ?? `event-${Date.now()}`;

      // Fire-and-forget — the producer handles batching + retries internally
      void producer.send({
        topic: config.kafka.topic,
        messages: [
          {
            key: eventKey,
            value: message.data, // Already a JSON string, avoid re-stringify
            headers: {
              contentType: "text/json",
              producer: `wikimedia-producer-${process.pid}`,
              timestamp: new Date().toISOString(),
            },
          },
        ],
      });

      messageCount++;
      if (messageCount % 500 === 0) {
        console.log(
          `[producer:${process.pid}] Produced ${messageCount} events so far`,
        );
      }
    } catch (error) {
      console.error(
        `[producer:${process.pid}] Failed to process SSE event:`,
        error,
      );
    }
  };

  eventSource.onerror = (error) => {
    console.error(`[producer:${process.pid}] SSE stream error:`, error);
  };

  const shutdown = async () => {
    console.log(
      `[producer:${process.pid}] Shutting down... (${messageCount} total events produced)`,
    );
    eventSource.close();
    await producer.disconnect();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  // Notify primary that producer is ready
  if (process.send) {
    process.send({ type: "ready", role: "producer", pid: process.pid });
  }
}

start().catch((error) => {
  console.error(`[producer:${process.pid}] Fatal error:`, error);
  process.exit(1);
});
