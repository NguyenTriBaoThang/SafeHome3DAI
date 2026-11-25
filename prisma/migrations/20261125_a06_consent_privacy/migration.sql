-- ============================================================================
-- SafeHome 3D AI — Non-Destructive Consent & Privacy Migration (Task A06)
-- Date: 2026-11-25
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ConsentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL DEFAULT '2026.1',
    "allowImageStorage" INTEGER NOT NULL DEFAULT 0,
    "allowThirdPartyAI" INTEGER NOT NULL DEFAULT 0,
    "allowResearchUse" INTEGER NOT NULL DEFAULT 0,
    "retainOriginalImage" INTEGER NOT NULL DEFAULT 1,
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'GRANTED',
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    "ipOrOrigin" TEXT,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ConsentRecord_accountId_status_idx" ON "ConsentRecord"("accountId", "status");

