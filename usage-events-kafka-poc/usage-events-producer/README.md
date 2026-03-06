# usage-events-producer

Lightweight stress producer script for `usage-event-api` ingest endpoint.

## What it does

- Sends valid `POST /api/v1/usage-events/ingest` requests.
- Supports configurable peak rate (default `500` req/sec), worker parallelism, and interval windows.
- Tracks per-iteration request accounting (`planned`, `attempted`, `ok`, `failed`, interval RPS).
- Prints final throughput/latency summary to compare API + Kafka + consumer + DB behavior.

## Setup

```bash
npm install
cp .env.example .env
```

## Run

```bash
npm start
```

Or with CLI flags:

```bash
npm start -- --peak-rps=500 --workers=10 --max-events=20000 --interval-ms=100
```

## Important input notes

- Defaults are pre-wired to seeded data from `usage-event-api/src/scripts/seed.ts`:
  - `organizationId`: `cc0a49ab-e2aa-43b4-bc33-dd0f5366bd10`
  - `customerId`: `4dde02cf-5585-40ac-9285-0f23d7cd8fd0`
  - meter profile: `token_usage` + `tokens`
- `metricLookupKey` and property names come from `METER_PROFILES_JSON`.
  - Default profile targets seeded metric: `token_usage` with `tokens` property.
- `customerId` is optional.
  - If `CUSTOMER_IDS` is set, values must exist in DB to satisfy FK constraints.

## Configuration

Env vars or CLI flags (`--kebab-case`) are supported:

- `BASE_URL` / `--base-url` (default `http://localhost:3000`)
- `INGEST_PATH` / `--ingest-path` (default `/api/v1/usage-events/ingest`)
- `ORGANIZATION_ID` / `--organization-id` (defaults to seeded org)
- `SOURCE` / `--source`
- `WORKERS` / `--workers` (parallel worker count)
- `MAX_EVENTS` / `--max-events` (total target requests)
- `PEAK_RPS` / `--peak-rps` (target requests/sec)
- `INTERVAL_MS` / `--interval-ms` (scheduler window size)
- `REQUEST_TIMEOUT_MS` / `--request-timeout-ms`
- `INFLIGHT_PER_WORKER` / `--inflight-per-worker` (per-worker concurrent posts)
- `LOG_EVERY_ITERATIONS` / `--log-every-iterations`
- `VERBOSE_FAILURES` / `--verbose-failures`
- `CUSTOMER_IDS` / `--customer-ids` (comma-separated UUIDs)
- `METER_PROFILES_JSON` / `--meter-profiles-json`

`METER_PROFILES_JSON` format:

```json
[
  {
    "lookupKey": "token_usage",
    "propertyName": "tokens",
    "minValue": 50,
    "maxValue": 4000,
    "decimals": 0
  }
]
```

Multiple profile objects are rotated to simulate different meters and values.
