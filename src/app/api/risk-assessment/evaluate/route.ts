import { NextRequest, NextResponse } from "next/server";
import { runAndPersistAssessment, getLatestAssessmentForRoom } from "@/lib/risk/assessmentManager";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.roomId && !body.dimensions && !body.floor) {
      // Look up existing room or profile
      const existing = await getLatestAssessmentForRoom(body.roomId);
      if (existing) {
        return NextResponse.json({ success: true, data: existing });
      }
    }

    const snapshot = await runAndPersistAssessment(body);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error: any) {
    console.error("[API risk-assessment/evaluate] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi khi thẩm định nguy cơ môi trường" },
      { status: 400 }
    );
  }
}

