import "dotenv/config";

import { KafkaJS } from "@confluentinc/kafka-javascript";

import { logger } from "@/config/logger.js";
import {
  usageEventsConsumerService,
  UsageEventsMessageValidationError,
} from "@/services/usage-events-consumer.service.js";
import { workerConfig } from "@/workers/config.js";

const { Kafka } = KafkaJS;

const workerId = process.env.WORKER_ID ?? process.pid.toString();
const consumerLogger = logger.child({
  workerId,
  role: "usage-events-consumer",
});

const kafka = new Kafka({
  kafkaJS: {
    clientId: `${workerConfig.kafka.clientId}-consumer-${workerId}`,
    brokers: workerConfig.kafka.brokers,
    ssl: workerConfig.kafka.ssl,
    ...(workerConfig.kafka.sasl ? { sasl: workerConfig.kafka.sasl } : {}),
  },
});

let processedMessages = 0;
let createdEvents = 0;
let duplicateEvents = 0;
let skippedInvalidMessages = 0;

function nextOffset(offset: string): string {
  return (BigInt(offset) + 1n).toString();
}

async function startConsumer(): Promise<void> {
  const consumer = kafka.consumer({
    kafkaJS: { groupId: workerConfig.kafka.groupId },
    "partition.assignment.strategy": "cooperative-sticky",
    "enable.auto.commit": false,
    "max.poll.interval.ms": 300000,
    "session.timeout.ms": 30000,
    "heartbeat.interval.ms": 3000,
  });

  await consumer.connect();
  await consumer.subscribe({ topics: [workerConfig.kafka.topic] });

  consumerLogger.info(
    {
      topic: workerConfig.kafka.topic,
      groupId: workerConfig.kafka.groupId,
      brokers: workerConfig.kafka.brokers,
    },
    "Kafka usage-events consumer connected",
  );

  await consumer.run({
    eachBatchAutoResolve: false,
    eachBatch: async ({ batch, heartbeat, isRunning, isStale }) => {
      if (!isRunning() || isStale()) {
        return;
      }

      for (const message of batch.messages) {
        if (!isRunning() || isStale()) {
          break;
        }

        const offsetToCommit = nextOffset(message.offset);
        const rawValue = message.value?.toString();

        if (!rawValue) {
          skippedInvalidMessages++;

          consumerLogger.warn(
            {
              topic: batch.topic,
              partition: batch.partition,
              offset: message.offset,
            },
            "Skipping Kafka message with empty value",
          );

          await consumer.commitOffsets([
            {
              topic: batch.topic,
              partition: batch.partition,
              offset: offsetToCommit,
            },
          ]);
          await heartbeat();
          continue;
        }

        try {
          const result =
            await usageEventsConsumerService.processRawMessage(rawValue);

          processedMessages++;
          if (result.created) {
            createdEvents++;
          } else {
            duplicateEvents++;
          }

          await consumer.commitOffsets([
            {
              topic: batch.topic,
              partition: batch.partition,
              offset: offsetToCommit,
            },
          ]);
          await heartbeat();
        } catch (error) {
          if (error instanceof UsageEventsMessageValidationError) {
            skippedInvalidMessages++;

            consumerLogger.warn(
              {
                topic: batch.topic,
                partition: batch.partition,
                offset: message.offset,
                error: error.message,
              },
              "Skipping invalid usage-events Kafka message",
            );

            await consumer.commitOffsets([
              {
                topic: batch.topic,
                partition: batch.partition,
                offset: offsetToCommit,
              },
            ]);
            await heartbeat();
            continue;
          }

          consumerLogger.error(
            {
              topic: batch.topic,
              partition: batch.partition,
              offset: message.offset,
              err: error,
            },
            "Failed processing usage-events Kafka message",
          );

          throw error;
        }
      }

      consumerLogger.info(
        {
          processedMessages,
          createdEvents,
          duplicateEvents,
          skippedInvalidMessages,
          partition: batch.partition,
          batchSize: batch.messages.length,
        },
        "Usage-events consumer batch processed",
      );
    },
  });

  const shutdown = async () => {
    consumerLogger.info(
      {
        processedMessages,
        createdEvents,
        duplicateEvents,
        skippedInvalidMessages,
      },
      "Shutting down usage-events consumer",
    );

    try {
      await consumer.disconnect();
    } catch (error) {
      consumerLogger.error({ err: error }, "Failed to disconnect consumer");
    }

    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  if (process.send) {
    process.send({ type: "ready", role: "consumer", pid: process.pid });
  }
}

startConsumer().catch((error) => {
  consumerLogger.fatal({ err: error }, "Usage-events consumer worker crashed");
  process.exit(1);
});
