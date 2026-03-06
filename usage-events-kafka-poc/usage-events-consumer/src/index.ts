import "dotenv/config";

import cluster from "node:cluster";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { logger } from "@/config/logger.js";
import { workerConfig } from "@/workers/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isTsx = __filename.endsWith(".ts");
const consumerScript = isTsx
  ? "./workers/consumer.worker.ts"
  : "./workers/consumer.worker.js";
const workerExecArgv = isTsx ? process.execArgv : [];

const primaryLogger = logger.child({ role: "usage-events-consumer-primary" });

if (cluster.isPrimary) {
  cluster.setupPrimary({
    exec: path.join(__dirname, consumerScript),
    execArgv: workerExecArgv,
  });

  primaryLogger.info(
    {
      consumers: workerConfig.workers.consumers,
      topic: workerConfig.kafka.topic,
      groupId: workerConfig.kafka.groupId,
    },
    "Starting usage-events Kafka consumer workers",
  );

  for (
    let workerIndex = 0;
    workerIndex < workerConfig.workers.consumers;
    workerIndex++
  ) {
    const worker = cluster.fork({
      WORKER_ID: workerIndex.toString(),
      WORKER_ROLE: "consumer",
    });

    primaryLogger.info(
      { workerPid: worker.process.pid, workerIndex },
      "Forked usage-events consumer worker",
    );
  }

  cluster.on("exit", (worker, code, signal) => {
    primaryLogger.warn(
      {
        workerPid: worker.process.pid,
        code,
        signal,
      },
      "Usage-events consumer worker exited",
    );

    if (signal === "SIGINT" || signal === "SIGTERM" || code === 0) {
      return;
    }

    const replacement = cluster.fork({ WORKER_ROLE: "consumer" });
    primaryLogger.info(
      { workerPid: replacement.process.pid },
      "Forked replacement usage-events consumer worker",
    );
  });

  const shutdown = () => {
    primaryLogger.info("Shutting down usage-events consumer workers");
    for (const worker of Object.values(cluster.workers ?? {})) {
      worker?.process.kill("SIGTERM");
    }

    setTimeout(() => {
      primaryLogger.error("Force exiting consumer primary after timeout");
      process.exit(1);
    }, 15000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
