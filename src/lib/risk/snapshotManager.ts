/**
 * ==============================================================================
 * TASK A11: IMMUTABLE ROOM SNAPSHOTS & REPRODUCIBLE BEFORE-AFTER ENGINE
 * ==============================================================================
 * Guarantees:
 * - Strict separation of BASELINE (immutable), PROPOSED_SCENARIO (simulated),
 *   and VERIFIED_POST_INTERVENTION (real verified field changes).
 * - Optimistic concurrency checking via expectedRevision (HTTP 409 on conflict).
 * - Server-side owner authorization (cross-tenant IDOR blocked with HTTP 403).
 * - Explicit persistenceStatus ("saved" | "failed") — DB errors never report saved.
 * - Insufficient data in after-snapshot yields "chưa thể đánh giá", never "đã an toàn".
 * ==============================================================================
 */
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { authorizeObjectAccess, AuthorizationError } from "@/lib/auth/authorization";
import {
  BeforeAfterComparisonV1,
  MeasurementSourceType,
  SnapshotType,
  SnapshotTypeSchema,
} from "@/lib/contracts/sharedContractV1";
import { CanonicalAssessmentResult, evaluateRoomHazardsCanonical } from "./canonicalEngine";
import { normalizeRoomAssessmentInput } from "./inputAdapter";
import { ALL_VERSIONED_RULES } from "./riskRuleRegistry";
import { FindingPriority, RuleEvaluationState } from "./types";
import {
  DataPartition,
  PersistenceStatus,
  classifyDataPartition,
} from "@/lib/persistence/demoBoundary";
import {
  IdempotencyConflictError,
  PersistenceWriteError,
  ResourceNotFoundError,
  recordAuditEventBestEffort,
  resolveAccountScopeId,
  withTransientLockRetry,
} from "@/lib/persistence/reliablePersistence";

export class ConcurrencyConflictError extends Error {
  public readonly code: string;
  public readonly statusCode = 409;
  public readonly persistenceStatus: PersistenceStatus = "failed";

  constructor(message: string, code = "OPTIMISTIC_CONCURRENCY_CONFLICT") {
    super(message);
    this.name = "ConcurrencyConflictError";
    this.code = code;
  }
}

export class UnverifiedInputError extends Error {
  public readonly code = "NEEDS_VERIFICATION";
  public readonly statusCode = 422;
  public readonly persistenceStatus: PersistenceStatus = "failed";

  constructor(message: string) {
    super(message);
    this.name = "UnverifiedInputError";
  }
}

export type BeforeAfterDiffCategory =
  | "RESOLVED"
  | "INCREASED"
  | "NEW"
  | "UNCHANGED"
  | "NEEDS_VERIFICATION";

export interface BeforeAfterRuleDiffItem {
  ruleId: string;
  ruleName: string;
  ruleVersion: string;
  category: BeforeAfterDiffCategory;
  beforeState: RuleEvaluationState;
  afterState: RuleEvaluationState;
  beforePriority: FindingPriority;
  afterPriority: FindingPriority;
  beforeMeasuredValue: string;
  afterMeasuredValue: string;
  reason: string;
  missingDataFields: string[];
  notMeasuredWarning: string | null;
}

export interface StoredRoomSnapshot {
  snapshotId: string;
  roomId: string;
  snapshotType: SnapshotType;
  revision: number;
  parentSnapshotId: string | null;
  ownerAccountId: string;
  assessmentVersion: string;
  dataPartition: DataPartition;
  snapshotHash: string;
  roomState: Record<string, any>;
  provenanceMap: Record<string, any>;
  canonicalAssessment: CanonicalAssessmentResult;
  persistenceStatus: PersistenceStatus;
  idempotencyKey: string | null;
  notes: string | null;
  isImmutable: boolean;
  createdAt: string;
}

