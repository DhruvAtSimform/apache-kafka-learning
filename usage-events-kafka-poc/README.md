# Usage Events Kafka POC

A production-grade Node.js POC demonstrating a complete **event ingestion architecture** using **Apache Kafka**, **PostgreSQL**, and **Express.js**. This project measures API throughput, Kafka stream processing, consumer performance, and database write-heavy workloads in an integrated system.

## Project Overview

This is a comprehensive proof-of-concept that implements a real-world scenario for tracking usage metrics (tokens, API calls, transactions, etc.) from customers. The system:

1. **Ingests** usage events through a RESTful API
2. **Produces** events to a Kafka broker for asynchronous processing
3. **Consumes** events from Kafka in separate worker processes
4. **Persists** validated events to PostgreSQL with deduplication guarantees
5. **Measures** throughput and latency across all components

**Use Cases:**

- SaaS metering platforms (Stripe Metering, Orb, etc.)
- Real-time analytics pipelines
- Event-driven microservices
- Write-heavy application benchmarking

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  Usage Events Kafka POC                          │
└─────────────────────────────────────────────────────────────────┘

  Load Generator          API Service               Kafka Broker
       │                       │                          │
       ├──HTTP POST────────────┤                          │
       │ /ingest               │                          │
       │ {org, metric, qty}    ├──Produce────────────────→│
       │                       │   usage-events topic     │
       │(stress load)          │                          │
       │ 500+ req/sec          │                    Consumer Workers
       │                       │                     ┌────────┐
       │                       │                  ┌──┤ Worker │
       │◄──201 Created─────────┤                  │  └────────┘
       │ {eventId}             │    Subscribe ←──┤
       │                       │    & Process     │  ┌────────┐
       │                       │                  └──┤ Worker │
       │                       │                     └────────┘
       │                       │
       └───────────────────────┴──→ PostgreSQL Storage
                   Deduplication   (idempotency keys)
                   & Validation    (unique constraints)
```

**Data Flow:**

1. **Producer (Load Generator)** → HTTP POST requests to API ingest endpoint
2. **API Service** → Receives, validates, stores event, produces to Kafka
3. **Kafka Topic** → `usage-events` (replicated, retained)
4. **Consumer Workers** → Subscribe to `usage-events`, process, validate, save to DB
5. **PostgreSQL** → Stores validated usage events with organization/customer associations

---

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript with strict type-checking
- **HTTP Server:** Express.js 5.x
- **Kafka:** Confluent Kafka JavaScript (`@confluentinc/kafka-javascript`)
- **Database:** PostgreSQL 16+
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Logging:** Pino (structured JSON logs)
- **Package Manager:** npm
- **Build:** TypeScript Compiler + tsc-alias
- **Analysis:** ESLint

---

## Prerequisites & External Dependencies

### Required Services (Must be running before starting the app)

| Service          | Version | Port   | Connection String                                            | Notes                                      |
| ---------------- | ------- | ------ | ------------------------------------------------------------ | ------------------------------------------ |
| **PostgreSQL**   | 16+     | `5432` | `postgresql://postgres:postgres@localhost:5432/usage_events` | Database backend, create `usage_events` DB |
| **Apache Kafka** | 3.x+    | `9092` | `127.0.0.1:9092`                                             | Single broker or multi-broker setup        |

### Quick Start - Docker Containers

#### Option 1: Using provided docker-compose (from parent Kafka Journal)

If you have access to the parent directory with `conduktor-kafka-multiple.yml`:

```bash

# Start Kafka cluster + Conduktor console + PostgreSQL
docker-compose -f conduktor-kafka-multiple.yml up -d

# Verify services
docker ps
```

**Services Started:**

