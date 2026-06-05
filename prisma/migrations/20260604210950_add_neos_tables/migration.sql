-- CreateEnum
CREATE TYPE "ProductLine" AS ENUM ('saas', 'fintech', 'ple');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('sent', 'failed', 'queued', 'skipped');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('transaction.created', 'invoice.due', 'user.onboarded', 'compliance.flagged', 'system.alert');

-- CreateTable
CREATE TABLE "incoming_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "product_line" "ProductLine" NOT NULL,
    "schema_version" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "incoming_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_records" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "skip_reason" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlation_id" TEXT NOT NULL,

    CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "incoming_events_event_id_key" ON "incoming_events"("event_id");

-- CreateIndex
CREATE INDEX "incoming_events_event_id_idx" ON "incoming_events"("event_id");

-- CreateIndex
CREATE INDEX "incoming_events_tenant_id_idx" ON "incoming_events"("tenant_id");

-- CreateIndex
CREATE INDEX "incoming_events_user_id_tenant_id_idx" ON "incoming_events"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "delivery_records_tenant_id_idx" ON "delivery_records"("tenant_id");

-- CreateIndex
CREATE INDEX "delivery_records_userId_tenant_id_idx" ON "delivery_records"("userId", "tenant_id");

-- CreateIndex
CREATE INDEX "delivery_records_event_id_idx" ON "delivery_records"("event_id");

-- AddForeignKey
ALTER TABLE "delivery_records" ADD CONSTRAINT "delivery_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "incoming_events"("event_id") ON DELETE CASCADE ON UPDATE CASCADE;
