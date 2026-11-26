import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { hydrateVisionAnalysis } from "@/lib/vision/visionPersistence";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function GETHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ analysisId: string }> }
) {
  const params = await routeParams;
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
      buildSafeErrorPayload(error, "Lỗi hệ thống", "VISION_ANALYSES_ERROR"),
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