- `kafka1` & `kafka2` (Confluentinc CP-Kafka 8.0.0) on ports `9092` & `9093`
- `postgresql` on port `5432` with user `conduktor`/password `some_password`
- `conduktor-console` on port `8080` (optional web UI: http://localhost:8080)

#### Option 2: Minimal Docker Setup (PostgreSQL + Kafka)

Create a minimal `docker-compose.yml` in this directory:

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:14-alpine
    container_name: usage-events-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: usage_events
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: usage-events-kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://127.0.0.1:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: usage-events-zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

volumes:
  postgres_data:
```

```bash
docker-compose up -d

# Wait for services to be healthy
docker-compose ps
```

#### Option 3: Local Installation (Dev Only)

```bash
# macOS
brew install postgresql@14 apache-kafka

# Linux (Ubuntu/Debian)
sudo apt-get install postgresql-14 kafka

# Start services
sudo service postgresql start
kafka-server-start.sh /etc/kafka/config/server.properties
```

---

## Project Structure

```
usage-events-kafka-poc/
├── README.md                                  # This file
├── package.json                               # Root orchestrator package
├── scripts/
│   └── orchestrator.js                        # Node.js script to start all services
│
├── usage-event-api/                           # ← Express.js HTTP API (Port 3000)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                           # Copy → .env
│   ├── drizzle.config.ts
│   ├── src/
│   │   ├── index.ts                           # Entry point
│   │   ├── app.ts                             # Express app setup
│   │   ├── server.ts                          # HTTP server
│   │   ├── config/
│   │   │   ├── env.ts                         # Environment variables (validated with Zod)
│   │   │   └── logger.ts                      # Pino logger configuration
│   │   ├── controllers/
│   │   │   ├── health.controller.ts           # GET /api/v1/health
│   │   │   └── usage-events.controller.ts     # POST /api/v1/usage-events/ingest
│   │   ├── services/
│   │   │   ├── health.service.ts
│   │   │   └── usage-events.service.ts        # Business logic: ingest → validate → produce
│   │   ├── infrastructure/
│   │   │   ├── db/
│   │   │   │   ├── client.ts                  # Drizzle ORM client
│   │   │   │   └── schema.ts                  # Database schema (tables: organizations, metrics, usage_events)
│   │   │   └── kafka/
│   │   │       └── usage-events.producer.ts   # Kafka producer wrapper
│   │   ├── repositories/
│   │   │   └── drizzle-usage-events.repository.ts  # Data access layer
│   │   ├── routes/
│   │   │   ├── index.ts                       # Route registration
│   │   │   ├── health.routes.ts
│   │   │   └── usage-events.routes.ts
│   │   ├── middlewares/
│   │   │   ├── async-handler.middleware.ts    # Async/await error wrapper
│   │   │   ├── error-handler.middleware.ts    # Global error handler
│   │   │   ├── not-found.middleware.ts        # 404 handler
│   │   │   └── request-logger.middleware.ts   # Request/response logging
│   │   ├── exceptions/
│   │   │   └── http.exception.ts              # HTTP exception class
│   │   ├── validators/
│   │   │   ├── usage-events.validator.ts      # Zod schemas for ingest endpoint
│   │   │   └── validate-with-schema.ts        # Schema validation utility
│   │   ├── types/
│   │   │   └── validated-request.type.ts
│   │   └── scripts/
│   │       └── seed.ts                        # Database seeding (organizations, customers, metrics)
│   └── drizzle/                               # Database migrations
│       ├── 0000_long_the_fury.sql             # Schema creation
│       └── meta/
│
├── usage-events-consumer/                     # ← Kafka Consumer Workers (separate processes)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                           # Copy → .env
│   ├── src/
│   │   ├── index.ts                           # Entry point
│   │   ├── config/
│   │   │   ├── env.ts                         # Environment variables
│   │   │   └── logger.ts                      # Pino logger
│   │   ├── infrastructure/
│   │   │   └── db/
│   │   │       ├── client.ts                  # Drizzle ORM client
│   │   │       └── schema.ts                  # Shared schema with API
│   │   ├── repositories/
│   │   │   └── drizzle-usage-events.repository.ts  # DB access for consumer
│   │   ├── services/
│   │   │   └── usage-events-consumer.service.ts    # Kafka message processing & validation
│   │   └── workers/
│   │       ├── index.ts                       # Worker process spawner
│   │       ├── config.ts                      # Consumer group config
│   │       └── consumer.worker.ts             # Individual consumer worker
│   └── drizzle/                               # Shared migrations (symlinked/copied)
│
├── usage-events-producer/                     # ← Load Test Producer (stress test tool)
│   ├── package.json
│   ├── .env.example                           # Copy → .env
│   └── src/
│       ├── index.js                           # Entry point: spawns workers, tracks metrics
│       ├── config.js                          # Configuration loader
│       ├── http-client.js                     # HTTP client with retry logic
│       ├── load-controller.js                 # Rate limiting & throttling
│       ├── metrics.js                         # Throughput/latency statistics
│       ├── payload-factory.js                 # Random usage event generator
│       ├── utils.js                           # Helper utilities
│       └── worker.js                          # Individual worker (makes HTTP requests)
│
└── future-tasks.md                            # Development roadmap
```

---

## Sub-Project Descriptions

### 1. **usage-event-api** (Express.js REST API)

**Purpose:** HTTP endpoint to ingest usage events synchronously while producing them asynchronously to Kafka.

**Key Endpoints:**

- `GET /api/v1/health` → Health check (uptime, status)
- `POST /api/v1/usage-events/ingest` → Accept usage event

**Ingest Request Format:**

```json
{
  "organizationId": "uuid",
  "metricId": "uuid",
  "customerId": "uuid (optional)",
  "idempotencyKey": "unique-string-128",
  "quantity": 42.5,
  "eventTimestamp": "2026-03-06T10:00:00Z",
  "source": "string (2-128 chars)",
  "properties": { "any": "json" }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "event-uuid",
    "organizationId": "org-uuid",
    "metricId": "metric-uuid",
    "idempotencyKey": "key",
    "quantity": "42.5",
    "ingestedAt": "2026-03-06T10:00:00Z"
  }
}
```

**Workflow:**

1. Validate request schema (Zod)
2. Verify organization & metric exist
3. Insert event into `usage_events` table
4. Produce JSON message to Kafka topic `usage-events`
5. Return 201 Created

**Port:** `3000`

**Environment Variables:**

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/usage_events
KAFKA_BROKERS=127.0.0.1:9092
KAFKA_CLIENT_ID=usage-event-api
KAFKA_SSL=false
KAFKA_SASL_MECHANISM=  # (optional: plain, scram-sha-256, scram-sha-512)
KAFKA_SASL_USERNAME=   # (optional)
KAFKA_SASL_PASSWORD=   # (optional)
```

