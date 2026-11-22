import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { VerificationStatus, DetectionCategory } from "@/lib/vision/types";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";
import { normalizeBoundingBox } from "@/lib/vision/providers/normalization";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { detectionId: string } }
) {
  try {
    const { detectionId } = params;
    const body = await req.json();

    const {
      verificationStatus,
      userLabel,
      category,
      bbox,
    }: {
      verificationStatus?: VerificationStatus;
      userLabel?: string;
      category?: DetectionCategory;
      bbox?: any;
    } = body;

    if ((verificationStatus && !["PENDING_REVIEW", "CONFIRMED", "CORRECTED", "REJECTED"].includes(verificationStatus)) ||
        (category && !Object.hasOwn(CATEGORY_TAXONOMY, category)) ||
        (userLabel !== undefined && (typeof userLabel !== "string" || userLabel.length > 200))) {
      return NextResponse.json({ success: false, error: "Nhãn hoặc trạng thái xác nhận không hợp lệ." }, { status: 400 });
    }
    let validatedBox;
    if (bbox !== undefined) {
      try { validatedBox = normalizeBoundingBox(bbox); }
      catch { return NextResponse.json({ success: false, error: "Tọa độ bbox không hợp lệ." }, { status: 400 }); }
    }

    const existing = await prisma.objectDetection.findUnique({
      where: { id: detectionId }, include: { analysis: { select: { roomId: true } } },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy nhãn vật thể này." },
        { status: 404 }
      );
    }

    const updated = await prisma.objectDetection.update({
      where: { id: detectionId },
      data: {
        verificationStatus: verificationStatus || existing.verificationStatus,
        userLabel: userLabel !== undefined ? userLabel : existing.userLabel,
        category: category || existing.category,
        bboxJson: validatedBox ? JSON.stringify(validatedBox) : existing.bboxJson,
      },
    });

    // Audit event
    await prisma.visionAuditEvent.create({
      data: {
        roomId: existing.analysis.roomId,
        actionType: `DETECTION_${verificationStatus || "UPDATED"}`,
        objectId: detectionId,
        oldValue: JSON.stringify({ label: existing.originalLabel, status: existing.verificationStatus }),
        newValue: JSON.stringify({ userLabel: updated.userLabel, category: updated.category, status: updated.verificationStatus }),
        actorId: "USER",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        category: updated.category,
        originalLabel: updated.originalLabel,
        userLabel: updated.userLabel,
        confidence: updated.confidence,
        bbox: JSON.parse(updated.bboxJson),
        source: updated.source,
        verificationStatus: updated.verificationStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

