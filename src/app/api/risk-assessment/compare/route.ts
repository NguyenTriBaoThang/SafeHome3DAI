import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { compareAssessments } from "@/lib/risk/comparisonEngine";
import {
  loadAssessmentSnapshot,
  compareSnapshots,
} from "@/lib/risk/assessmentManager";
import { AssessmentSnapshot } from "@/lib/risk/types";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.beforeSnapshotId && body.afterSnapshotId) {
      await Promise.all([loadAssessmentSnapshot(body.beforeSnapshotId), loadAssessmentSnapshot(body.afterSnapshotId)]);
      const result = compareSnapshots(body.beforeSnapshotId, body.afterSnapshotId);
      if (!result) {
        return NextResponse.json(
          { success: false, error: "Không tìm thấy một trong hai bản ghi snapshot để so sánh." },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: result });
    }

    if (body.beforeSnapshot && body.afterSnapshot) {
      const result = compareAssessments(
        body.beforeSnapshot as AssessmentSnapshot,
        body.afterSnapshot as AssessmentSnapshot
      );
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: "Thiếu dữ liệu trước (before) và sau (after) để so sánh." },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi hệ thống", "RISKASSESSMENT_COMPARE_ERROR"),
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
