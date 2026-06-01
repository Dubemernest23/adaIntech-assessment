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