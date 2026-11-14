import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

