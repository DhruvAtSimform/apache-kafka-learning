# Wikimedia Stream Workers

A multi-process Node.js application that ingests Wikimedia's real-time event stream via Kafka and indexes it into OpenSearch. Built with **Node.js `cluster` module** to overcome the limitations of a single-threaded architecture.

## Why This Exists

The original [`wikimedia-stream`](../wikimedia-stream/) project runs everything — SSE ingestion, Kafka producing, Kafka consuming, and OpenSearch indexing — inside a **single Node.js process**. That works for a proof-of-concept, but falls apart under real load:

| Problem             | Single-Process                                                                                          | Multi-Worker                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **CPU bound**       | One event-loop handles producing + consuming + indexing — a slow OpenSearch bulk call blocks everything | Each worker runs in its own OS process with its own event loop                     |
| **No parallelism**  | Only one consumer, limited to sequential `eachMessage`                                                  | N consumers process partitions in parallel via `eachBatch`                         |
| **Fault isolation** | One crash kills the entire pipeline                                                                     | Primary auto-restarts crashed workers; healthy workers keep running                |
| **Scalability**     | Vertical only (bigger machine)                                                                          | Horizontal — add more consumer workers to match partition count                    |
| **Backpressure**    | Producer and consumer compete for the same event loop                                                   | Producer runs independently; consumers can fall behind without affecting ingestion |

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Primary Process (index.ts)               │
│         Orchestrator — forks workers, monitors health        │
│                                                              │
│   ┌──────────────┐   ┌────────────┐ ┌────────────┐          │
│   │   Producer    │   │ Consumer 0 │ │ Consumer 1 │  ...     │
│   │   Worker      │   │   Worker   │ │   Worker   │          │
│   │  (1 process)  │   │ (process)  │ │ (process)  │          │
│   └──────┬───────┘   └─────┬──────┘ └─────┬──────┘          │
└──────────┼─────────────────┼──────────────┼──────────────────┘
           │                 │              │
           ▼                 ▼              ▼
  Wikimedia SSE ──→ Kafka Topic ──→ OpenSearch Index
  (EventSource)    (partitioned)    (_bulk API)
```

### Primary Process — `index.ts`

The orchestrator. It never touches Kafka or OpenSearch directly. Its responsibilities:

- **Forks 1 producer worker** and **N consumer workers** (default 3, configurable via `CONSUMER_WORKERS` env var)
- Uses `cluster.setupPrimary()` to point each fork at the correct script (`producer.worker.ts` or `consumer.worker.ts`)
- **Auto-restarts crashed workers** — if a worker exits with a non-zero code and wasn't killed by SIGINT/SIGTERM, the primary re-forks it
- **Graceful shutdown** — on SIGINT/SIGTERM, sends SIGTERM to all children and force-exits after a 20s timeout

### Producer Worker — `producer.worker.ts`

A single process that:

1. Opens an SSE connection to `https://stream.wikimedia.org/v2/stream/recentchange`
2. Parses each event and produces it to the `wikimedia-events` Kafka topic
3. Uses **idempotent producing** (`enable.idempotence: true`, `acks: -1`) for exactly-once delivery guarantees
4. Applies **Snappy compression** and batching (`linger.ms: 50`, `batch.size: 32KB`) to reduce broker round-trips

### Consumer Workers — `consumer.worker.ts`

Multiple processes (default 3), each an independent Kafka consumer in the **same consumer group**. Kafka's **cooperative-sticky rebalancing** distributes partitions evenly across them.

Each consumer:

1. Subscribes to the topic using `eachBatch` (not `eachMessage`) for throughput
2. Parses all messages in a batch, extracts document IDs from event metadata
3. **Bulk-indexes** the batch into OpenSearch using the `_bulk` API (far more efficient than per-document indexing)
4. Resolves the offset only after successful indexing
5. Sends a heartbeat after each batch to stay alive during long processing

### OpenSearch Client — `opensearch/client.ts`

A thin wrapper around `@opensearch-project/opensearch`:

- `ensureIndex()` — creates the target index if it doesn't exist
- `bulkIndex(docs)` — builds NDJSON body and calls `_bulk` API, returns `{ indexed, errors }`
- Skips `refresh: "wait_for"` for async refresh — a major throughput optimization

## Cluster & Kafka Consumer Group

