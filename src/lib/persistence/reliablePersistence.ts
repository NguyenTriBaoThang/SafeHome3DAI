import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { currentDatabaseScope } from "@/lib/database/scope";
import { AssessmentSnapshot } from "@/lib/risk/types";
import {
  DataPartition,
  PersistenceStatus,
  classifyDataPartition,
  excludeDemoFromRealQueries,
} from "./demoBoundary";

/**
 * ==============================================================================
 * RELIABLE TRANSACTIONAL PERSISTENCE SERVICE (TASK A05)
 * ==============================================================================
 * Guarantees:
 * 1. Explicit persistenceStatus ("saved" | "pending" | "failed") — never returns
 *    "saved" unless a real Prisma database transaction has committed.
 * 2. Full ACID transactions + Idempotency Key handling for duplicate submits.
 * 3. Strict Demo vs Real partition tracking and research query isolation.
 * 4. Server-side validation, tenant scope verification, and audit logging.
 * ==============================================================================
 */

export class PersistenceWriteError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly persistenceStatus: PersistenceStatus = "failed";

  constructor(message: string, code = "DB_WRITE_FAILED", statusCode = 503) {
    super(message);
    this.name = "PersistenceWriteError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ResourceNotFoundError extends Error {
  public readonly code = "RESOURCE_NOT_FOUND";
  public readonly statusCode = 404;
  public readonly persistenceStatus: PersistenceStatus = "failed";

  constructor(message: string) {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

export class IdempotencyConflictError extends Error {
  public readonly code = "IDEMPOTENCY_CONFLICT";
  public readonly statusCode = 409;
  public readonly persistenceStatus: PersistenceStatus = "failed";

  constructor(message: string) {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

export class CrossTenantAccessError extends Error {
  public readonly code = "CROSS_TENANT_FORBIDDEN";
  public readonly statusCode = 403;
  public readonly persistenceStatus: PersistenceStatus = "failed";

  constructor(message = "Không có quyền truy cập hồ sơ thuộc tài khoản khác.") {
    super(message);
    this.name = "CrossTenantAccessError";
  }
}

export interface PersistenceEnvelope<T> {
  success: boolean;
  persistenceStatus: PersistenceStatus;
  persisted: boolean;
  dataPartition: DataPartition;
  idempotentReplay: boolean;
  auditEventId: string | null;
  errorCode?: string;
  error?: string;
  data: T | null;
}

export const IdempotencyKeySchema = z
  .string()
  .trim()
  .min(4, "Idempotency-Key phải có ít nhất 4 ký tự")
  .max(128, "Idempotency-Key không vượt quá 128 ký tự")
  .regex(/^[a-zA-Z0-9_.:-]+$/, "Idempotency-Key chứa ký tự không hợp lệ");

export function extractIdempotencyKey(request: Request, body?: any): string | null {
  const raw =
    request.headers.get("Idempotency-Key") ||
    request.headers.get("x-idempotency-key") ||
    (typeof body?.idempotencyKey === "string" ? body.idempotencyKey : null);

  if (!raw) return null;
  const parsed = IdempotencyKeySchema.safeParse(raw);
  if (!parsed.success) {
    throw new PersistenceWriteError(
      parsed.error.issues[0]?.message || "Idempotency-Key không hợp lệ.",
      "INVALID_IDEMPOTENCY_KEY",
      400
    );
  }
  return parsed.data;
}

export function resolveAccountScopeId(): string {
  return currentDatabaseScope()?.id || "offline-test";
}

/**
 * Verifies tenant access when an explicit ownerAccountId is attached to a resource.
 */
export async function assertTenantAccess(
  resourceAccountId: string | null | undefined,
  resourceType: string,
  resourceId: string
): Promise<void> {
  const callerId = resolveAccountScopeId();
  if (
    resourceAccountId &&
    resourceAccountId !== "system" &&
    callerId !== "offline-test" &&
    resourceAccountId !== callerId
  ) {
    await recordAuditEventBestEffort({
      accountId: callerId,
      resourceType,
      resourceId,
      action: "CROSS_TENANT_BLOCKED",
      status: "blocked",
      details: JSON.stringify({ attemptedOwner: resourceAccountId, callerId }),
    });
    throw new CrossTenantAccessError();
  }
}

/**
 * Transient SQLite lock retry wrapper (never retries logical errors or DB outages).
 */
export async function withTransientLockRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const msg = String(error?.message || "");
      const code = String(error?.code || "");
      const isTransientBusy =
        code === "P1008" || msg.includes("SQLITE_BUSY") || msg.includes("database is locked");
      if (!isTransientBusy || attempt === maxRetries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function recordAuditEventBestEffort(params: {
  accountId?: string;
  dataPartition?: DataPartition;
  resourceType: string;
  resourceId: string;
  roomId?: string | null;
  action: string;
  status: "saved" | "pending" | "failed" | "blocked";
  idempotencyKey?: string | null;
  details?: string | null;
}): Promise<string | null> {
  try {
    const event = await prisma.persistenceAuditEvent.create({
      data: {
        accountId: params.accountId || resolveAccountScopeId(),
        dataPartition: params.dataPartition || "REAL",
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        roomId: params.roomId ?? null,
        action: params.action,
        status: params.status,
        idempotencyKey: params.idempotencyKey ?? null,
        details: params.details ?? null,
      },
    });
    return event.id;
  } catch {
    return null;
  }
}

/**
 * Atomically persists an AssessmentSnapshot and its findings in a single transaction,
 * supporting idempotent duplicate-submission replay and explicit persistence status.
 */
export async function persistAssessmentTransaction(params: {
  snapshot: AssessmentSnapshot;
  idempotencyKey?: string | null;
  expectedPartition?: DataPartition;
}): Promise<PersistenceEnvelope<AssessmentSnapshot>> {
  const { snapshot, idempotencyKey } = params;
  const accountId = resolveAccountScopeId();

  if (!snapshot || !snapshot.roomId || !snapshot.id) {
    throw new PersistenceWriteError("Thiếu thông tin phòng hoặc mã thẩm định.", "INVALID_INPUT", 400);
  }

  try {
    return await withTransientLockRetry(async () => {
      return prisma.$transaction(async (tx) => {
        // 1. Check idempotency key first
        if (idempotencyKey) {
          const existingByKey = await tx.assessment.findUnique({
            where: { idempotencyKey },
          });
          if (existingByKey) {
            if (existingByKey.roomId !== snapshot.roomId) {
              throw new IdempotencyConflictError(
                "Idempotency-Key đã được sử dụng cho một phòng khác."
              );
            }
            const parsedNotes = existingByKey.notes ? JSON.parse(existingByKey.notes) : null;
            const restoredSnapshot: AssessmentSnapshot = parsedNotes?.snapshot || snapshot;
            const audit = await tx.persistenceAuditEvent.create({
              data: {
                accountId,
                dataPartition: existingByKey.dataPartition,
                resourceType: "ASSESSMENT",
                resourceId: existingByKey.id,
                roomId: existingByKey.roomId,
                action: "DUPLICATE_REPLAYED",
                status: "saved",
                idempotencyKey,
                details: JSON.stringify({ replayReason: "matching_idempotency_key" }),
              },
            });
            return {
              success: true,
              persistenceStatus: "saved" as const,
              persisted: true,
              dataPartition: (existingByKey.dataPartition as DataPartition) || "REAL",
              idempotentReplay: true,
              auditEventId: audit.id,
              data: restoredSnapshot,
            };
          }
        }

        // 2. Verify room exists in this account's DB
        const dbRoom = await tx.room.findUnique({
          where: { id: snapshot.roomId },
          include: { home: true },
        });
        if (!dbRoom) {
          throw new ResourceNotFoundError(
            `Không tìm thấy phòng "${snapshot.roomId}" trong cơ sở dữ liệu hiện tại.`
          );
        }

        const partition: DataPartition =
          params.expectedPartition || classifyDataPartition(dbRoom);

        // 3. Check deterministic ID collision -> replay idempotently if identical room
        const existingById = await tx.assessment.findUnique({
          where: { id: snapshot.id },
        });
        if (existingById) {
          if (existingById.roomId !== dbRoom.id) {
            throw new IdempotencyConflictError("Xung đột mã thẩm định giữa các phòng.");
          }
          const parsedNotes = existingById.notes ? JSON.parse(existingById.notes) : null;
          const restoredSnapshot: AssessmentSnapshot = parsedNotes?.snapshot || snapshot;
          const audit = await tx.persistenceAuditEvent.create({
            data: {
              accountId,
              dataPartition: existingById.dataPartition,
              resourceType: "ASSESSMENT",
              resourceId: existingById.id,
              roomId: existingById.roomId,
              action: "DUPLICATE_REPLAYED",
              status: "saved",
              idempotencyKey: idempotencyKey ?? existingById.idempotencyKey,
              details: JSON.stringify({ replayReason: "deterministic_assessment_id" }),
            },
          });
          return {
            success: true,
            persistenceStatus: "saved" as const,
            persisted: true,
            dataPartition: (existingById.dataPartition as DataPartition) || partition,
            idempotentReplay: true,
            auditEventId: audit.id,
            data: restoredSnapshot,
          };
        }

        // 4. Create assessment, findings, and audit event in one atomic commit
        const created = await tx.assessment.create({
          data: {
            id: snapshot.id,
            roomId: dbRoom.id,
            totalHazards: snapshot.detectedCount,
            remainingHazards: snapshot.detectedCount,
            safetyScore: snapshot.safetyScore,
            status: "COMPLETED",
            dataPartition: partition,
            persistenceStatus: "saved",
            idempotencyKey: idempotencyKey ?? null,
            notes: JSON.stringify({ format: "risk-snapshot-v1", snapshot }),
            findings: {
              create: snapshot.findings.map((finding) => ({
                id: `${finding.id}-${randomUUID().slice(0, 6)}`,
                hazardType: finding.hazardType,
                title: finding.title,
                description: finding.description,
                severityCategory: finding.severityCategory,
                detectionRuleId: finding.ruleId,
                evidence: JSON.stringify(finding.evidence),
                recommendationText: finding.recommendationText,
                targetObjectId: finding.targetObjectId || null,
                status: finding.status,
              })),
            },
          },
        });

        const audit = await tx.persistenceAuditEvent.create({
          data: {
            accountId,
            dataPartition: partition,
            resourceType: "ASSESSMENT",
            resourceId: created.id,
            roomId: dbRoom.id,
            action: "CREATED",
            status: "saved",
            idempotencyKey: idempotencyKey ?? null,
            details: JSON.stringify({
              safetyScore: snapshot.safetyScore,
              detectedCount: snapshot.detectedCount,
            }),
          },
        });

        return {
          success: true,
          persistenceStatus: "saved" as const,
          persisted: true,
          dataPartition: partition,
          idempotentReplay: false,
          auditEventId: audit.id,
          data: snapshot,
        };
      });
    });
  } catch (error: any) {
    if (
      error instanceof ResourceNotFoundError ||
      error instanceof IdempotencyConflictError ||
      error instanceof CrossTenantAccessError ||
      error instanceof PersistenceWriteError
    ) {
      throw error;
    }
    throw new PersistenceWriteError(
      `Lưu dữ liệu thẩm định thất bại: ${error?.message || "Lỗi kết nối cơ sở dữ liệu"}`,
      "DB_TRANSACTION_FAILED",
      503
    );
  }
}

/**
 * Deletes a room inside an atomic transaction and records an audit event.
 */
export async function deleteRoomTransaction(roomId: string): Promise<{
  success: boolean;
  persistenceStatus: PersistenceStatus;
  auditEventId: string;
}> {
  const accountId = resolveAccountScopeId();
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.room.findUnique({ where: { id: roomId } });
      if (!existing) {
        throw new ResourceNotFoundError("Không tìm thấy phòng với ID yêu cầu.");
      }
      const partition = classifyDataPartition(existing);
      await tx.room.delete({ where: { id: roomId } });
      const audit = await tx.persistenceAuditEvent.create({
        data: {
          accountId,
          dataPartition: partition,
          resourceType: "ROOM",
          resourceId: roomId,
          roomId,
          action: "DELETED",
          status: "saved",
          details: JSON.stringify({ roomName: existing.name, roomType: existing.roomType }),
        },
      });
      return {
        success: true,
        persistenceStatus: "saved" as const,
        auditEventId: audit.id,
      };
    });
  } catch (error: any) {
    if (error instanceof ResourceNotFoundError) throw error;
    throw new PersistenceWriteError(
      `Không thể xóa phòng khỏi cơ sở dữ liệu: ${error?.message || "Lỗi hệ thống"}`,
      "DB_DELETE_FAILED",
      503
    );
  }
}

/**
 * Computes real-family research statistics, strictly excluding DEMO records.
 */
export async function getRealResearchStatistics() {
  const [rooms, assessments, surveys] = await Promise.all([
    prisma.room.findMany({ where: { dataPartition: "REAL" } }),
    prisma.assessment.findMany({ where: { dataPartition: "REAL" } }),
    prisma.homeSurvey.findMany({ where: { dataPartition: "REAL" } }),
  ]);

  const realRooms = excludeDemoFromRealQueries(rooms);
  const realAssessments = excludeDemoFromRealQueries(assessments);
  const realSurveys = excludeDemoFromRealQueries(surveys);

  const avgSafetyScore =
    realAssessments.length > 0
      ? Math.round(
          (realAssessments.reduce((acc, a) => acc + a.safetyScore, 0) / realAssessments.length) *
            10
        ) / 10
      : null;

  return {
    dataPartition: "REAL" as const,
    totalRealRooms: realRooms.length,
    totalRealAssessments: realAssessments.length,
    totalRealSurveys: realSurveys.length,
    averageSafetyScore: avgSafetyScore,
  };
}

