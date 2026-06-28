/*
  Warnings:

  - You are about to drop the column `processed` on the `incoming_events` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "OrchestrationStatus" AS ENUM ('PENDING', 'QUEUED', 'COMPLETED', 'ENQUEUE_FAILED');

-- AlterTable
ALTER TABLE "incoming_events" DROP COLUMN "processed",
ADD COLUMN     "orchestration_status" "OrchestrationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "incoming_events_orchestration_status_idx" ON "incoming_events"("orchestration_status");
