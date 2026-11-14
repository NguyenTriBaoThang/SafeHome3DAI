import { NextRequest, NextResponse } from "next/server";
import { syncConfirmedVisionFactsToSurvey } from "@/lib/vision/surveySyncAdapter";

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const { roomId } = params;
    const result = await syncConfirmedVisionFactsToSurvey(roomId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

