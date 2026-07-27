# ABP Connect – Notification Preference Service

A multi-tenant notification preference management and delivery orchestration service built with Express.js and TypeScript. Enables authenticated users to configure notification channels, delivery modes, quiet hours, and category preferences within a strict tenant-isolated environment. Includes NEOS (Notification Execution and Orchestration System) for durable event ingestion, dynamic category routing, and delivery history reporting.

---

## Architecture Overview

```
├── src/
│   ├── config/          # Centralised environment configuration
│   ├── modules/
│   │   ├── events/          # Event ingestion and idempotency
│   │   ├── orchestrator/    # BullMQ orchestration worker and service
│   │   ├── evaluation/      # Preference evaluation engine and category router
│   │   ├── delivery/        # Delivery records, history, and summary endpoints
│   │   ├── notifications/   # Notification preferences and digest jobs
│   │   └── health/          # Health check endpoint
│   ├── middleware/      # Auth, validation, error handling, request ID
│   ├── shared/          # Logger, constants, errors, response utils, queues
│   ├── database/        # Prisma client and seed
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server bootstrap
├── prisma/              # Schema and migrations
├── Dockerfile
├── docker-compose.yml
```

### Key Design Decisions

- **Multi-tenancy**: Every database query is scoped by `tenant_id` extracted from the JWT. Tenant isolation is enforced at both the application and data access layers.
- **Repository pattern**: Database logic is separated from business logic. Controllers → Services → Repositories.
- **Durable orchestration**: Event ingestion enqueues a BullMQ job immediately. The orchestration worker processes jobs with 3-attempt exponential backoff. Failed jobs land in a DLQ with full context preserved — no silent data loss after successful ingestion.
- **Dynamic category routing**: `CategoryRouterService` resolves event-to-category mappings in order: tenant override → product-line override → default code constant. Overrides are stored in the `category_mappings` table and take effect without a code deployment.
- **Background jobs**: BullMQ backed by Redis handles both orchestration and daily digest scheduling with automatic retries.
- **Structured logging**: Pino provides JSON logs in production with request ID tracing on every log line.
- **Consistent responses**: All API responses follow a uniform shape `{ success, message, data, requestId }`.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Node.js 22+ (for local development only)
- OpenSSL (required for RSA key generation — see below)

---

## RSA Key Generation (required before first run)

NEOS uses RS256 JWT signing. The server will refuse to start if the key pair is missing. Run **one** of the following commands from the project root after cloning:

**Linux / macOS**
```bash
npm run generate:keys
```

**Windows (PowerShell)**
```powershell
npm run generate:keys:win
```

Both commands create `src/keys/private.key` and `src/keys/public.key`. These files are excluded from version control (`.gitignore`) and must be generated locally on every clean clone.

