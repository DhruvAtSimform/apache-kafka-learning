import { configDotenv } from "dotenv";

import { opensearchClient } from "./opensearch-client/index.js";
import { startWikimediaEventsConsumer } from "./consumers/wikimedia-events.consumer.js";
import { startWikimediaEventStream } from "./producers/wikimedia-events.stream.js";

configDotenv(); // Load environment variables from .env file

opensearchClient.ensureIndex().catch((error) => {
  console.error("Failed to ensure OpenSearch index:", error);
});

startWikimediaEventStream().catch((error) => {
  console.error("Wikimedia stream producer failed:", error);
  process.exitCode = 1;
});

startWikimediaEventsConsumer().catch((error) => {
  console.error("Wikimedia consumer failed:", error);
  process.exitCode = 1;
});
