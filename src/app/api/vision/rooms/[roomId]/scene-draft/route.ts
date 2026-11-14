import { NextRequest, NextResponse } from "next/server";
import { createSceneDraftFromVision } from "@/lib/vision/sceneDraftAdapter";

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    const draft = await createSceneDraftFromVision(roomId);
    return NextResponse.json({ success: true, data: draft });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

