import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { loadAssessmentSnapshot } from "@/lib/risk/assessmentManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function GETHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ assessmentId: string }> }
) {
  const params = await routeParams;
  try {
    const { assessmentId } = params;
    const snapshot = await loadAssessmentSnapshot(assessmentId);

    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy hồ sơ thẩm định nguy cơ này." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: snapshot });
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi hệ thống", "RISKASSESSMENT_ERROR"),
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
