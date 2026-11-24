import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { restoreSimulation, snapshotInclude } from "@/lib/simulations/persistence";

async function GETHandler(_request: Request, { params: routeParams }: { params: Promise<{ id: string }> }) {
  const params = await routeParams;
  try {
    const room = await prisma.room.findUnique({ where: { id: params.id }, include: snapshotInclude });
    if (!room) return NextResponse.json({ error: "Không tìm thấy phòng." }, { status: 404 });
    return NextResponse.json({ success: true, data: restoreSimulation(room) });
  } catch {
    return NextResponse.json({ error: "Không tải được bản dựng đã lưu." }, { status: 503 });
  }
}

async function DELETEHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const roomId = params.id;

    // Check if room exists
    const existing = await prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng với ID yêu cầu" },
        { status: 404 }
      );
    }

    await prisma.room.delete({
      where: { id: roomId },
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa phòng mô phỏng thành công",
    });
  } catch (error: any) {
    console.error("Lỗi xóa phòng:", error);
    return NextResponse.json(
      { error: "Lỗi xóa phòng từ cơ sở dữ liệu", details: error.message },
      { status: 500 }
    );
  }
}


export const DELETE = withAccount(DELETEHandler);
export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
