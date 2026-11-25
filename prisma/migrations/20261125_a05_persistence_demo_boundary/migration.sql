-- ============================================================================
-- SafeHome 3D AI — Non-Destructive Additive Migration (Task A05)
-- Date: 2026-11-25
-- Purpose: Add dataPartition (REAL/DEMO), persistenceStatus (saved/pending/failed),
--          idempotencyKey, and PersistenceAuditEvent table without data loss.
-- NOTE: Never run DROP TABLE or TRUNCATE in production.
-- ============================================================================

ALTER TABLE "Project" ADD COLUMN "dataPartition" TEXT NOT NULL DEFAULT 'REAL';
ALTER TABLE "Home" ADD COLUMN "dataPartition" TEXT NOT NULL DEFAULT 'REAL';
ALTER TABLE "Room" ADD COLUMN "dataPartition" TEXT NOT NULL DEFAULT 'REAL';
ALTER TABLE "Room" ADD COLUMN "persistenceStatus" TEXT NOT NULL DEFAULT 'saved';

ALTER TABLE "Assessment" ADD COLUMN "dataPartition" TEXT NOT NULL DEFAULT 'REAL';
ALTER TABLE "Assessment" ADD COLUMN "persistenceStatus" TEXT NOT NULL DEFAULT 'saved';
ALTER TABLE "Assessment" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Assessment_idempotencyKey_key" ON "Assessment"("idempotencyKey");

ALTER TABLE "HomeSurvey" ADD COLUMN "dataPartition" TEXT NOT NULL DEFAULT 'REAL';
ALTER TABLE "HomeSurvey" ADD COLUMN "persistenceStatus" TEXT NOT NULL DEFAULT 'saved';

CREATE TABLE IF NOT EXISTS "PersistenceAuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL DEFAULT 'system',
    "dataPartition" TEXT NOT NULL DEFAULT 'REAL',
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "roomId" TEXT,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PersistenceAuditEvent_accountId_roomId_idx" ON "PersistenceAuditEvent"("accountId", "roomId");
CREATE INDEX IF NOT EXISTS "PersistenceAuditEvent_resourceId_idx" ON "PersistenceAuditEvent"("resourceId");

