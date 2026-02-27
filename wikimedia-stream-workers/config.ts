/**
 * Shared configuration for all workers.
 * Loaded once per process after dotenv initializes.
 */

const rawBrokers = (process.env.KAFKA_BROKERS ?? "")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

export const config = {
  kafka: {
    brokers: rawBrokers.length
      ? rawBrokers
      : ["127.0.0.1:9092", "127.0.0.1:9093"],
    topic: process.env.WIKIMEDIA_TOPIC ?? "wikimedia-events",
    groupId:
      process.env.WIKIMEDIA_CONSUMER_GROUP_ID ?? "wikimedia-opensearch-group",
  },

  opensearch: {
    password: process.env.OPENSEARCH_PSWD ?? "P@ss*ad*4321",
    node: process.env.OPENSEARCH_NODE ?? "https://localhost:9200",
    index: process.env.OPENSEARCH_INDEX ?? "wikimedia",
  },

  wikimedia: {
    streamUrl:
      process.env.WIKIMEDIA_STREAM_URL ??
      "https://stream.wikimedia.org/v2/stream/recentchange",
  },

  workers: {
    consumers: parseInt(process.env.CONSUMER_WORKERS ?? "3", 10),
  },
} as const;
