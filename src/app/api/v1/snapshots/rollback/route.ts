import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rollbackToSnapshotRevision } from "@/lib/risk/snapshotManager";
import { snapshotErrorResponse } from "@/lib/risk/snapshotHttpErrors";

const RollbackRequestSchema = z.object({
  targetSnapshotId: z.string().min(1),
  targetSnapshotType: z.enum(["PROPOSED_SCENARIO", "VERIFIED_POST_INTERVENTION"]).optional(),
  expectedRevision: z.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
});

async function POSTHandler(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = RollbackRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          persisted: false,
          code: "INVALID_ROLLBACK_PAYLOAD",
          error: "Yêu cầu khôi phục snapshot không hợp lệ.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const callerHeader =
      process.env.NODE_ENV === "test" ? req.headers.get("x-test-account-id") || undefined : undefined;

    const result = await rollbackToSnapshotRevision({
      targetSnapshotId: parsed.data.targetSnapshotId,
      targetSnapshotType: parsed.data.targetSnapshotType,
      expectedRevision: parsed.data.expectedRevision,
      reason: parsed.data.reason,
      callerAccountId: callerHeader,
    });

    return NextResponse.json(
      {
        success: true,
        persistenceStatus: result.snapshot.persistenceStatus,
        persisted: true,
        auditEventId: result.auditEventId,
        data: result.snapshot,
      },
      { status: 201 }
    );
  } catch (error) {
    return snapshotErrorResponse(error, "Lỗi khôi phục phiên bản snapshot.");
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";

