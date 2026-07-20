# Project Atlas — Vision71 Market Intelligence Platform

Backend service that continuously discovers technology trends, business opportunities, operational pain points, and potential clients across multiple public data sources.

This is not an Upwork dashboard, a LinkedIn scraper, or a job board crawler. It is a source-agnostic ingestion platform. Every data source, present or future, plugs into the same connector interface. See `docs/CONNECTORS.md` for how that works.

## Documentation

- `docs/ARCHITECTURE.md` — how a record flows from source to API
- `docs/API.md` — every endpoint, its auth requirement, and its schema
- `docs/DATABASE.md` — every collection, field, and index, and why it exists
- `docs/CONNECTORS.md` — how to add a new data source
- `docs/SECURITY.md` — how each required protection is implemented
- `docs/RUNBOOK.md` — deploy, rollback, key rotation, backup and restore, diagnosing a stuck queue

## Requirements

- Node.js 20 or later
- MongoDB (Atlas or self-hosted)
- Redis 6 or later

## Quickstart

```bash
npm install
cp .env.example .env
# edit .env — set MONGODB_URI, REDIS_HOST, and generate JWT/encryption secrets
npm run dev
```

Generate strong secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run the API with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled build |
| `npm test` | Run the automated test suite |
| `npm run seed -- --size=1000` | Insert synthetic signal records for load testing |
| `npm run benchmark` | Run indexed query latency checks against the current dataset |

## First run

On a completely empty database, the first call to `POST /api/v1/auth/signup` creates the first user as `ADMIN`. Every signup after that is a `VIEWER`. Additional `ADMIN` or `ANALYST` accounts are created by an existing admin through `POST /api/v1/users`.

## Project layout

```
src/
  app.ts               Express app, middleware, error handling
  server.ts            Boot sequence and graceful shutdown
  config/               Environment loading and validation
  connectors/           Source connector interface, registry, and implementations
  controllers/          Request handlers per resource
  lib/                  Database, Redis, cache, logger, encryption
  middleware/           Auth, authorization, validation, sanitization
  models/                Mongoose schemas
  queues/                BullMQ queue and worker
  routes/                Route wiring
  scripts/                Seed and benchmark scripts
  services/               Scheduler and backup service
  types/                  Shared TypeScript interfaces
```
