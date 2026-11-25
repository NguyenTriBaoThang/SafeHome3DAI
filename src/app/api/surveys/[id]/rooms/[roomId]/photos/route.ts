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
import { buildSafeErrorPayload } from "@/lib/security/resilience";

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

    const { fileUrl, caption, consent } = parseResult.data;

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

    // Attach verified detections only if this private image already has a real persisted VisionAnalysis.
    let detectedObjects: string[] | null = null;
    const imageMatch = fileUrl.match(/^\/api\/vision\/images\/([^/?#]+)\/file/);
    if (imageMatch) {
      const latestAnalysis = await prisma.visionAnalysis.findFirst({
        where: { imageId: decodeURIComponent(imageMatch[1]) },
        orderBy: { startedAt: "desc" },
        include: { detections: true },
      });
      const verified = (latestAnalysis?.detections || []).filter((d) =>
        d.verificationStatus === "CONFIRMED" || d.verificationStatus === "CORRECTED"
      );
      if (verified.length > 0) {
        detectedObjects = verified.map((d) => d.userLabel || d.originalLabel || d.category);
      }
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
      buildSafeErrorPayload(error, "Không thể lưu ảnh phòng", "SURVEY_PHOTO_SAVE_FAILED"),
      { status: 500 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
