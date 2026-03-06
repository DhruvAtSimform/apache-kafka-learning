# usage-event-api

Express + TypeScript API foundation with clean architecture conventions and route-controller-service layering.

## Tech stack

- Node.js + Express (ESM)
- TypeScript + ESLint
- Joi request validation
- Structured HTTP exceptions + global error middleware
- Pino + pino-http logging
- Drizzle ORM + PostgreSQL (repository pattern ready)

## Architecture

- `src/routes`: Route registration and HTTP endpoint wiring
- `src/controllers`: Request/response orchestration
- `src/services`: Business orchestration layer
- `src/repositories`: Data access contracts and implementations
- `src/infrastructure`: Infrastructure adapters (database)
- `src/middlewares`: Cross-cutting middleware
- `src/exceptions`: Shared exception primitives
- `src/config`: Environment and logger configuration

## Setup

```bash
npm install
cp .env.example .env
```

## Commands

- `npm run dev` - Run server in watch mode
- `npm run start` - Run compiled server
- `npm run typecheck` - TypeScript type-check only
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint with fixes
- `npm run build` - Build to `dist/`
- `npm run clean` - Remove build output
- `npm run db:generate` - Generate Drizzle artifacts
- `npm run db:migrate` - Apply migrations
- `npm run db:push` - Push schema to database

## Environment variables

- `NODE_ENV` - Runtime mode (`development` by default)
- `PORT` - HTTP port (`3000` by default)
- `LOG_LEVEL` - Logger verbosity (`info` by default)
- `DATABASE_URL` - PostgreSQL connection string
- `KAFKA_BROKERS` - Comma-separated Kafka brokers (for example `127.0.0.1:9092`)
- `KAFKA_CLIENT_ID` - Kafka producer client id (`usage-event-api` by default)
- `KAFKA_SSL` - Enables TLS for broker connections (`false` by default)
- `KAFKA_SASL_MECHANISM` - Optional SASL mechanism (`plain`, `scram-sha-256`, `scram-sha-512`)
- `KAFKA_SASL_USERNAME` - SASL username when authentication is enabled
- `KAFKA_SASL_PASSWORD` - SASL password when authentication is enabled

## API endpoints

- `GET /api/v1/health`
- `POST /api/v1/usage-events/ingest` (validates organization + metric payload, stores event, then produces to Kafka topic `usage-events`)

Example success response:

```json
{
  "success": true,
  "data": {
    "service": "usage-event-api",
    "status": "ok",
    "uptime": 12.34,
    "timestamp": "2026-02-27T10:00:00.000Z"
  }
}
```

Example error response:

```json
{
  "success": false,
  "error": {
    "code": "ROUTE_NOT_FOUND",
    "message": "Route not found",
    "details": null
  }
}
```
