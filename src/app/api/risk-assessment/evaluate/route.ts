import { buildSafeErrorPayload } from "@/lib/security/resilience";
import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { runAndPersistAssessment, getLatestAssessmentForRoom } from "@/lib/risk/assessmentManager";
import {
  extractIdempotencyKey,
  PersistenceWriteError,
  ResourceNotFoundError,
  IdempotencyConflictError,
  CrossTenantAccessError,
} from "@/lib/persistence/reliablePersistence";

async function POSTHandler(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.evidenceStatus === "PHOTO_DRAFT") {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          error: "Bản dựng ảnh chưa có số đo xác minh; hãy bổ sung khảo sát.",
          code: "NEEDS_VERIFICATION",
        },
        { status: 422 }
      );
    }

    const idempotencyKey = extractIdempotencyKey(req, body);

    if (body.roomId && !body.dimensions && !body.floor) {
      const existing = await getLatestAssessmentForRoom(body.roomId);
      if (existing) {
        return NextResponse.json({
          success: true,
          persistenceStatus: "saved",
          data: existing,
        });
      }
    }

    const snapshot = await runAndPersistAssessment(body, {
      idempotencyKey,
      requirePersistence: body.requirePersistence === true,
    });

    return NextResponse.json({
      success: true,
      persistenceStatus: snapshot.persistenceStatus,
      dataPartition: snapshot.dataPartition,
      idempotentReplay: snapshot.idempotentReplay ?? false,
      data: snapshot,
    });
  } catch (error: any) {
    if (
      error instanceof PersistenceWriteError ||
      error instanceof ResourceNotFoundError ||
      error instanceof IdempotencyConflictError ||
      error instanceof CrossTenantAccessError
    ) {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          code: error.code,
          error: error.message,
        },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      {
        ...buildSafeErrorPayload(error, "Lỗi khi thẩm định nguy cơ môi trường", "RISK_EVALUATE_ERROR"),
        persistenceStatus: "failed",
      },
      { status: 400 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
