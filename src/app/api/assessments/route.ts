import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { runEnvironmentalAssessment, calculateSafetyScore } from "@/features/risk-engine/rules";
import { RoomState } from "@/types";
import { unverifiedPhotoAssessment } from "@/lib/vision/photoSceneDraft";
import {
  persistAssessmentTransaction,
  extractIdempotencyKey,
  recordAuditEventBestEffort,
  PersistenceWriteError,
  ResourceNotFoundError,
  IdempotencyConflictError,
  CrossTenantAccessError,
} from "@/lib/persistence/reliablePersistence";
import { classifyDataPartition } from "@/lib/persistence/demoBoundary";

const AssessmentsPostSchema = z.object({
  roomState: z
    .object({
      id: z.string().min(1),
      name: z.string().min(1),
      roomType: z.enum(["BEDROOM", "BATHROOM", "LIVING_ROOM", "KITCHEN", "HALLWAY"]).or(z.string().min(1)),
      objects: z.array(z.any()),
    })
    .passthrough(),
  idempotencyKey: z.string().optional(),
});

async function POSTHandler(request: Request) {
  let idempotencyKey: string | null = null;
  let roomIdForAudit: string | null = null;

  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = AssessmentsPostSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          persisted: false,
          error: "Dữ liệu phòng (roomState) không hợp lệ",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const roomState = parsed.data.roomState as unknown as RoomState;
    roomIdForAudit = roomState.id;
    idempotencyKey = extractIdempotencyKey(request, rawBody);

    if (roomState.evidenceStatus === "PHOTO_DRAFT") {
      return NextResponse.json(
        {
          ...unverifiedPhotoAssessment(roomState),
          persistenceStatus: "failed",
          persisted: false,
        },
        { status: 422 }
      );
    }

    const findings = runEnvironmentalAssessment(roomState);
    const safetyScore = calculateSafetyScore(findings);

    const snapshotLike: any = {
      id: idempotencyKey ? `assess-${roomState.id}-${idempotencyKey}` : `assess-${Date.now()}`,
      roomId: roomState.id,
      roomName: roomState.name,
      roomType: roomState.roomType,
      snapshotType: "BASELINE",
      createdAt: new Date().toISOString(),
      safetyScore,
      totalRulesEvaluated: findings.length,
      detectedCount: findings.length,
      needsVerificationCount: 0,
      highPriorityCount: findings.filter((f) => f.severityCategory === "HIGH").length,
      mediumPriorityCount: findings.filter((f) => f.severityCategory === "MEDIUM").length,
      lowPriorityCount: findings.filter((f) => f.severityCategory === "LOW").length,
      ruleEvaluations: [],
      findings: findings.map((f) => ({
        ...f,
        ruleId: f.detectionRuleId,
      })),
      recommendations: [],
      input: roomState,
    };

    // Strict transactional persistence — NEVER swallow DB failures or return fake persisted:false 200
    const persistedResult = await persistAssessmentTransaction({
      snapshot: snapshotLike,
      idempotencyKey,
      expectedPartition: classifyDataPartition(roomState),
    });

    return NextResponse.json(
      {
        id: snapshotLike.id,
        roomId: roomState.id,
        timestamp: snapshotLike.createdAt,
        totalHazards: findings.length,
        resolvedHazards: 0,
        remainingHazards: findings.length,
        newHazards: 0,
        safetyScore,
        findings,
        success: true,
        persisted: true,
        persistenceStatus: persistedResult.persistenceStatus,
        dataPartition: persistedResult.dataPartition,
        idempotentReplay: persistedResult.idempotentReplay,
        auditEventId: persistedResult.auditEventId,
      },
      { status: persistedResult.idempotentReplay ? 200 : 201 }
    );
  } catch (error: any) {
    await recordAuditEventBestEffort({
      resourceType: "ASSESSMENT",
      resourceId: roomIdForAudit || "unknown",
      roomId: roomIdForAudit,
      action: "WRITE_FAILED",
      status: "failed",
      idempotencyKey,
      details: JSON.stringify({ error: error?.message }),
    });

    if (
      error instanceof ResourceNotFoundError ||
      error instanceof IdempotencyConflictError ||
      error instanceof CrossTenantAccessError ||
      error instanceof PersistenceWriteError
    ) {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          persisted: false,
          code: error.code,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        persistenceStatus: "failed",
        persisted: false,
        code: "DB_WRITE_FAILED",
        error: "Không thể lưu kết quả đánh giá vào cơ sở dữ liệu.",
      },
      { status: 503 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
