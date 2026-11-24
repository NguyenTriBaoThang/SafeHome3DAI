import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { runAndPersistAssessment, getLatestAssessmentForRoom } from "@/lib/risk/assessmentManager";

async function POSTHandler(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.evidenceStatus === "PHOTO_DRAFT") return NextResponse.json(
      { success: false, error: "Bản dựng ảnh chưa có số đo xác minh; hãy bổ sung khảo sát.", code: "NEEDS_VERIFICATION" }, { status: 422 }
    );

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


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
