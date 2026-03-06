import type { Server } from "node:http";

import { app } from "@/app.js";
import { env } from "@/config/env.js";
import { logger } from "@/config/logger.js";
import { usageEventsProducer } from "@/infrastructure/kafka/usage-events.producer.js";

export async function startServer(): Promise<Server> {
  await usageEventsProducer.connect();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Usage Event API server started");
  });

  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    logger.info("Shutting down Usage Event API server");

    try {
      await usageEventsProducer.disconnect();
    } catch (error) {
      logger.error({ err: error }, "Failed to disconnect Kafka producer");
    }

    server.close((error) => {
      if (error) {
        logger.error({ err: error }, "Server shutdown failed");
        process.exitCode = 1;
        return;
      }

      logger.info("Server stopped gracefully");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}