---

### 2. **usage-events-consumer** (Kafka Consumer Workers)

**Purpose:** Standalone workers that consume from Kafka `usage-events` topic, validate, and persist to PostgreSQL.

**Architecture:**

- Runs as separate process(es) from API
- Scales independently via `KAFKA_USAGE_EVENTS_CONSUMERS` env var
- Implements idempotency via `idempotencyKey` + `organizationId` unique constraint
- Handles deduplication (skips already-processed messages)

**Workflow per Message:**

1. Parse JSON from Kafka
2. Validate schema (Zod)
3. Verify metric exists in organization
4. Convert quantity based on metric type (sum vs unique_events)
5. Insert to `usage_events` table (idempotency guaranteed)
6. Log processing result + timing

**Port:** None (worker process only)

**Consumer Group:** `usage-events-processing-group`

**Environment Variables:**

```env
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/usage_events
KAFKA_BROKERS=127.0.0.1:9092
KAFKA_CLIENT_ID=usage-events-consumer
KAFKA_SSL=false
KAFKA_SASL_MECHANISM=
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=
KAFKA_USAGE_EVENTS_CONSUMER_GROUP_ID=usage-events-processing-group
KAFKA_USAGE_EVENTS_CONSUMERS=1  # Number of worker processes
```

---

### 3. **usage-events-producer** (Load Generation Tool)

**Purpose:** Lightweight stress-testing tool that simulates realistic load by sending HTTP requests to the API ingest endpoint.

**Features:**

- Configurable peak RPS (requests/second): 500 default
- Parallel worker threads: 10 default
- Rate limiting via token bucket
- Per-iteration metrics tracking (planned, attempted, ok, failed)
- Final throughput/latency summary

**Configuration (env vars or CLI flags):**

```
BASE_URL=http://localhost:3000
INGEST_PATH=/api/v1/usage-events/ingest
ORGANIZATION_ID=cc0a49ab-e2aa-43b4-bc33-dd0f5366bd10  # seeded org
WORKERS=10
MAX_EVENTS=5000
PEAK_RPS=500
INTERVAL_MS=100
REQUEST_TIMEOUT_MS=5000
INFLIGHT_PER_WORKER=10
VERBOSE_FAILURES=false
CUSTOMER_IDS=4dde02cf-5585-40ac-9285-0f23d7cd8fd0  # seeded customer
METER_PROFILES_JSON=[{"lookupKey":"token_usage","propertyName":"tokens","minValue":50,"maxValue":4000,"decimals":0}]
```

