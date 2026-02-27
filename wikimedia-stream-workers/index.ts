/**
 * Primary Process — Multi-Worker Wikimedia Stream Application
 * ============================================================
 *
 * Architecture:
 *   Primary (this file)
 *     ├── fork 1× producer.worker.ts   → Wikimedia SSE → Kafka
 *     ├── fork N× consumer.worker.ts   → Kafka eachBatch → OpenSearch bulk
 *     └── monitors health & restarts crashed workers
 *
 * Each consumer runs as a separate OS process with its own event loop,
 * eliminating the single-thread bottleneck of the original app.
 * All consumers join the same Kafka consumer group, so Kafka automatically
 * distributes partitions across them via cooperative-sticky rebalancing.
 *
 * Usage:
 *   npx tsx index.ts          # dev mode
 *   node dist/index.js        # after `npm run build`
 */

import { configDotenv } from "dotenv";
configDotenv();

import cluster from "node:cluster";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONSUMER_COUNT = parseInt(process.env.CONSUMER_WORKERS ?? "3", 10);

// Detect if we're running via tsx (dev) or compiled JS (prod)
const isTsx = __filename.endsWith(".ts");
const producerScript = isTsx ? "producer.worker.ts" : "producer.worker.js";
const consumerScript = isTsx ? "consumer.worker.ts" : "consumer.worker.js";

interface WorkerMeta {
  role: "producer" | "consumer";
  id: number;
}

const workerMeta = new Map<number, WorkerMeta>();

function forkWorker(role: "producer" | "consumer", id: number): void {
  const script = role === "producer" ? producerScript : consumerScript;
  const scriptPath = path.join(__dirname, script);

  const worker = cluster.fork({
    // Pass worker identity via env
    WORKER_ID: `${role}-${id}`,
    WORKER_ROLE: role,
  });

  // cluster.fork runs the same entry file by default.
  // We use cluster.setupPrimary to change the exec path per-fork,
  // but since setupPrimary applies globally, we use a workaround:
  // set env vars and handle in worker detection below.

  workerMeta.set(worker.process.pid!, { role, id });

  worker.on("message", (msg: { type: string; role: string; pid: number }) => {
    if (msg.type === "ready") {
      console.log(`[primary] ${msg.role} worker (pid: ${msg.pid}) is ready`);
    }
  });

  console.log(
    `[primary] Forked ${role} worker #${id} (pid: ${worker.process.pid})`,
  );
}

// ── Primary Process ──────────────────────────────────────
if (cluster.isPrimary) {
  console.log(`[primary] PID: ${process.pid}`);
  console.log(
    `[primary] Spawning 1 producer + ${CONSUMER_COUNT} consumer workers`,
  );
  console.log("─".repeat(60));

  // Fork producer
  cluster.setupPrimary({
    exec: path.join(__dirname, producerScript),
    // When using tsx, we need execArgv to be empty to avoid conflicts
    execArgv: [],
  });
  forkWorker("producer", 0);

  // Fork consumers
  cluster.setupPrimary({
    exec: path.join(__dirname, consumerScript),
    execArgv: [],
  });
  for (let i = 0; i < CONSUMER_COUNT; i++) {
    forkWorker("consumer", i);
  }

  // ── Auto-restart crashed workers ────────────────────────
  cluster.on("exit", (worker, code, signal) => {
    const meta = workerMeta.get(worker.process.pid!);
    const label = meta ? `${meta.role} #${meta.id}` : "unknown";

    console.warn(
      `[primary] Worker ${label} (pid: ${worker.process.pid}) exited ` +
        `(code: ${code}, signal: ${signal})`,
    );

    workerMeta.delete(worker.process.pid!);

    // Restart unless it was a clean shutdown (SIGINT/SIGTERM)
    if (signal !== "SIGINT" && signal !== "SIGTERM" && code !== 0) {
      console.log(`[primary] Restarting ${label}...`);

      const script =
        meta?.role === "producer" ? producerScript : consumerScript;
      cluster.setupPrimary({
        exec: path.join(__dirname, script),
        execArgv: [],
      });
      forkWorker(meta?.role ?? "consumer", meta?.id ?? 0);
    }
  });

  // ── Graceful shutdown ──────────────────────────────────
  const shutdown = () => {
    console.log("\n[primary] Shutting down all workers...");
    for (const id in cluster.workers) {
      cluster.workers[id]?.process.kill("SIGTERM");
    }

    // Force exit after 10s if workers don't shut down cleanly
    setTimeout(() => {
      // count current alive workers before logging
      const aliveWorkers = Object.values(cluster.workers || {}).filter(
        (w) => w?.isConnected(),
      ).length;
      console.log(
        `[primary] Force exiting after timeout. Alive workers: ${aliveWorkers}`,
      );  
      console.log("[primary] Force exiting after timeout");
      process.exit(1);
    }, 20_000).unref();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
