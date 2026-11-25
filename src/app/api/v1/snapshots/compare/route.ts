import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { diffStoredSnapshots, getStoredSnapshotById } from "@/lib/risk/snapshotManager";
import { snapshotErrorResponse } from "@/lib/risk/snapshotHttpErrors";
import { recordAuditEventBestEffort } from "@/lib/persistence/reliablePersistence";

const CompareRequestSchema = z.object({
  baselineSnapshotId: z.string().min(1),
  afterSnapshotId: z.string().min(1),
  format: z.enum(["json", "export"]).optional().default("json"),
});

async function POSTHandler(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = CompareRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          code: "INVALID_COMPARE_PAYLOAD",
          error: "Cần cung cấp baselineSnapshotId và afterSnapshotId hợp lệ.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const callerHeader =
      process.env.NODE_ENV === "test" ? req.headers.get("x-test-account-id") || undefined : undefined;

    const [beforeSnap, afterSnap] = await Promise.all([
      getStoredSnapshotById(parsed.data.baselineSnapshotId, callerHeader),
      getStoredSnapshotById(parsed.data.afterSnapshotId, callerHeader),
    ]);

    const diff = diffStoredSnapshots(beforeSnap, afterSnap);

    if (parsed.data.format === "export" || req.nextUrl.searchParams.get("format") === "export") {
      await recordAuditEventBestEffort({
        accountId: callerHeader,
        dataPartition: afterSnap.dataPartition,
        resourceType: "BEFORE_AFTER_EXPORT",
        resourceId: diff.comparisonId,
        roomId: diff.roomId,
        action: "COMPARISON_EXPORTED",
        status: "saved",
        details: JSON.stringify({
          baselineSnapshotId: beforeSnap.snapshotId,
          afterSnapshotId: afterSnap.snapshotId,
          evaluationVerdict: diff.evaluationVerdict,
        }),
      });

      return new NextResponse(
        JSON.stringify(
          {
            success: true,
            exportedAt: new Date().toISOString(),
            data: diff,
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="before-after-${diff.comparisonId}.json"`,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      data: diff,
    });
  } catch (error) {
    return snapshotErrorResponse(error, "Lỗi đối chiếu Before–After.");
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";

