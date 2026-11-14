import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { analysisId: string } }
) {
  try {
    const { analysisId } = params;

    const analysis = await prisma.visionAnalysis.findUnique({
      where: { id: analysisId },
      include: {
        detections: true,
        observations: {
          include: {
            clarifications: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy phiên phân tích này." },
        { status: 404 }
      );
    }

    const mappedDetections = analysis.detections.map((d) => ({
      id: d.id,
      analysisId: d.analysisId,
      category: d.category,
      originalLabel: d.originalLabel,
      userLabel: d.userLabel,
      confidence: d.confidence,
      bbox: JSON.parse(d.bboxJson || "{}"),
      source: d.source,
      verificationStatus: d.verificationStatus,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        id: analysis.id,
        roomId: analysis.roomId,
        imageId: analysis.imageId,
        modelId: analysis.modelId,
        modelVersion: analysis.modelVersion,
        analysisStatus: analysis.analysisStatus,
        detections: mappedDetections,
        observations: analysis.observations,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

