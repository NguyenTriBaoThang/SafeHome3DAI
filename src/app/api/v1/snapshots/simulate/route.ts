import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { extractIdempotencyKey } from "@/lib/persistence/reliablePersistence";
import { simulateScenarioSnapshot } from "@/lib/risk/snapshotManager";
import { snapshotErrorResponse } from "@/lib/risk/snapshotHttpErrors";

const SimulateRequestSchema = z.object({
  baselineSnapshotId: z.string().min(1),
  roomPatches: z.object({
    floor: z.record(z.string(), z.any()).optional(),
    lighting: z.record(z.string(), z.any()).optional(),
    rugs: z.record(z.string(), z.any()).optional(),
    cables: z.record(z.string(), z.any()).optional(),
    obstacles: z.record(z.string(), z.any()).optional(),
    grabBars: z.record(z.string(), z.any()).optional(),
    accessibility: z.record(z.string(), z.any()).optional(),
  }),
  expectedRevision: z.number().int().min(0).optional(),
  notes: z.string().max(1000).optional(),
  idempotencyKey: z.string().optional(),
});

async function POSTHandler(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = SimulateRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          persisted: false,
          code: "INVALID_SIMULATION_PAYLOAD",
          error: "Dữ liệu mô phỏng không hợp lệ.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const idempotencyKey = extractIdempotencyKey(req, rawBody);
    const callerHeader =
      process.env.NODE_ENV === "test" ? req.headers.get("x-test-account-id") || undefined : undefined;

    const result = await simulateScenarioSnapshot({
      baselineSnapshotId: parsed.data.baselineSnapshotId,
      roomPatches: parsed.data.roomPatches,
      expectedRevision: parsed.data.expectedRevision,
      notes: parsed.data.notes,
      idempotencyKey,
      callerAccountId: callerHeader,
    });

    return NextResponse.json(
      {
        success: true,
        persistenceStatus: result.snapshot.persistenceStatus,
        persisted: true,
        idempotentReplay: result.idempotentReplay,
        auditEventId: result.auditEventId,
        isSimulatedProposal: true,
        data: result.snapshot,
      },
      { status: result.idempotentReplay ? 200 : 201 }
    );
  } catch (error) {
    return snapshotErrorResponse(error, "Lỗi mô phỏng thay đổi từ snapshot.");
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";

