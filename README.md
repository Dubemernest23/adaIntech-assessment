# ABP Connect – Notification Preference Service

A multi-tenant notification preference management service built with Express.js and TypeScript. Enables authenticated users to configure notification channels, delivery modes, quiet hours, and category preferences within a strict tenant-isolated environment.

---

## Architecture Overview

```
├── src/
│   ├── config/          # Centralised environment configuration
│   ├── modules/
│   │   ├── notifications/   # Core notification preference module
│   │   │   ├── jobs/        # BullMQ background workers
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
- **Background jobs**: BullMQ backed by Redis handles daily digest scheduling with automatic retries (exponential backoff, 3 attempts).
- **Structured logging**: Pino provides JSON logs in production with request ID tracing on every log line.
- **Consistent responses**: All API responses follow a uniform shape `{ success, message, data, requestId }`.

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Node.js 22+ (for local development only)

---

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/Dubemernest23/adaIntech-assessment.git
cd adaIntech-assessment

# 2. Create environment file
cp .env.example .env.docker

# 3. Start all services
docker compose up --build
```

The API will be available at `http://localhost:3000`

---

## Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Create local environment file
cp .env.example .env

# 3. Start Postgres and Redis only
docker compose up postgres redis -d

# 4. Run database migrations
npx prisma migrate dev

# 5. Generate Prisma client
npx prisma generate

# 6. Seed the database (optional)
npm run seed

# 7. Start development server
npm run dev
```

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
| `GET` | `/api/v1/notifications/preferences` | Get user preferences |
| `PUT` | `/api/v1/notifications/preferences` | Create or update preferences |
| `PATCH` | `/api/v1/notifications/preferences/category` | Toggle a notification category |

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

**Toggle Category**
```bash
PATCH /api/v1/notifications/preferences/category
Content-Type: application/json
Authorization: Bearer <token>

{
  "category": "billing",
  "enabled": false
}
```

---

## Database Schema

Two core tables with full tenant isolation:

- **`notification_preferences`** — top-level settings per user per tenant (channels, quiet hours, timezone)
- **`notification_category_preferences`** — per-category settings (compliance, billing, engagement, system) with individual delivery modes

Indexes on `tenant_id` and `(user_id, tenant_id)` for query performance.

---

## Background Jobs

Daily digest notifications are processed via BullMQ backed by Redis:

- Scheduled at **8:00 AM daily** per tenant
- Finds all users with `delivery_mode: daily_digest` enabled categories
- Retries failed jobs up to **3 times** with exponential backoff
- In production, this would trigger actual email/SMS delivery via a provider

---

## Assumptions

1. **JWT tokens are mocked** — no auth server is implemented. Tokens are generated via `generate-token.ts` for testing purposes.
2. **Notification delivery is simulated** — the worker logs what would be sent rather than integrating with an email/SMS provider (SendGrid, Twilio etc).
3. **One preference record per user per tenant** — a user cannot have multiple preference profiles within the same tenant.
4. **Quiet hours are stored as strings** (`HH:MM` format) — timezone-aware scheduling would be handled by the delivery layer using the stored `timezone` field.
5. **Daily digest scheduling is per-tenant** — in production, scheduling would be triggered during tenant onboarding.


---

## NEOS — Notification Execution and Orchestration System

### Quick Start (Task 2)

The service now includes NEOS on top of the Task 1 preference storage layer. To run:

```bash
# Start infrastructure
docker compose up postgres redis -d

# Run migrations
npx prisma migrate dev

# Seed two tenants
npm run seed

# Generate RS256 test tokens
npx ts-node generate-token.ts

# Start server
npm run dev
```

API docs available at `http://localhost:3000/api/v1/docs`

---
---

### Architectural Decisions

#### Decision 1 — Event Ingestion via HTTP Endpoint

**What was decided:** Events are ingested via a `POST /api/v1/events` HTTP endpoint rather than a BullMQ consumer queue.