**Run with CLI Flags:**

```bash
npm start -- --peak-rps=500 --workers=10 --max-events=20000 --interval-ms=100
```

---

## Setup Instructions

### Step 1: Prerequisites

Ensure **PostgreSQL 14+** and **Apache Kafka** are running and accessible:

```bash
# Check PostgreSQL
psql -h localhost -U postgres -d postgres -c "SELECT version();"

# Check Kafka (in separate terminal)
kafka-broker-api-versions.sh --bootstrap-server=127.0.0.1:9092
```

### Step 2: Clone / Navigate to Project

```bash
cd /usage-events-kafka-poc
```

### Step 3: Install Root Dependencies

```bash
npm install
```

### Step 4: Setup Each Sub-Project

#### API Setup

```bash
cd usage-event-api

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env if using non-localhost Kafka/PostgreSQL
nano .env

# Generate Drizzle artifacts
npm run db:generate

# Apply database migrations
npm run db:migrate

# (Optional) Seed database with test org/customers/metrics
npm run db:seed

cd ..
```

#### Consumer Setup

```bash
cd usage-events-consumer

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env if needed
nano .env

# Build
npm run build

cd ..
```

#### Producer Setup

```bash
cd usage-events-producer

# No dependencies needed (pure Node.js)
# But copy .env for reference
cp .env.example .env

cd ..
```

---

## Running the Application

### Option 1: Automated Orchestration (Recommended)

Run all services (API + Consumer + Producer) with a single command:

```bash
# Standard load test
npm run orchestrate

# Peak load test (500 req/sec, 10 workers)
npm run orchestrate:peak
```

The orchestrator automatically:

1. Starts the API server (waits for health check)
2. Starts consumer workers
3. Delays producer start (waits for API to stabilize)
4. Gracefully shuts down all processes on Ctrl+C

**Output:**

```
[orchestrator] Starting API service...
[orchestrator] API is healthy at http://localhost:8000/api/v1/health
[orchestrator] Starting consumer workers...
[orchestrator] Starting producer (delay 0ms)...
[producer] Sending 5000 events at 500 req/sec...
[producer] Summary: 5000/5000 ok, avg latency 45ms, throughput 487 req/sec
[orchestrator] Shutting down all processes...
```

### Option 2: Manual - Separate Terminals

**Terminal 1: Start API**

```bash
cd usage-event-api
npm run dev
```

Output:

```
[API] listening at http://localhost:3000
```

**Terminal 2: Start Consumer Workers**

```bash
cd usage-events-consumer
npm run dev
```

Output:

```
[Consumer] joined group usage-events-processing-group
[Consumer] subscribed to topic usage-events
[Consumer] waiting for messages...
```

**Terminal 3: Run Producer (after API + Consumer are ready)**

```bash
cd usage-events-producer
npm start -- --peak-rps=500 --workers=10 --max-events=5000
```

---

## Key Localhost Ports

| Service                          | Port   | Protocol | Purpose                          |
| -------------------------------- | ------ | -------- | -------------------------------- |
| **usage-event-api**              | `3000` | HTTP     | REST API ingest endpoint         |
| **PostgreSQL**                   | `5432` | TCP      | Database backend                 |
| **Kafka Broker 1**               | `9092` | TCP      | Kafka broker (external listener) |
| **Kafka Broker 2** (optional)    | `9093` | TCP      | Second broker in cluster         |
| **Conduktor Console** (optional) | `8080` | HTTP     | Web UI for Kafka monitoring      |

### Connection Strings

```
Database: postgresql://postgres:postgres@localhost:5432/usage_events
Kafka:    127.0.0.1:9092
```

---

## Database Setup

### PostgreSQL Local Verification

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d usage_events

# List tables
\dt

# Create database (if not found)
createdb -U postgres usage_events
```

### Application DB Migrations

All migrations are managed by Drizzle ORM automatically:

```bash
cd usage-event-api

# Generate new migration (after schema changes)
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Seed with test data
npm run db:seed
```

### Database Schema Overview

**Tables:**

- `organizations` - SaaS organizations
- `customers` - End-users/accounts
- `organization_customers` - Many-to-many mapping
- `metrics` - Meter definitions (token_usage, API_calls, etc.)
- `usage_events` - Event log (write-heavy)

**Key Constraints:**

- `usage_events(organization_id, idempotency_key)` UNIQUE (deduplication)
- `metrics(organization_id, lookup_key)` UNIQUE
- Cascading deletes for data consistency

---

## Development Workflow

### Running Services in Watch Mode

```bash
# Terminal 1: API with hot reload
cd usage-event-api && npm run dev

