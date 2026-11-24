import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { hydrateVisionAnalysis } from "@/lib/vision/visionPersistence";

async function GETHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ roomId: string }> }
) {
  const params = await routeParams;
  try {
    const { roomId } = params;
    const images = await prisma.roomImage.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      include: {
        analyses: {
          include: {
            detections: true,
            observations: { include: { clarifications: true } },
          },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    const mapped = images.map((img) => ({
      id: img.id,
      roomId: img.roomId,
      fileUrl: `/api/vision/images/${encodeURIComponent(img.id)}/file`,
      storageKey: img.storageKey,
      viewpoint: img.viewpoint,
      caption: img.caption,
      createdAt: img.createdAt,
      latestAnalysis: img.analyses[0] ? hydrateVisionAnalysis(img.analyses[0]) : null,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
