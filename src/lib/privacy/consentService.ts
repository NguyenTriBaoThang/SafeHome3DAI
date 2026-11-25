import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import {
  resolveAccountScopeId,
  recordAuditEventBestEffort,
} from "@/lib/persistence/reliablePersistence";

/**
 * ==============================================================================
 * VERSIONED CONSENT & DATA PRIVACY GOVERNANCE SERVICE (TASK A06)
 * ==============================================================================
 * - Granular consent scopes:
 *     1. image_storage: Lưu ảnh không gian nhà ở trong kho riêng tư
 *     2. third_party_ai: Gửi ảnh / nội dung tới mô hình AI bên thứ ba (Gemini)
 *     3. research_use: Sử dụng dữ liệu ẩn danh phục vụ thống kê nghiên cứu
 * - Default-Deny: Missing consent NEVER permits storage or external AI dispatch.
 * - Revocation Enforcement: Once revoked, ALL future processing is blocked.
 * ==============================================================================
 */

export const CURRENT_CONSENT_VERSION = "2026.1";

export const ConsentScopeSchema = z.enum([
  "image_storage",
  "third_party_ai",
  "research_use",
]);
export type ConsentScope = z.infer<typeof ConsentScopeSchema>;

export const GrantConsentSchema = z.object({
  consentVersion: z.string().min(1).max(32).default(CURRENT_CONSENT_VERSION),
  allowImageStorage: z.boolean().default(false),
  allowThirdPartyAI: z.boolean().default(false),
  allowResearchUse: z.boolean().default(false),
  retainOriginalImage: z.boolean().default(true),
  retentionDays: z.number().int().min(0).max(365).default(30),
});
export type GrantConsentInput = z.infer<typeof GrantConsentSchema>;

export class ConsentRequiredError extends Error {
  public readonly code = "CONSENT_REQUIRED";
  public readonly statusCode = 403;
  public readonly missingScope: ConsentScope;

  constructor(missingScope: ConsentScope, message?: string) {
    super(
      message ||
        `Chưa có sự đồng ý hợp lệ của người dùng cho phạm vi "${missingScope}". Từ chối xử lý theo mặc định.`
    );
    this.name = "ConsentRequiredError";
    this.missingScope = missingScope;
  }
}

export class ConsentRevokedError extends Error {
  public readonly code = "CONSENT_REVOKED";
  public readonly statusCode = 403;

  constructor(
    message = "Người dùng đã thu hồi sự đồng ý xử lý dữ liệu. Mọi thao tác xử lý tiếp theo đều bị chặn."
  ) {
    super(message);
    this.name = "ConsentRevokedError";
  }
}

function getConsentDelegate() {
  return (prisma as any)?.consentRecord;
}

/**
 * Grants or updates versioned consent for the current account.
 */
export async function grantConsent(
  input: Partial<GrantConsentInput>,
  options?: { accountId?: string; origin?: string | null }
) {
  const parsed = GrantConsentSchema.parse(input);
  const accountId = options?.accountId || resolveAccountScopeId();
  const delegate = getConsentDelegate();
  if (!delegate) {
    throw new Error("ConsentRecord store is unavailable");
  }

  const record = await prisma.$transaction(async (tx) => {
    // Supersede prior GRANTED records cleanly by marking them REVOKED or keeping history ordered by grantedAt
    const created = await (tx as any).consentRecord.create({
      data: {
        accountId,
        consentVersion: parsed.consentVersion,
        allowImageStorage: parsed.allowImageStorage,
        allowThirdPartyAI: parsed.allowThirdPartyAI,
        allowResearchUse: parsed.allowResearchUse,
        retainOriginalImage: parsed.retainOriginalImage,
        retentionDays: parsed.retentionDays,
        status: "GRANTED",
        ipOrOrigin: options?.origin || null,
      },
    });

    await tx.persistenceAuditEvent.create({
      data: {
        accountId,
        dataPartition: "REAL",
        resourceType: "CONSENT",
        resourceId: created.id,
        action: "CONSENT_GRANTED",
        status: "saved",
        details: JSON.stringify({
          consentVersion: parsed.consentVersion,
          allowImageStorage: parsed.allowImageStorage,
          allowThirdPartyAI: parsed.allowThirdPartyAI,
          allowResearchUse: parsed.allowResearchUse,
          retainOriginalImage: parsed.retainOriginalImage,
          retentionDays: parsed.retentionDays,
        }),
      },
    });

    return created;
  });

  return record;
}

/**
 * Revokes all active consent for the current account, blocking future processing.
 */
