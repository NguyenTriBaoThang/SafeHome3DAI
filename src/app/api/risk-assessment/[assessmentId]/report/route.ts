import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import {
  loadAssessmentSnapshot,
  generateAssessmentReport,
} from "@/lib/risk/assessmentManager";

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
        { success: false, error: "Không tìm thấy hồ sơ thẩm định để xuất báo cáo." },
        { status: 404 }
      );
    }

    const report = generateAssessmentReport(snapshot);
    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
