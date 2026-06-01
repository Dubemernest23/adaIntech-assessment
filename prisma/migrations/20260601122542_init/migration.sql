-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'sms', 'in_app');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('compliance', 'billing', 'engagement', 'system');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('realtime', 'daily_digest');

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "quiet_hours_start" TEXT,
    "quiet_hours_end" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_category_preferences" (
    "id" TEXT NOT NULL,
    "preference_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "delivery_mode" "DeliveryMode" NOT NULL DEFAULT 'realtime',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_category_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_preferences_tenant_id_idx" ON "notification_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_preferences_user_id_tenant_id_idx" ON "notification_preferences"("user_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_tenant_id_key" ON "notification_preferences"("user_id", "tenant_id");

-- CreateIndex
CREATE INDEX "notification_category_preferences_tenant_id_idx" ON "notification_category_preferences"("tenant_id");

-- CreateIndex
CREATE INDEX "notification_category_preferences_preference_id_tenant_id_idx" ON "notification_category_preferences"("preference_id", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_category_preferences_preference_id_category_key" ON "notification_category_preferences"("preference_id", "category");

-- AddForeignKey
ALTER TABLE "notification_category_preferences" ADD CONSTRAINT "notification_category_preferences_preference_id_fkey" FOREIGN KEY ("preference_id") REFERENCES "notification_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
