import { NextRequest, NextResponse } from "next/server";
import {
  getAssessmentSnapshotById,
  generateAssessmentReport,
} from "@/lib/risk/assessmentManager";

export async function GET(
  req: NextRequest,
  { params }: { params: { assessmentId: string } }
) {
  try {
    const { assessmentId } = params;
    const snapshot = getAssessmentSnapshotById(assessmentId);

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

