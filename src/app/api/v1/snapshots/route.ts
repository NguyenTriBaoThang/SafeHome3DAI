import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { extractIdempotencyKey } from "@/lib/persistence/reliablePersistence";
import {
  CreateSnapshotInputSchema,
  createRoomSnapshot,
  getStoredSnapshotById,
  listRoomSnapshots,
} from "@/lib/risk/snapshotManager";
import { snapshotErrorResponse } from "@/lib/risk/snapshotHttpErrors";

async function GETHandler(req: NextRequest) {
  try {
    const snapshotId = req.nextUrl.searchParams.get("snapshotId");
    const roomId = req.nextUrl.searchParams.get("roomId");
    const callerHeader =
      process.env.NODE_ENV === "test" ? req.headers.get("x-test-account-id") || undefined : undefined;

    if (snapshotId) {
      const snapshot = await getStoredSnapshotById(snapshotId, callerHeader);
      return NextResponse.json({ success: true, data: snapshot });
    }

    if (!roomId) {
      return NextResponse.json(
        { success: false, persistenceStatus: "failed", error: "Cần cung cấp roomId hoặc snapshotId." },
        { status: 400 }
      );
    }

    const snapshots = await listRoomSnapshots(roomId, callerHeader);
    return NextResponse.json({ success: true, roomId, count: snapshots.length, data: snapshots });
  } catch (error) {
    return snapshotErrorResponse(error, "Không thể tải danh sách snapshot.");
  }
}

async function POSTHandler(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = CreateSnapshotInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          persistenceStatus: "failed",
          persisted: false,
          code: "INVALID_SNAPSHOT_PAYLOAD",
          error: "Dữ liệu tạo RoomSnapshot không hợp lệ.",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const idempotencyKey = extractIdempotencyKey(req, rawBody);
    const callerHeader =
      process.env.NODE_ENV === "test" ? req.headers.get("x-test-account-id") || undefined : undefined;

    const result = await createRoomSnapshot({
      snapshotType: parsed.data.snapshotType,
      roomInput: parsed.data.roomId
        ? { ...parsed.data.roomInput, roomId: parsed.data.roomId }
        : parsed.data.roomInput,
      provenanceMap: parsed.data.provenanceMap,
      expectedRevision: parsed.data.expectedRevision,
      parentSnapshotId: parsed.data.parentSnapshotId ?? null,
      notes: parsed.data.notes,
      idempotencyKey,
      callerAccountId: callerHeader,
      deterministicTimestamp: parsed.data.deterministicTimestamp,
    });

    return NextResponse.json(
      {
        success: true,
        persistenceStatus: result.snapshot.persistenceStatus,
        persisted: true,
        idempotentReplay: result.idempotentReplay,
        auditEventId: result.auditEventId,
        data: result.snapshot,
      },
      { status: result.idempotentReplay ? 200 : 201 }
    );
  } catch (error) {
    return snapshotErrorResponse(error, "Lỗi tạo snapshot.");
  }
}

export const GET = withAccount(GETHandler);
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";

