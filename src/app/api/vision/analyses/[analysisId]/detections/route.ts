import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { DetectionCategory } from "@/lib/vision/types";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";
import { normalizeBoundingBox } from "@/lib/vision/providers/normalization";

async function POSTHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ analysisId: string }> }
) {
  const params = await routeParams;
  try {
    const { analysisId } = params;
    const body = await req.json();

    const {
      category,
      label,
      bbox,
    }: {
      category: DetectionCategory;
      label: string;
      bbox: { xMin: number; yMin: number; xMax: number; yMax: number };
    } = body;

    if (typeof category !== "string" || !Object.hasOwn(CATEGORY_TAXONOMY, category) || !bbox || (label !== undefined && (typeof label !== "string" || label.length > 200))) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin phân loại hoặc tọa độ khung bao." },
        { status: 400 }
      );
    }

    let box;
    try { box = normalizeBoundingBox(bbox); }
    catch { return NextResponse.json({ success: false, error: "Tọa độ không hợp lệ." }, { status: 400 }); }
    if (!await prisma.visionAnalysis.findUnique({ where: { id: analysisId } })) return NextResponse.json({ success: false, error: "Không tìm thấy phân tích." }, { status: 404 });
    const newDetection = await prisma.objectDetection.create({
      data: {
        analysisId,
        category,
        originalLabel: label || category,
        userLabel: label || category,
        confidence: 1.0, // Manual annotation has full human confidence
        bboxJson: JSON.stringify(box),
        source: "MANUAL_ANNOTATION",
        verificationStatus: "CONFIRMED",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newDetection.id,
        category: newDetection.category,
        originalLabel: newDetection.originalLabel,
        userLabel: newDetection.userLabel,
        confidence: newDetection.confidence,
        bbox: box,
        source: newDetection.source,
        verificationStatus: newDetection.verificationStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