export interface ReproducibleBeforeAfterComparison extends BeforeAfterComparisonV1 {
  beforeSnapshotType: SnapshotType;
  afterSnapshotType: SnapshotType;
  beforeRevision: number;
  afterRevision: number;
  insufficientData: boolean;
  evaluationVerdict:
    | "CHUA_THE_DANH_GIA"
    | "PROPOSED_SIMULATION_ONLY"
    | "VERIFIED_IMPROVEMENT"
    | "UNCHANGED_OR_WORSENED";
  verdictLabel: string;
  aggregateScoreDisclaimer: string;
  summary: {
    resolvedCount: number;
    increasedCount: number;
    newCount: number;
    unchangedCount: number;
    needsVerificationCount: number;
    missingDataFields: string[];
  };
  findingDiffs: BeforeAfterRuleDiffItem[];
}

export const CreateSnapshotInputSchema = z.object({
  roomId: z.string().min(1).optional(),
  snapshotType: SnapshotTypeSchema,
  roomInput: z.record(z.string(), z.any()),
  provenanceMap: z.record(z.string(), z.any()).optional(),
  expectedRevision: z.number().int().min(0).optional(),
  parentSnapshotId: z.string().nullable().optional(),
  notes: z.string().max(1000).optional(),
  deterministicTimestamp: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

function computeSnapshotHash(
  roomInput: unknown,
  provenanceMap: unknown,
  snapshotType: SnapshotType
): string {
  const payload = JSON.stringify({ snapshotType, roomInput, provenanceMap: provenanceMap || {} });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function buildSnapshotId(
  roomId: string,
  snapshotType: SnapshotType,
  revision: number,
  hashHex: string
): string {
  const safeRoom = roomId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 24);
  const typeTag =
    snapshotType === "BASELINE"
      ? "base"
      : snapshotType === "PROPOSED_SCENARIO"
      ? "sim"
      : "ver";
  return `snap-${safeRoom}-${typeTag}-r${revision}-${hashHex.slice(0, 8)}`;
}

async function assertSnapshotOwnership(
  resourceOwnerId: string | null | undefined,
  callerAccountId: string,
  resourceId: string,
  action: "READ" | "WRITE" | "DELETE" | "EXPORT"
): Promise<void> {
  // Block explicit cross-account access even inside offline test harness when explicit owner differs
  if (
    resourceOwnerId &&
    resourceOwnerId !== "system" &&
    resourceOwnerId !== callerAccountId &&
    (callerAccountId !== "offline-test" || resourceOwnerId !== "offline-test")
  ) {
    await recordAuditEventBestEffort({
      accountId: callerAccountId,
      resourceType: "ROOM_SNAPSHOT",
      resourceId,
      action: "CROSS_TENANT_BLOCKED",
      status: "blocked",
      details: JSON.stringify({ resourceOwnerId, callerAccountId, action }),
    });
    throw new AuthorizationError(
      `Từ chối truy cập snapshot (${resourceId}): Không thuộc tài khoản hiện tại.`
    );
  }

  await authorizeObjectAccess({
    resourceType: "ASSESSMENT",
    resourceId,
    resourceOwnerId: resourceOwnerId || callerAccountId,
    callerAccountId,
    action,
  });
}

function hydrateStoredSnapshot(row: any): StoredRoomSnapshot {
  return {
    snapshotId: row.id,
    roomId: row.roomId,
    snapshotType: row.snapshotType as SnapshotType,
    revision: row.revision,
    parentSnapshotId: row.parentSnapshotId ?? null,
    ownerAccountId: row.ownerAccountId,
    assessmentVersion: row.assessmentVersion,
    dataPartition: (row.dataPartition as DataPartition) || "REAL",
    snapshotHash: row.snapshotHash,
    roomState: JSON.parse(row.roomStateJson),
    provenanceMap: row.provenanceJson ? JSON.parse(row.provenanceJson) : {},
    canonicalAssessment: JSON.parse(row.assessmentJson),
    persistenceStatus: (row.persistenceStatus as PersistenceStatus) || "saved",
    idempotencyKey: row.idempotencyKey ?? null,
    notes: row.notes ?? null,
    isImmutable: Boolean(row.isImmutable),
    createdAt:
      row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
  };
}

/**
 * Evaluates room input using the single Canonical Risk Engine and persists an immutable
 * revisioned RoomSnapshotRecord inside an ACID transaction.
 */
export async function createRoomSnapshot(params: {
  snapshotType: SnapshotType;
  roomInput: Record<string, any>;
  provenanceMap?: Record<string, any>;
  expectedRevision?: number;
  parentSnapshotId?: string | null;
  notes?: string;
  idempotencyKey?: string | null;
  callerAccountId?: string;
  deterministicTimestamp?: string;
}): Promise<{
  snapshot: StoredRoomSnapshot;
  idempotentReplay: boolean;
  auditEventId: string | null;
}> {
  const {
    snapshotType,
    roomInput,
    provenanceMap = {},
    expectedRevision,
    parentSnapshotId = null,
    notes = null,
    idempotencyKey = null,
    deterministicTimestamp,
  } = params;

  if (roomInput?.evidenceStatus === "PHOTO_DRAFT") {
    throw new UnverifiedInputError(
      "Bản dựng ảnh (PHOTO_DRAFT) chưa có số đo xác minh; không thể tạo snapshot đánh giá chuẩn."
    );
  }

  const callerAccountId = params.callerAccountId || resolveAccountScopeId();
  const normalizedInput = normalizeRoomAssessmentInput(roomInput);
  const roomId = normalizedInput.roomId;

  // Enforce sourceType separation: PROPOSED_SCENARIO cannot masquerade as verified measurement
  const effectiveInput =
    snapshotType === "PROPOSED_SCENARIO"
      ? { ...normalizedInput, sourceType: "3D_SCENE" as const }
      : normalizedInput;

  const assessmentVersion = "2026.1";
  const canonicalAssessment = evaluateRoomHazardsCanonical(effectiveInput, {
    provenanceMap,
    deterministicTimestamp,
  });

  const snapshotHash = computeSnapshotHash(effectiveInput, provenanceMap, snapshotType);
  const partition = classifyDataPartition(roomInput);

  try {
    return await withTransientLockRetry(() =>
      prisma.$transaction(async (tx) => {
        // 1. Idempotency replay guard
        if (idempotencyKey) {
          const replay = await tx.roomSnapshotRecord.findUnique({
            where: { idempotencyKey },
          });
          if (replay) {
            await assertSnapshotOwnership(
              replay.ownerAccountId,
              callerAccountId,
              replay.id,
              "READ"
            );
            if (replay.roomId !== roomId || replay.snapshotType !== snapshotType) {
              throw new IdempotencyConflictError(
                "Idempotency-Key đã được dùng cho phòng hoặc loại snapshot khác."
              );
            }
            const audit = await tx.persistenceAuditEvent.create({
              data: {
                accountId: callerAccountId,
                dataPartition: replay.dataPartition,
                resourceType: "ROOM_SNAPSHOT",
                resourceId: replay.id,
                roomId: replay.roomId,
                action: "DUPLICATE_REPLAYED",
                status: "saved",
                idempotencyKey,
                details: JSON.stringify({ snapshotType, revision: replay.revision }),
              },
            });
            return {
              snapshot: hydrateStoredSnapshot(replay),
              idempotentReplay: true,
              auditEventId: audit.id,
            };
          }
        }

        // 2. Load existing latest revision for (roomId, snapshotType)
        const latest = await tx.roomSnapshotRecord.findFirst({
          where: { roomId, snapshotType },
          orderBy: { revision: "desc" },
        });

        const currentRevision = latest?.revision ?? 0;

        if (latest) {
          await assertSnapshotOwnership(
            latest.ownerAccountId,
            callerAccountId,
            latest.id,
            "WRITE"
          );
        }

        // Baseline snapshot immutability rule: never overwrite baseline once persisted
        if (snapshotType === "BASELINE" && latest) {
          throw new ConcurrencyConflictError(
            `Baseline snapshot cho phòng "${roomId}" là bất biến và đã tồn tại (revision ${latest.revision}). Hãy tạo PROPOSED_SCENARIO hoặc VERIFIED_POST_INTERVENTION.`,
            "IMMUTABLE_BASELINE_EXISTS"
          );
        }

        // Optimistic concurrency guard
        if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
          throw new ConcurrencyConflictError(
            `Xung đột phiên bản lạc quan: revision hiện tại là ${currentRevision}, yêu cầu expectedRevision=${expectedRevision}.`,
            "OPTIMISTIC_CONCURRENCY_CONFLICT"
          );
        }

        const nextRevision = currentRevision + 1;
        const snapshotId = buildSnapshotId(roomId, snapshotType, nextRevision, snapshotHash);

        const created = await tx.roomSnapshotRecord.create({
          data: {
            id: snapshotId,
            roomId,
            snapshotType,
            revision: nextRevision,
            parentSnapshotId,
            ownerAccountId: callerAccountId,
            assessmentVersion,
            dataPartition: partition,
            snapshotHash,
            roomStateJson: JSON.stringify(effectiveInput),
            provenanceJson: JSON.stringify(provenanceMap),
            assessmentJson: JSON.stringify(canonicalAssessment),
            persistenceStatus: "saved",
            idempotencyKey,
            notes,
            isImmutable: true,
          },
        });

        const audit = await tx.persistenceAuditEvent.create({
          data: {
            accountId: callerAccountId,
            dataPartition: partition,
            resourceType: "ROOM_SNAPSHOT",
            resourceId: created.id,
            roomId,
            action: "SNAPSHOT_CREATED",
            status: "saved",
            idempotencyKey,
            details: JSON.stringify({
              snapshotType,
              revision: nextRevision,
              parentSnapshotId,
              snapshotHash,
              assessmentVersion,
            }),
          },
        });

        return {
          snapshot: hydrateStoredSnapshot(created),
          idempotentReplay: false,
          auditEventId: audit.id,
        };
      })
    );
  } catch (error: any) {
    if (
      error instanceof ConcurrencyConflictError ||
      error instanceof IdempotencyConflictError ||
      error instanceof AuthorizationError ||
      error instanceof ResourceNotFoundError ||
      error instanceof UnverifiedInputError ||
      error instanceof PersistenceWriteError
    ) {
      throw error;
    }

    await recordAuditEventBestEffort({
      accountId: callerAccountId,
      dataPartition: partition,
      resourceType: "ROOM_SNAPSHOT",
      resourceId: roomId,
      roomId,
      action: "WRITE_FAILED",
      status: "failed",
      details: JSON.stringify({ error: error?.message || "DB transaction failed", snapshotType }),
    });

    throw new PersistenceWriteError(
      `Không thể lưu snapshot (${snapshotType}) cho phòng "${roomId}": ${error?.message || "DB error"}`,
      "DB_WRITE_FAILED",
      503
    );
  }
}

/**
 * Loads a stored snapshot after strictly enforcing owner authorization.
 */
export async function getStoredSnapshotById(
  snapshotId: string,
  callerAccountId?: string
): Promise<StoredRoomSnapshot> {
  const actor = callerAccountId || resolveAccountScopeId();
  let row;
  try {
    row = await prisma.roomSnapshotRecord.findUnique({ where: { id: snapshotId } });
  } catch (err: any) {
    throw new PersistenceWriteError(
      `Lỗi truy vấn snapshot "${snapshotId}": ${err?.message || "DB error"}`,
      "DB_READ_FAILED",
      503
    );
  }

  if (!row) {
    throw new ResourceNotFoundError(`Không tìm thấy snapshot "${snapshotId}".`);
  }

  await assertSnapshotOwnership(row.ownerAccountId, actor, row.id, "READ");
  return hydrateStoredSnapshot(row);
}

/**
 * Lists all immutable snapshot revisions for a room belonging to the caller.
 */
export async function listRoomSnapshots(
  roomId: string,
  callerAccountId?: string
): Promise<StoredRoomSnapshot[]> {
  const actor = callerAccountId || resolveAccountScopeId();
  let rows;
  try {
    rows = await prisma.roomSnapshotRecord.findMany({
      where: { roomId },
      orderBy: [{ snapshotType: "asc" }, { revision: "asc" }],
    });
  } catch (err: any) {
    throw new PersistenceWriteError(
      `Không thể tải danh sách snapshot: ${err?.message || "DB error"}`,
      "DB_READ_FAILED",
      503
    );
  }

  const authorized: StoredRoomSnapshot[] = [];
  for (const row of rows) {
    if (
      row.ownerAccountId !== "system" &&
      row.ownerAccountId !== actor &&
      (actor !== "offline-test" || row.ownerAccountId !== "offline-test")
    ) {
      throw new AuthorizationError(
        `Từ chối truy cập danh sách snapshot của phòng "${roomId}" thuộc chủ sở hữu khác.`
      );
    }
    authorized.push(hydrateStoredSnapshot(row));
  }
  return authorized;
}

/**
 * Applies proposed scenario changes onto a baseline/parent snapshot into PROPOSED_SCENARIO
 * without modifying the original immutable baseline.
 */
export async function simulateScenarioSnapshot(params: {
  baselineSnapshotId: string;
  roomPatches: Partial<{
    floor: Record<string, any>;
    lighting: Record<string, any>;
    rugs: Record<string, any>;
    cables: Record<string, any>;
    obstacles: Record<string, any>;
    grabBars: Record<string, any>;
    accessibility: Record<string, any>;
  }>;
  expectedRevision?: number;
  notes?: string;
  idempotencyKey?: string | null;
  callerAccountId?: string;
}): Promise<{
  snapshot: StoredRoomSnapshot;
  idempotentReplay: boolean;
  auditEventId: string | null;
}> {
  const callerAccountId = params.callerAccountId || resolveAccountScopeId();
  const base = await getStoredSnapshotById(params.baselineSnapshotId, callerAccountId);
  const baseState = base.roomState;

  const patchedState = {
    ...baseState,
    floor: { ...(baseState.floor || {}), ...(params.roomPatches.floor || {}) },
    lighting: { ...(baseState.lighting || {}), ...(params.roomPatches.lighting || {}) },
    rugs: { ...(baseState.rugs || {}), ...(params.roomPatches.rugs || {}) },
    cables: { ...(baseState.cables || {}), ...(params.roomPatches.cables || {}) },
    obstacles: { ...(baseState.obstacles || {}), ...(params.roomPatches.obstacles || {}) },
    grabBars: { ...(baseState.grabBars || {}), ...(params.roomPatches.grabBars || {}) },
    accessibility: { ...(baseState.accessibility || {}), ...(params.roomPatches.accessibility || {}) },
    sourceType: "3D_SCENE",
  };

  // Mark patched dimensions cleanly as "simulated" provenance
  const simulatedProvenance: Record<string, any> = { ...base.provenanceMap };
  for (const sectionKey of Object.keys(params.roomPatches)) {
    simulatedProvenance[sectionKey] = {
      value: (patchedState as any)[sectionKey],
      sourceType: "simulated" satisfies MeasurementSourceType,
      updatedAt: new Date().toISOString(),
      method: "3D What-If Scenario Simulation",
    };
  }

  return createRoomSnapshot({
    snapshotType: "PROPOSED_SCENARIO",
    roomInput: patchedState,
    provenanceMap: simulatedProvenance,
    expectedRevision: params.expectedRevision,
    parentSnapshotId: base.snapshotId,
    notes: params.notes || `Đề xuất mô phỏng dựa trên ${base.snapshotId}`,
    idempotencyKey: params.idempotencyKey,
    callerAccountId,
  });
}

/**
 * Rollback by creating a new superseding immutable revision restoring an earlier target snapshot's state.
 * Never mutates historical snapshots or BASELINE.
 */
export async function rollbackToSnapshotRevision(params: {
  targetSnapshotId: string;
  targetSnapshotType?: "PROPOSED_SCENARIO" | "VERIFIED_POST_INTERVENTION";
  expectedRevision?: number;
  reason?: string;
  callerAccountId?: string;
}): Promise<{
  snapshot: StoredRoomSnapshot;
  auditEventId: string | null;
}> {
  const callerAccountId = params.callerAccountId || resolveAccountScopeId();
  const target = await getStoredSnapshotById(params.targetSnapshotId, callerAccountId);

  const outputType: SnapshotType =
    params.targetSnapshotType ||
    (target.snapshotType === "VERIFIED_POST_INTERVENTION"
      ? "VERIFIED_POST_INTERVENTION"
      : "PROPOSED_SCENARIO");

  const result = await createRoomSnapshot({
    snapshotType: outputType,
    roomInput: target.roomState,
    provenanceMap: target.provenanceMap,
    expectedRevision: params.expectedRevision,
    parentSnapshotId: target.snapshotId,
    notes:
      params.reason ||
      `Khôi phục (rollback) từ snapshot ${target.snapshotId} (revision ${target.revision})`,
    callerAccountId,
  });

  await recordAuditEventBestEffort({
    accountId: callerAccountId,
    dataPartition: result.snapshot.dataPartition,
    resourceType: "ROOM_SNAPSHOT",
    resourceId: result.snapshot.snapshotId,
    roomId: result.snapshot.roomId,
    action: "SNAPSHOT_ROLLED_BACK",
    status: "saved",
    details: JSON.stringify({
      restoredFromSnapshotId: target.snapshotId,
      restoredRevision: target.revision,
      newRevision: result.snapshot.revision,
    }),
  });

  return {
    snapshot: result.snapshot,
    auditEventId: result.auditEventId,
  };
}

const PRIORITY_RANK: Record<FindingPriority, number> = {
  UNKNOWN: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

/**
 * Reproducible canonical Before-After diff engine.
 * Classifies findings into RESOLVED | INCREASED | NEW | UNCHANGED | NEEDS_VERIFICATION,
 * surfaces missing data + "if not measured" warnings, and explicitly marks insufficient data
 * as "chưa thể đánh giá" instead of "đã an toàn".
 */
export function diffStoredSnapshots(
  before: StoredRoomSnapshot,
  after: StoredRoomSnapshot
): ReproducibleBeforeAfterComparison {
  const beforeEval = before.canonicalAssessment;
  const afterEval = after.canonicalAssessment;

  const findingDiffs: BeforeAfterRuleDiffItem[] = [];
  let resolvedCount = 0;
  let increasedCount = 0;
  let newCount = 0;
  let unchangedCount = 0;
  let needsVerificationCount = 0;
  const missingDataSet = new Set<string>(afterEval.missingInputs || []);

  for (const rule of ALL_VERSIONED_RULES) {
    const bTrace = beforeEval.ruleTrace.find((t) => t.ruleId === rule.id);
    const aTrace = afterEval.ruleTrace.find((t) => t.ruleId === rule.id);
    const aFinding = afterEval.findings.find((f) => f.ruleId === rule.id);

    const bState = bTrace?.state || "NOT_APPLICABLE";
    const aState = aTrace?.state || "NOT_APPLICABLE";
    const bPrio = bTrace?.priority || "UNKNOWN";
    const aPrio = aTrace?.priority || "UNKNOWN";
    const bVal = bTrace?.evidence.measuredValue || "Không có";
    const aVal = aTrace?.evidence.measuredValue || "Không có";
    const missingFields = aTrace?.evidence.missingFields || [];
    for (const mf of missingFields) missingDataSet.add(mf);

    // Determine "if not measured" warning from inputProvenance or snapshotType
    let notMeasuredWarning: string | null = null;
    if (after.snapshotType === "PROPOSED_SCENARIO") {
      notMeasuredWarning =
        "Cảnh báo chưa đo thực tế (if not measured): Thông số chỉ là giả lập mô phỏng 3D.";
    } else if (aFinding) {
      const unmeasuredTypes = aFinding.inputProvenance
        .filter((p) => p.sourceType !== "measured" && p.sourceType !== "user_confirmed")
        .map((p) => p.sourceType);
      if (unmeasuredTypes.length > 0) {
        notMeasuredWarning = `Cảnh báo chưa đo thực tế (if not measured): Dữ liệu đang ở dạng [${Array.from(
          new Set(unmeasuredTypes)
        ).join(", ")}].`;
      }
    } else if (aState === "NEEDS_VERIFICATION" || after.roomState?.sourceType !== "SURVEY_PROFILE") {
      if (after.roomState?.sourceType === "3D_SCENE" || after.roomState?.sourceType === "AI_VISION") {
        notMeasuredWarning =
          "Cảnh báo chưa đo thực tế (if not measured): Cần xác nhận bằng thước đo / cảm biến thực địa.";
      }
    }

    let category: BeforeAfterDiffCategory = "UNCHANGED";
    let reason = "";

    if (aState === "NEEDS_VERIFICATION") {
      category = "NEEDS_VERIFICATION";
      needsVerificationCount++;
      reason = `Chưa thể đánh giá chắc chắn "${rule.name}" do thiếu dữ liệu (${missingFields.join(", ") || "chưa đo"}).`;
    } else if (bState === "DETECTED" && aState === "NOT_DETECTED") {
      category = "RESOLVED";
      resolvedCount++;
      reason = `Mối nguy "${rule.name}" đã chuyển từ DETECTED sang NOT_DETECTED (trước: ${bVal} → sau: ${aVal}).`;
    } else if (bState !== "DETECTED" && aState === "DETECTED") {
      category = "NEW";
      newCount++;
      reason = `Phát sinh mối nguy mới "${rule.name}" ở trạng thái sau (${aVal}).`;
    } else if (bState === "DETECTED" && aState === "DETECTED") {
      if (PRIORITY_RANK[aPrio] > PRIORITY_RANK[bPrio]) {
        category = "INCREASED";
        increasedCount++;
        reason = `Mức ưu tiên nguy cơ "${rule.name}" tăng từ ${bPrio} lên ${aPrio} (${bVal} → ${aVal}).`;
      } else {
        category = "UNCHANGED";
        unchangedCount++;
        reason = `Mối nguy "${rule.name}" vẫn tồn tại ở mức ${aPrio} (${aVal}).`;
      }
    } else {
      category = "UNCHANGED";
      unchangedCount++;
      reason = `Trạng thái "${rule.name}" không đổi (${bState} → ${aState}).`;
    }

    findingDiffs.push({
      ruleId: rule.id,
      ruleName: rule.name,
      ruleVersion: aTrace?.version || rule.version,
      category,
      beforeState: bState,
      afterState: aState,
      beforePriority: bPrio,
      afterPriority: aPrio,
      beforeMeasuredValue: bVal,
      afterMeasuredValue: aVal,
      reason,
      missingDataFields: missingFields,
      notMeasuredWarning,
    });
  }

  const resolvedFindings = beforeEval.findings.filter(
    (bf) => !afterEval.findings.some((af) => af.ruleId === bf.ruleId)
  );
  const unresolvedFindings = afterEval.findings.filter((af) =>
    beforeEval.findings.some((bf) => bf.ruleId === af.ruleId)
  );
  const newFindings = afterEval.findings.filter(
    (af) => !beforeEval.findings.some((bf) => bf.ruleId === af.ruleId)
  );

  const missingDataFields = Array.from(missingDataSet);
  const insufficientData = needsVerificationCount > 0 || missingDataFields.length > 0;
  const isVerifiedAfter = after.snapshotType === "VERIFIED_POST_INTERVENTION";

  const canClaimVerifiedIntervention =
    isVerifiedAfter &&
    !insufficientData &&
    resolvedCount > 0 &&
    newCount === 0 &&
    increasedCount === 0;

  let evaluationVerdict: ReproducibleBeforeAfterComparison["evaluationVerdict"];
  let verdictLabel: string;
  let verificationNotes: string;

  if (insufficientData) {
    evaluationVerdict = "CHUA_THE_DANH_GIA";
    verdictLabel =
      "Chưa thể đánh giá đầy đủ (không chứng nhận an toàn) do còn thiếu thông số kiểm chứng.";
    verificationNotes = `Chưa thể đánh giá: còn ${needsVerificationCount} quy tắc thiếu dữ liệu (${missingDataFields.join(
      ", "
    )}).`;
  } else if (after.snapshotType === "PROPOSED_SCENARIO") {
    evaluationVerdict = "PROPOSED_SIMULATION_ONLY";
    verdictLabel =
      "Đề xuất mô phỏng Before–After — chưa xác minh ngoài đời thật (if not measured).";
    verificationNotes =
      "Kết quả dựa trên snapshot mô phỏng 3D (PROPOSED_SCENARIO). Cần thi công thực tế và đo kiểm lại để tạo VERIFIED_POST_INTERVENTION.";
  } else if (canClaimVerifiedIntervention) {
    evaluationVerdict = "VERIFIED_IMPROVEMENT";
    verdictLabel =
      "Đã xác minh cải thiện môi trường tại hiện trường (không phải bằng chứng giảm tai nạn).";
    verificationNotes =
      "Đã xác minh các thay đổi vật lý từ dữ liệu sau can thiệp. Lưu ý: cải thiện yếu tố môi trường không đồng nghĩa chứng minh giảm tỷ lệ té ngã lâm sàng.";
  } else {
    evaluationVerdict = "UNCHANGED_OR_WORSENED";
    verdictLabel =
      "Chưa ghi nhận cải thiện hoặc có nguy cơ mới/tăng mức độ sau đối chiếu.";
    verificationNotes =
      "Vẫn còn mối nguy tồn đọng hoặc phát sinh mối nguy mới; cần tiếp tục rà soát hiện trường.";
  }

  const baselineScore = beforeEval.heuristicSafetyScore;
  const afterScore = afterEval.heuristicSafetyScore;
  const deltaScore = Math.round((afterScore - baselineScore) * 10) / 10;

  return {
    comparisonId: `cmp-${before.snapshotId.slice(5, 22)}-vs-${after.snapshotId.slice(5, 22)}`,
    roomId: after.roomId,
    baselineSnapshotId: before.snapshotId,
    interventionSnapshotId: after.snapshotId,
    resolvedFindings,
    unresolvedFindings,
    newFindings,
    baselineSafetyScore: baselineScore,
    interventionSafetyScore: afterScore,
    deltaScore,
    canClaimVerifiedIntervention,
    verificationNotes,
    auditTrail: [
      `before:${before.snapshotId}@r${before.revision}(${before.snapshotType})`,
      `after:${after.snapshotId}@r${after.revision}(${after.snapshotType})`,
      `verdict:${evaluationVerdict}`,
    ],
    beforeSnapshotType: before.snapshotType,
    afterSnapshotType: after.snapshotType,
    beforeRevision: before.revision,
    afterRevision: after.revision,
    insufficientData,
    evaluationVerdict,
    verdictLabel,
    aggregateScoreDisclaimer:
      "Điểm tổng chỉ là chỉ số sàng lọc môi trường tham chiếu; KHÔNG dùng điểm tổng đơn lẻ làm bằng chứng giảm tai nạn hay khẳng định an toàn tuyệt đối.",
    summary: {
      resolvedCount,
      increasedCount,
      newCount,
      unchangedCount,
      needsVerificationCount,
      missingDataFields,
    },
    findingDiffs,
  };
}