# Terminal 2: Consumer with hot reload
cd usage-events-consumer && npm run dev

# Terminal 3: Manually run producer when ready
cd usage-events-producer && npm start
```

### Building for Production

```bash
# Build each sub-project
cd usage-event-api && npm run build
cd usage-events-consumer && npm run build

# Verify build output
ls -la usage-event-api/dist/
ls -la usage-events-consumer/dist/
```

### Type Checking

```bash
# Check types in each project
cd usage-event-api && npm run typecheck
cd usage-events-consumer && npm run typecheck
```

### Linting

```bash
# Lint & auto-fix
cd usage-event-api && npm run lint:fix
cd usage-events-consumer && npm run lint:fix
```

---

## Testing & Monitoring

### Health Check

```bash
curl http://localhost:3000/api/v1/health
```

Response:

```json
{
  "success": true,
  "data": {
    "service": "usage-event-api",
    "status": "ok",
    "uptime": 12.34,
    "timestamp": "2026-03-06T10:00:00.000Z"
  }
}
```

### Test Ingest Endpoint

```bash
# Single event
curl -X POST http://localhost:3000/api/v1/usage-events/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "cc0a49ab-e2aa-43b4-bc33-dd0f5366bd10",
    "metricId": "<metric-uuid-from-seed>",
    "quantityValue": 42,
    "eventTimestamp": "2026-03-06T10:00:00Z",
    "source": "manual-test",
    "idempotencyKey": "test-key-001",
    "properties": {}
  }'
```

### Monitor Database

```bash
# Connect and watch table sizes
psql -h localhost -U postgres -d usage_events \
  -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY pg_total_relation_size DESC;"

# Count events
psql -h localhost -U postgres -d usage_events -c "SELECT COUNT(*) FROM usage_events;"
```

### Monitor Kafka Topics

```bash
# List topics
kafka-topics.sh --bootstrap-server=127.0.0.1:9092 --list

# Describe usage-events topic
kafka-topics.sh --bootstrap-server=127.0.0.1:9092 --describe --topic usage-events

# Consumer group status
kafka-consumer-groups.sh --bootstrap-server=127.0.0.1:9092 --group usage-events-processing-group --describe

# Monitor in real-time (Conduktor Console)
# Open http://localhost:8080
```

---

## Configuration Reference

### API - usage-event-api/.env

```env
# Node environment
NODE_ENV=development

# HTTP server
PORT=3000

# Logging
LOG_LEVEL=info  # debug, info, warn, error

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/usage_events

# Kafka
KAFKA_BROKERS=127.0.0.1:9092
KAFKA_CLIENT_ID=usage-event-api
KAFKA_SSL=false

# Optional SASL Authentication (for managed Kafka like Confluent Cloud)
KAFKA_SASL_MECHANISM=      # plain, scram-sha-256, scram-sha-512
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=
```

### Consumer - usage-events-consumer/.env

```env
# Node environment
NODE_ENV=development

# Logging
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/usage_events

# Kafka
KAFKA_BROKERS=127.0.0.1:9092
KAFKA_CLIENT_ID=usage-events-consumer
KAFKA_SSL=false

# Consumer group
KAFKA_USAGE_EVENTS_CONSUMER_GROUP_ID=usage-events-processing-group
KAFKA_USAGE_EVENTS_CONSUMERS=1  # number of parallel workers

# Optional SASL Authentication
KAFKA_SASL_MECHANISM=
KAFKA_SASL_USERNAME=
KAFKA_SASL_PASSWORD=
```

### Producer - usage-events-producer/.env

```env
# API endpoint
BASE_URL=http://localhost:3000
INGEST_PATH=/api/v1/usage-events/ingest

# Load testing config
WORKERS=10
MAX_EVENTS=5000
PEAK_RPS=500
INTERVAL_MS=100
REQUEST_TIMEOUT_MS=5000
INFLIGHT_PER_WORKER=10

