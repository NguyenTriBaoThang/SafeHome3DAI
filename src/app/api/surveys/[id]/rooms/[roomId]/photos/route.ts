import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";

const PhotoUploadSchema = z.object({
  fileUrl: z.string().url("URL ảnh không hợp lệ"),
  caption: z.string().optional(),
  simulateVision: z.boolean().optional(),
});

async function POSTHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string; roomId: string }> }
) {
  const params = await routeParams;
  try {
    const body = await request.json();
    const parseResult = PhotoUploadSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu ảnh không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { fileUrl, caption, simulateVision } = parseResult.data;

    // Optional simulated vision detections (flagged unconfirmed for safety)
    let detectedObjects: string[] | null = null;
    if (simulateVision) {
      detectedObjects = [
        "Phát hiện thảm trải sàn (Cần người dùng xác nhận đã cố định hay chưa)",
        "Phát hiện ổ cắm điện gần giường ngủ",
      ];
    }

    const photo = await prisma.surveyRoomPhoto.create({
      data: {
        roomId: params.roomId,
        fileUrl,
        caption: caption || null,
        detectedObjects: detectedObjects ? JSON.stringify(detectedObjects) : null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu ảnh phòng khảo sát thành công",
      photo: {
        ...photo,
        detectedObjects: detectedObjects,
      },
    });
  } catch (error: any) {
    console.error("Lỗi tải ảnh phòng:", error);
    return NextResponse.json(
      { error: "Không thể lưu ảnh phòng", details: error.message },
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
