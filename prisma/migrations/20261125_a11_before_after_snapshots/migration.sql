-- ============================================================================
-- SafeHome 3D AI — Immutable RoomSnapshot & Before-After Comparison (Task A11)
-- Date: 2026-11-25
-- ============================================================================

CREATE TABLE IF NOT EXISTS "RoomSnapshotRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "parentSnapshotId" TEXT,
    "ownerAccountId" TEXT NOT NULL DEFAULT 'system',
    "assessmentVersion" TEXT NOT NULL DEFAULT '2026.1',
    "dataPartition" TEXT NOT NULL DEFAULT 'REAL',
    "snapshotHash" TEXT NOT NULL,
    "roomStateJson" TEXT NOT NULL,
    "provenanceJson" TEXT,
    "assessmentJson" TEXT NOT NULL,
    "persistenceStatus" TEXT NOT NULL DEFAULT 'saved',
    "idempotencyKey" TEXT,
    "notes" TEXT,
    "isImmutable" BOOLEAN NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "RoomSnapshotRecord_idempotencyKey_key" ON "RoomSnapshotRecord"("idempotencyKey");
CREATE UNIQUE INDEX IF NOT EXISTS "RoomSnapshotRecord_roomId_snapshotType_revision_key" ON "RoomSnapshotRecord"("roomId", "snapshotType", "revision");
CREATE INDEX IF NOT EXISTS "RoomSnapshotRecord_ownerAccountId_roomId_idx" ON "RoomSnapshotRecord"("ownerAccountId", "roomId");
CREATE INDEX IF NOT EXISTS "RoomSnapshotRecord_roomId_snapshotType_idx" ON "RoomSnapshotRecord"("roomId", "snapshotType");