**Rationale:** An HTTP endpoint fits naturally into the existing Express architecture and keeps the ingestion contract explicit and synchronous at the boundary. The caller receives an immediate acknowledgement — `201 Accepted` for new events, `200` for duplicates — which makes idempotency straightforward to test and reason about. A BullMQ consumer queue would require a separate publisher, adding infrastructure complexity without meaningful benefit at this stage since ABP Connect verticals are HTTP-native services.

**Trade-offs acknowledged:** An HTTP endpoint couples the producer to the availability of this service. If NEOS is down, the producer receives an error. A queue-based approach would allow producers to publish regardless of consumer availability. In a high-throughput production system, a message queue (Kafka, RabbitMQ, or BullMQ with a dedicated publisher) would be the correct choice. The HTTP approach is the right starting point for this stage of the system.

---

#### Decision 2 — Idempotency via Database Unique Constraint

**What was decided:** Idempotency is enforced by a `@unique` constraint on the `eventId` column in the `incoming_events` table, backed by an application-level check in `EventService.ingestEvent()`.

**Rationale:** The application-level check provides a fast, readable path for duplicate detection — if the `eventId` already exists, the service returns immediately without touching the orchestrator. The database constraint provides a second layer of defence: even if two requests arrive simultaneously and both pass the application check, the database will reject the second insert. This two-layer approach means idempotency survives race conditions, Redis restarts, and application crashes. An in-memory set or Redis-based lock would not survive a process restart.

**Trade-offs acknowledged:** The database check adds one query per ingestion request. At high throughput this could become a bottleneck. A Redis-based idempotency key with a TTL would be faster but introduces a dependency on Redis availability and a time window within which duplicates could slip through after a Redis restart. The database approach trades marginal latency for correctness guarantees.

---

#### Decision 3 — What I Would Change Given Additional Time

**The decision:** The orchestration flow is currently fire-and-forget — `EventService` triggers `OrchestratorService.orchestrate()` without awaiting it, catching errors only in a `.catch()` handler.

**Why it was made:** Separating ingestion from orchestration keeps the HTTP response time low. The caller does not wait for delivery to complete. This is architecturally correct.

**What is wrong with it:** If the orchestration fails silently — for example, if the database is briefly unavailable when writing delivery records — there is no retry mechanism for the orchestration step itself. The event is marked as received but no delivery record is written. The gap is invisible unless you are actively monitoring logs.

**What I would change:** I would add the orchestration step to a BullMQ queue immediately after ingestion. The queue job would handle orchestration with the existing retry and DLQ configuration. This gives orchestration the same resilience as digest delivery — three attempts with exponential backoff, failed jobs visible in the DLQ, and no silent data loss. The HTTP response would still return immediately after enqueueing, preserving the low-latency ingestion contract.

---

### Database Schema

**New tables added in Task 2:**

- **`incoming_events`** — stores every received event with idempotency enforced via unique `event_id` constraint
- **`delivery_records`** — records every delivery attempt with status, channel, correlationId, and skipReason

**Design decisions:**
- `tenantId` duplicated on `delivery_records` to avoid joins on every tenant-scoped query
- `processed` flag on `incoming_events` tracks pipeline completion
- Indexes on `(userId, tenantId)` on both tables for query performance

---

### Failure Resilience

| Scenario | Approach |
|---|---|
| Duplicate event | DB unique constraint + application check. Same eventId never produces more than one delivery attempt. Tested in `idempotency.test.ts`. |
| Partial provider failure | `Promise.allSettled()` ensures all channels attempt delivery. Each outcome recorded independently. |
| Queue unavailability | If Redis is unreachable, BullMQ connection errors are logged. Realtime delivery still proceeds via direct provider calls. Digest scheduling fails gracefully with logged errors. Documented gap: orchestration should be queued (see Decision 3). |
| Out-of-order events | Events are processed in arrival order, not `occurredAt` order. Out-of-order arrival produces correct delivery records for each event independently. Since preference evaluation uses the current time (not `occurredAt`), a delayed event may be evaluated against different quiet hours than when it originally occurred. This is acceptable at this stage — the delivery record captures `occurredAt` for audit purposes and a deduplication window could be added in a future iteration. |