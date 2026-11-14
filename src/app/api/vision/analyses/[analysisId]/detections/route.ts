import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { DetectionCategory } from "@/lib/vision/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { analysisId: string } }
) {
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

    if (!category || !bbox) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin phân loại hoặc tọa độ khung bao." },
        { status: 400 }
      );
    }

    const newDetection = await prisma.objectDetection.create({
      data: {
        analysisId,
        category,
        originalLabel: label || category,
        userLabel: label || category,
        confidence: 1.0, // Manual annotation has full human confidence
        bboxJson: JSON.stringify(bbox),
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
        bbox,
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

