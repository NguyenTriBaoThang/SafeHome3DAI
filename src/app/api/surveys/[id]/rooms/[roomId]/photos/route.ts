import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import {
  assertConsentForAction,
  ConsentRequiredError,
  ConsentRevokedError,
} from "@/lib/privacy/consentService";
import { resolveAccountScopeId } from "@/lib/persistence/reliablePersistence";

const PhotoUploadSchema = z.object({
  // Enforce private storage URLs only — block public /uploads/vision/ or arbitrary external links
  fileUrl: z
    .string()
    .min(1)
    .refine(
      (val) =>
        val.startsWith("/api/vision/images/") &&
        !val.includes("/uploads/vision/") &&
        !val.startsWith("http"),
      "Chỉ chấp nhận đường dẫn ảnh riêng tư nội bộ (/api/vision/images/...)"
    ),
  caption: z.string().max(1000).optional(),
  consent: z.boolean().optional(),
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

    const { fileUrl, caption, consent, simulateVision } = parseResult.data;

    // Verify room ownership inside the specified surveyId (prevents cross-survey IDOR)
    const surveyRoom = await prisma.surveyRoom.findFirst({
      where: { id: params.roomId, surveyId: params.id },
    });
    if (!surveyRoom) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng thuộc hồ sơ khảo sát này." },
        { status: 404 }
      );
    }

    // Require image_storage consent
    await assertConsentForAction({
      accountId: resolveAccountScopeId(),
      requiredScope: "image_storage",
      requestConsentFlag: consent === true,
    });

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
        detectedObjects,
      },
    });
  } catch (error: any) {
    if (error instanceof ConsentRevokedError || error instanceof ConsentRequiredError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { error: "Không thể lưu ảnh phòng", details: error.message },
      { status: 500 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
