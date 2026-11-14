import { NextRequest, NextResponse } from "next/server";
import { triggerRiskAssessmentFromVision } from "@/lib/vision/surveySyncAdapter";

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    const snapshot = await triggerRiskAssessmentFromVision(roomId);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