# Test data (must exist in DB from seed)
ORGANIZATION_ID=cc0a49ab-e2aa-43b4-bc33-dd0f5366bd10
CUSTOMER_IDS=4dde02cf-5585-40ac-9285-0f23d7cd8fd0

# Meter profile JSON (defines quantity ranges)
METER_PROFILES_JSON=[{"lookupKey":"token_usage","propertyName":"tokens","minValue":50,"maxValue":4000,"decimals":0}]

# Optional
LOG_EVERY_ITERATIONS=1
VERBOSE_FAILURES=false
SOURCE=usage-events-producer
```

---

## Troubleshooting

### PostgreSQL Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**

```bash
# Check if PostgreSQL is running
pg_isready -h localhost

# Start PostgreSQL
docker run -d \
  --name usage-postgres \
  -p 5432:5432 \
  -e POSTGRES_DB=usage_events \
  -e POSTGRES_PASSWORD=postgres \
  postgres:14-alpine
```

### Kafka Connection Error

```
Error: KafkaJSError: Request timed out. Brokers request failed
```

**Solution:**

```bash
# Check Kafka is running
kafka-broker-api-versions.sh --bootstrap-server=127.0.0.1:9092

# Check firewall
netstat -an | grep 9092

# Start Kafka (if using Docker)
docker run -d \
  --name usage-kafka \
  -p 9092:9092 \
  -e KAFKA_ZOOKEEPER_CONNECT=zookeeper:2181 \
  confluentinc/cp-kafka:7.5.0
```

### Database Table Not Found

```
Error: relation "organizations" does not exist
```

**Solution:**

```bash
cd usage-event-api
npm run db:migrate
npm run db:seed
```

### Consumer Not Processing Messages

**Check:**

```bash
# Verify consumer group
kafka-consumer-groups.sh --bootstrap-server=127.0.0.1:9092 --group usage-events-processing-group --describe

# Check topic has messages
kafka-console-consumer.sh --bootstrap-server=127.0.0.1:9092 --topic usage-events --from-beginning --max-messages=5

# Verify env vars in consumer
cat usage-events-consumer/.env
```

### Producer Timeout

```
Error: Request timeout after 5000ms
```

**Solution:**

- Increase `REQUEST_TIMEOUT_MS` env var
- Reduce `PEAK_RPS` or `WORKERS`
- Verify API is running: `curl http://localhost:3000/api/v1/health`

### Port Already in Use

```
Error: listen EADDRINUSE :::3000
```

**Solution:**

```bash
# Kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

---

## Performance Considerations

### Optimization Tips

1. **Kafka Partitioning:**
   - Partition by `organizationId` for ordered processing per org
   - Increase partitions for parallel consumption

2. **Database Indexes:**
   - `usage_events(organization_id, ingested_at)` for time-range queries
   - `usage_events(metric_id, event_timestamp)` for metric analysis

3. **Consumer Parallelism:**
   - Set `KAFKA_USAGE_EVENTS_CONSUMERS` equal to Kafka partition count
   - Use multiple consumer processes for independent scaling

4. **Connection Pooling:**
   - Drizzle uses pg connection pool (default max=10)
   - Adjust via `DATABASE_URL` pool params if needed

5. **Kafka Batch Settings:**
   - Consumer batches messages for efficiency
   - API batches produces in Kafka producer buffer

---

## Next Steps / Future Enhancements

See [future-tasks.md](./future-tasks.md) for roadmap items including:

- Metrics aggregation pipeline
- Real-time dashboards
- Multi-region deployment
- Event replay capabilities
- Performance benchmarking suite

---

## Contributing

1. Follow TypeScript strict mode conventions
2. Run `npm run lint:fix` before committing
3. Add tests for new features
4. Update this README for breaking changes

---

## License

Private lab project - Kafka learning POC 2026

---

## Support & Debugging

**For issues:**

1. Check logs: `tail -f usage-event-api/dist/index.js` (if using Node.js logging)
2. Verify all prerequisites are running (`docker ps`, `pg_isready`)
3. Review `.env` files for correct connection strings
4. Check Kafka topic: `kafka-topics.sh --bootstrap-server=127.0.0.1:9092 --describe --topic usage-events`

**Questions?** Refer to individual sub-project READMEs:

- [API README](./usage-event-api/README.md)
- [Consumer README](./usage-events-consumer/README.md)
- [Producer README](./usage-events-producer/README.md)

---

**Happy event streaming! 🚀**
