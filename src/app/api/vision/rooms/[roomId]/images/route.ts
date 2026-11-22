import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { hydrateVisionAnalysis } from "@/lib/vision/visionPersistence";

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
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