> **OpenSSL on Windows:** OpenSSL ships with [Git for Windows](https://git-scm.com/downloads) and is on `PATH` inside a Git Bash terminal. If you are using a plain PowerShell or CMD prompt and `openssl` is not found, either run the command inside Git Bash or [install OpenSSL for Windows](https://slproweb.com/products/Win32OpenSSL.html) and add it to `PATH`.

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/Dubemernest23/adaIntech-assessment.git
cd adaIntech-assessment

# 2. Generate RSA keys (see section above)
npm run generate:keys          # Linux / macOS
# npm run generate:keys:win    # Windows

# 3. Create environment file
cp .env.example .env.docker

# 4. Start all services
docker compose up --build
```

The API will be available at `http://localhost:3000`

---

## Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate RSA keys (see section above — skip if already done)
npm run generate:keys          # Linux / macOS
# npm run generate:keys:win    # Windows

# 3. Create local environment file
cp .env.example .env

# 4. Start Postgres and Redis only
docker compose up postgres redis -d

# 5. Run database migrations
npx prisma migrate dev

# 6. Generate Prisma client
npx prisma generate

# 7. Seed the database
npm run seed

# 8. Start development server
npm run dev
```

---

## Running Tests

Tests run entirely in-memory — no running database or Redis instance is required.

```bash
# Run all tests (serial, ensures clean exit)
npm test -- --runInBand

# Run with coverage report
npm run test:coverage -- --runInBand
```

> `--runInBand` is recommended to avoid port conflicts and to guarantee a clean process exit after all suites complete.

---

## Environment Variables

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/abp_notifications` |
| `JWT_SECRET` | Secret for JWT verification | `your_secret_here` |
| `JWT_EXPIRES_IN` | JWT expiry duration | `1h` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `LOG_LEVEL` | Logging level | `info` |

> For Docker, use `.env.docker` with `postgres` and `redis` as hostnames instead of `localhost`.

---

## API Documentation

Interactive Swagger docs available at:
```
http://localhost:3000/api/v1/docs
```

### Endpoints Summary

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health` | Service health check |
| `POST` | `/api/v1/events` | Ingest a notification event |
| `GET` | `/api/v1/notifications/preferences` | Get user notification preferences |
| `PUT` | `/api/v1/notifications/preferences` | Create or update preferences |
| `PATCH` | `/api/v1/notifications/preferences/category` | Toggle a notification category |
| `GET` | `/api/v1/delivery/history` | Get filtered delivery history for authenticated user |
| `GET` | `/api/v1/delivery/history/:eventId` | Get delivery records for a specific event |
| `GET` | `/api/v1/delivery/summary` | Get delivery counts grouped by status and channel |

### Authentication

All endpoints (except health) require a JWT Bearer token:
```
Authorization: Bearer <token>
```

Token must include `user_id`, `tenant_id`, and `role` claims.

### Generating a Test Token

```bash
npx ts-node generate-token.ts
```

### Example Requests

**Ingest an Event**
```bash
POST /api/v1/events
Content-Type: application/json
Authorization: Bearer <token>

{
  "eventId": "evt-001",
  "eventType": "transaction_created",
  "tenantId": "tenant-001",
  "userId": "user-001",
  "productLine": "fintech",
  "schemaVersion": "1.0",
  "payload": { "amount": 5000 },
  "occurredAt": "2026-07-01T10:00:00Z"
}
```

**Get Delivery History with Filters**
```bash
GET /api/v1/delivery/history?status=sent&channel=email&limit=20&from=2026-07-01T00:00:00Z
Authorization: Bearer <token>
```

**Get Delivery Summary**
```bash
GET /api/v1/delivery/summary
Authorization: Bearer <token>
```

**Create/Update Preferences**
```bash
PUT /api/v1/notifications/preferences
Content-Type: application/json
Authorization: Bearer <token>

{
  "emailEnabled": true,
  "smsEnabled": false,
  "inAppEnabled": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "timezone": "Africa/Lagos",
  "categories": [
    { "category": "billing", "enabled": true, "deliveryMode": "realtime" },
    { "category": "compliance", "enabled": true, "deliveryMode": "daily_digest" }
  ]
}
```

---

## Database Schema

### Core tables

- **`notification_preferences`** — top-level settings per user per tenant (channels, quiet hours, timezone)
- **`notification_category_preferences`** — per-category settings with individual delivery modes
- **`incoming_events`** — every received event with idempotency enforced via unique `event_id` constraint and `orchestration_status` tracking
- **`delivery_records`** — every delivery attempt with status, channel, `correlationId`, and `skipReason`
- **`category_mappings`** — dynamic event-to-category mappings with tenant and product-line overrides; uniqueness enforced via three partial indexes

### Indexes

Indexes on `tenant_id` and `(user_id, tenant_id)` across all tenant-scoped tables for query performance.

---

## Background Jobs

Two BullMQ queues backed by Redis:

**Orchestration queue (`orchestration-notifications`)**
- Enqueued immediately after successful event ingestion
- Worker calls `OrchestratorService.orchestrate()` per job
- 3-attempt exponential backoff (5s base delay)
- Exhausted jobs land in the DLQ with `eventId`, `tenantId`, `correlationId`, and error preserved

**Digest queue (`digest-notifications`)**
- Scheduled at **8:00 AM daily** per tenant
- Finds all users with `delivery_mode: daily_digest` enabled categories
- 3-attempt exponential backoff
- In production this would trigger actual email/SMS delivery via a provider

---

## Category Routing

`CategoryRouterService` resolves event-to-category mappings dynamically:

1. **Tenant override** — `category_mappings` where `eventType = X AND tenantId = Y`
2. **Product-line override** — `category_mappings` where `eventType = X AND productLine = Z AND tenantId IS NULL`
3. **Default** — hardcoded constant in `CategoryRouterService`
4. **null** — unknown event type with no mapping at any level

Tenant administrators can insert rows into `category_mappings` to override routing without a code deployment.

---

## Requirements Compliance (R1–R10)

| Ref | Requirement | Implementation |
|---|---|---|
| R1 | Automated Tests | Jest unit and integration tests. 99 tests across 13 suites. 93.15% statement coverage, 93.33% function coverage. No live DB or Redis required. |
| R2 | Idempotent Event Processing | `eventId` unique constraint at DB level. Application-level check with `orchestration_status` tracking. `ENQUEUE_FAILED` status allows safe retry. Demonstrated in `idempotency.test.ts`. |
| R3 | Tenant Isolation | Every DB query scoped by `tenantId` from JWT. Delivery history and summary endpoints enforce tenant scope. Cross-tenant access demonstrated impossible in `tenant-isolation.test.ts` and `delivery.http.test.ts`. |
| R4 | Provider Interface | `NotificationProvider` interface in `provider.interface.ts`. Three mock adapters: `MockEmailProvider`, `MockSmsProvider`, `MockInAppProvider`. No provider logic in orchestration code. |
| R5 | Delivery Tracking | Every delivery attempt — sent, failed, skipped, queued — writes a `DeliveryRecord` with `correlationId`. Queryable via delivery history endpoints. |
| R6 | Quiet Hours Enforcement | `isInQuietHours()` in evaluation engine handles overnight windows. Skipped events recorded with `skipReason: quiet_hours`. |
| R7 | Partial Failure Handling | `Promise.allSettled()` in orchestrator ensures all channels attempt delivery independently. Each outcome recorded separately. |
| R8 | Per-Tenant Rate Limiting | `express-rate-limit` middleware keyed by `tenant_id` from JWT. Applied to event ingestion endpoint. 100 requests per 15-minute window per tenant. |
| R9 | Architectural Decision Notes | See section below. |
| R10 | RS256 JWT | HS256 replaced with RS256. Private key signs tokens. Public key verifies. Key pair in `src/keys/` as test fixtures only. |

---

## Architectural Decisions

### Decision 1 — Event Ingestion via HTTP Endpoint

**What was decided:** Events are ingested via `POST /api/v1/events` rather than a BullMQ consumer queue.

**Rationale:** An HTTP endpoint fits naturally into the existing Express architecture and keeps the ingestion contract explicit and synchronous at the boundary. The caller receives an immediate acknowledgement — `201 Accepted` for new events, `200` for duplicates — which makes idempotency straightforward to test and reason about.

**Trade-offs acknowledged:** An HTTP endpoint couples the producer to the availability of this service. In a high-throughput production system, a message queue (Kafka, RabbitMQ, or BullMQ with a dedicated publisher) would be the correct choice. The HTTP approach is the right starting point for this stage of the system.

---

### Decision 2 — Idempotency via Database Unique Constraint

**What was decided:** Idempotency is enforced by a `@unique` constraint on `eventId` in `incoming_events`, backed by an application-level check in `EventService.ingestEvent()`.

**Rationale:** The application-level check provides a fast, readable path for duplicate detection. The database constraint provides a second layer of defence against race conditions. The `orchestration_status` field tracks pipeline progress — `ENQUEUE_FAILED` events can be safely re-enqueued on retry without creating a duplicate.

**Trade-offs acknowledged:** The database check adds one query per ingestion request. At high throughput, a Redis-based idempotency key with a TTL would be faster but introduces availability and correctness trade-offs. The database approach trades marginal latency for correctness guarantees.

---

### Decision 3 — Durable Orchestration via BullMQ Queue

**What was decided:** `EventService` enqueues a BullMQ job immediately after ingestion. The orchestration worker processes jobs asynchronously with 3-attempt exponential backoff and DLQ on exhaustion.

**Rationale:** The previous fire-and-forget pattern — calling `orchestrate().catch(logger.error)` — meant that a failed orchestration after successful ingestion resulted in silent data loss. The `eventId` was not recoverable. Moving orchestration into a durable queue means every accepted event is guaranteed to reach the orchestration worker. Failed jobs are preserved in the DLQ with full context (`eventId`, `tenantId`, `correlationId`, error, `failedAt`) for operational inspection and reprocessing. The HTTP response still returns immediately after enqueueing, preserving the low-latency ingestion contract.