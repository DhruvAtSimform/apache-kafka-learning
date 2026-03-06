# usage-events-consumer

Standalone Kafka consumer workers for `usage-events` topic processing.

This app is separate from `usage-event-api` so it can be deployed and scaled independently.

## Setup

```bash
npm install
cp .env.example .env
```

## Commands

- `npm run dev` - Run consumer workers with tsx
- `npm run start` - Run compiled worker app
- `npm run build` - Build to `dist/`
- `npm run typecheck` - TypeScript check
- `npm run lint` - ESLint
