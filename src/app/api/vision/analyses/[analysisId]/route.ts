import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { hydrateVisionAnalysis } from "@/lib/vision/visionPersistence";

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

    return NextResponse.json({ success: true, data: hydrateVisionAnalysis(analysis) });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