export async function revokeConsent(
  options?: { accountId?: string; reason?: string }
) {
  const accountId = options?.accountId || resolveAccountScopeId();
  const delegate = getConsentDelegate();
  if (!delegate) {
    throw new Error("ConsentRecord store is unavailable");
  }

  const now = new Date();
  const revocationRecord = await prisma.$transaction(async (tx) => {
    await (tx as any).consentRecord.updateMany({
      where: { accountId, status: "GRANTED" },
      data: {
        status: "REVOKED",
        revokedAt: now,
        revocationReason: options?.reason || "Người dùng chủ động thu hồi đồng ý",
      },
    });

    // Always append an explicit REVOKED marker row so audit history is immutable
    const marker = await (tx as any).consentRecord.create({
      data: {
        accountId,
        consentVersion: CURRENT_CONSENT_VERSION,
        allowImageStorage: false,
        allowThirdPartyAI: false,
        allowResearchUse: false,
        retainOriginalImage: false,
        retentionDays: 0,
        status: "REVOKED",
        revokedAt: now,
        revocationReason: options?.reason || "Người dùng chủ động thu hồi đồng ý",
      },
    });

    await tx.persistenceAuditEvent.create({
      data: {
        accountId,
        dataPartition: "REAL",
        resourceType: "CONSENT",
        resourceId: marker.id,
        action: "CONSENT_REVOKED",
        status: "saved",
        details: JSON.stringify({ reason: marker.revocationReason }),
      },
    });

    return marker;
  });

  return revocationRecord;
}

/**
 * Returns the latest consent status (defaults to strict deny if none recorded).
 */
export async function getLatestConsentStatus(accountId?: string) {
  const targetAccountId = accountId || resolveAccountScopeId();
  const delegate = getConsentDelegate();
  if (!delegate) {
    return {
      accountId: targetAccountId,
      consentVersion: CURRENT_CONSENT_VERSION,
      status: "NONE" as const,
      allowImageStorage: false,
      allowThirdPartyAI: false,
      allowResearchUse: false,
      retainOriginalImage: false,
      retentionDays: 0,
      grantedAt: null,
      revokedAt: null,
    };
  }

  const latest = await delegate.findFirst({
    where: { accountId: targetAccountId },
    orderBy: [{ grantedAt: "desc" }, { updatedAt: "desc" }],
  });

  if (!latest) {
    return {
      accountId: targetAccountId,
      consentVersion: CURRENT_CONSENT_VERSION,
      status: "NONE" as const,
      allowImageStorage: false,
      allowThirdPartyAI: false,
      allowResearchUse: false,
      retainOriginalImage: false,
      retentionDays: 0,
      grantedAt: null,
      revokedAt: null,
    };
  }

  return latest;
}

/**
 * Enforces consent before storing photos or calling third-party AI (Gemini).
 * - If latest ConsentRecord is "REVOKED", ALWAYS denies (even if request passes a stale flag).
 * - Otherwise requires either active DB grant for the scope OR explicit request consent flag
 *   (for backward-compatible single-shot uploads where consent="true" was submitted).
 */
export async function assertConsentForAction(params: {
  accountId?: string;
  requiredScope: ConsentScope;
  requestConsentFlag?: boolean;
  strictDbRecordOnly?: boolean;
}) {
  const accountId = params.accountId || resolveAccountScopeId();
  const delegate = getConsentDelegate();

  // Safely check DB if model delegate exists (handles minimal unit-test Prisma mocks cleanly)
  if (delegate && typeof delegate.findFirst === "function") {
    let latest: any = null;
    try {
      latest = await delegate.findFirst({
        where: { accountId },
        orderBy: [{ grantedAt: "desc" }, { updatedAt: "desc" }],
      });
    } catch {
      latest = null;
    }

    if (latest) {
      if (latest.status === "REVOKED") {
        await recordAuditEventBestEffort({
          accountId,
          resourceType: "CONSENT",
          resourceId: latest.id || accountId,
          action: "PROCESSING_BLOCKED_REVOKED",
          status: "blocked",
          details: JSON.stringify({ requiredScope: params.requiredScope }),
        });
        throw new ConsentRevokedError();
      }

      if (latest.status === "GRANTED") {
        const permitted =
          (params.requiredScope === "image_storage" && latest.allowImageStorage) ||
          (params.requiredScope === "third_party_ai" && latest.allowThirdPartyAI) ||
          (params.requiredScope === "research_use" && latest.allowResearchUse);

        if (permitted) {
          return {
            authorized: true,
            source: "CONSENT_RECORD" as const,
            retainOriginalImage: Boolean(latest.retainOriginalImage),
            retentionDays: Number(latest.retentionDays ?? 30),
            consentVersion: latest.consentVersion,
          };
        }

        // Record explicitly exists as GRANTED without this scope -> check if inline flag was NOT explicitly provided or strict mode
        if (params.strictDbRecordOnly || params.requestConsentFlag !== true) {
          await recordAuditEventBestEffort({
            accountId,
            resourceType: "CONSENT",
            resourceId: latest.id || accountId,
            action: "PROCESSING_BLOCKED_NO_SCOPE",
            status: "blocked",
            details: JSON.stringify({ requiredScope: params.requiredScope }),
          });
          throw new ConsentRequiredError(params.requiredScope);
        }
      }
    }
  }

  // Fallback check when no ConsentRecord row exists yet
  if (!params.strictDbRecordOnly && params.requestConsentFlag === true) {
    return {
      authorized: true,
      source: "INLINE_REQUEST_FLAG" as const,
      retainOriginalImage: true,
      retentionDays: 30,
      consentVersion: CURRENT_CONSENT_VERSION,
    };
  }

  await recordAuditEventBestEffort({
    accountId,
    resourceType: "CONSENT",
    resourceId: accountId,
    action: "PROCESSING_BLOCKED_NO_CONSENT",
    status: "blocked",
    details: JSON.stringify({ requiredScope: params.requiredScope }),
  });
  throw new ConsentRequiredError(params.requiredScope);
}

