import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { restoreSimulation, snapshotInclude } from "@/lib/simulations/persistence";
import {
  deleteRoomTransaction,
  ResourceNotFoundError,
  PersistenceWriteError,
} from "@/lib/persistence/reliablePersistence";
import { classifyDataPartition, buildDemoBanner } from "@/lib/persistence/demoBoundary";

async function GETHandler(
  _request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const room = await prisma.room.findUnique({ where: { id: params.id }, include: snapshotInclude });
    if (!room) return NextResponse.json({ success: false, error: "Không tìm thấy phòng." }, { status: 404 });
    const partition = classifyDataPartition(room);
    return NextResponse.json({
      success: true,
      persistenceStatus: room.persistenceStatus || "saved",
      dataPartition: partition,
      demoBanner: buildDemoBanner({ ...room, dataPartition: partition }),
      data: restoreSimulation(room),
    });
  } catch {
    return NextResponse.json(
      { success: false, persistenceStatus: "failed", error: "Không tải được bản dựng đã lưu." },
      { status: 503 }
    );
  }
}

async function DELETEHandler(
  _request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const deleted = await deleteRoomTransaction(params.id);
    return NextResponse.json({
      success: true,
      persistenceStatus: deleted.persistenceStatus,
      auditEventId: deleted.auditEventId,
      message: "Đã xóa phòng mô phỏng thành công",
    });
  } catch (error: any) {
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json(
        { success: false, persistenceStatus: "failed", error: error.message },
        { status: 404 }
      );
    }
    if (error instanceof PersistenceWriteError) {
      return NextResponse.json(
        { success: false, persistenceStatus: "failed", error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, persistenceStatus: "failed", error: "Lỗi xóa phòng từ cơ sở dữ liệu", details: error?.message },
      { status: 503 }
    );
  }
}

export const DELETE = withAccount(DELETEHandler);
export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