```
Kafka Topic: wikimedia-events (e.g. 3 partitions)
Consumer Group: wikimedia-opensearch-group

┌──────────────────────────────────────────────────┐
│             Kafka Broker Cluster                 │
│                                                  │
│  Partition 0 ──→  Consumer Worker 0 (pid 1234)   │
│  Partition 1 ──→  Consumer Worker 1 (pid 1235)   │
│  Partition 2 ──→  Consumer Worker 2 (pid 1236)   │
│                                                  │
└──────────────────────────────────────────────────┘
```

- All consumer workers share the **same `groupId`**, so Kafka treats them as a single logical consumer
- **Cooperative-sticky assignment** minimizes partition shuffling during rebalances (e.g., when a worker crashes and restarts)
- Scaling is straightforward: set `CONSUMER_WORKERS=6` and Kafka redistributes partitions — **no code changes needed**
- The upper bound on useful consumers equals the number of partitions in the topic

## Benefits Over Single-Process

### 1. True Parallelism

Node.js is single-threaded. A single process can only use **one CPU core**. With `cluster`, each worker gets its own V8 isolate and event loop, utilizing multiple cores. On a 4-core machine, 1 producer + 3 consumers can saturate all cores.

### 2. Fault Isolation & Self-Healing

In the single-process version, an unhandled exception in the consumer kills the producer too. Here, each worker is an **isolated OS process** — a consumer crash doesn't affect the producer or other consumers. The primary detects the exit and automatically restarts the failed worker.

### 3. Higher Throughput via `eachBatch` + Bulk API

The original app uses `eachMessage` — one Kafka message → one OpenSearch `index()` call. This project uses:

- **`eachBatch`** — receives hundreds of messages at once
- **`_bulk` API** — sends them all to OpenSearch in a single HTTP request

This dramatically reduces HTTP overhead and OpenSearch indexing latency.

### 4. Backpressure Separation

The producer (SSE → Kafka) and consumers (Kafka → OpenSearch) run in **separate processes**. If OpenSearch is slow, consumers fall behind on their partitions — but the producer keeps ingesting events into Kafka without blocking. Kafka acts as the natural buffer.

### 5. Horizontal Scalability

Need more throughput? Add more partitions to the topic and increase `CONSUMER_WORKERS`. Each new consumer process picks up partitions automatically via Kafka's rebalancing protocol. No architectural changes required.

## Configuration

All configuration is centralized in `config.ts` and driven by environment variables:

| Variable                      | Default                                               | Description                         |
| ----------------------------- | ----------------------------------------------------- | ----------------------------------- |
| `KAFKA_BROKERS`               | `127.0.0.1:9092,127.0.0.1:9093`                       | Comma-separated broker list         |
| `WIKIMEDIA_TOPIC`             | `wikimedia-events`                                    | Kafka topic name                    |
| `WIKIMEDIA_CONSUMER_GROUP_ID` | `wikimedia-opensearch-group`                          | Consumer group ID                   |
| `OPENSEARCH_NODE`             | `https://localhost:9200`                              | OpenSearch endpoint                 |
| `OPENSEARCH_PSWD`             | _(set in config)_                                     | OpenSearch admin password           |
| `OPENSEARCH_INDEX`            | `wikimedia`                                           | Target index name                   |
| `WIKIMEDIA_STREAM_URL`        | `https://stream.wikimedia.org/v2/stream/recentchange` | SSE source URL                      |
| `CONSUMER_WORKERS`            | `3`                                                   | Number of consumer worker processes |

## Scripts

```bash
# Development (tsx, no build step)
npm run dev              # Start primary → forks all workers
npm run dev:producer     # Run producer standalone
npm run dev:consumer     # Run a single consumer standalone

# Production
npm run build            # Compile TypeScript → dist/
npm start                # Run compiled JS via node
```

## Project Structure

```
wikimedia-stream-workers/
├── index.ts               # Primary process — orchestrator
├── producer.worker.ts     # SSE → Kafka producer (1 instance)
├── consumer.worker.ts     # Kafka → OpenSearch consumer (N instances)
├── config.ts              # Shared configuration from env vars
├── opensearch/
│   ├── client.ts          # OpenSearch bulk indexing client
│   └── index.ts           # Barrel export
├── package.json
└── tsconfig.json
```

## Dependencies

- **`@confluentinc/kafka-javascript`** — Confluent's librdkafka-based Kafka client for Node.js (higher throughput than kafkajs)
- **`@opensearch-project/opensearch`** — Official OpenSearch client
- **`eventsource`** — W3C-compatible SSE client for consuming the Wikimedia stream
- **`dotenv`** — Environment variable loading
