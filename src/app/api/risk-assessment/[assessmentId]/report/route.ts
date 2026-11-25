import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import {
  loadAssessmentSnapshot,
  generateAssessmentReport,
} from "@/lib/risk/assessmentManager";
import { DemoDataExportBlockedError } from "@/lib/persistence/demoBoundary";
import { recordAuditEventBestEffort } from "@/lib/persistence/reliablePersistence";

async function GETHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ assessmentId: string }> }
) {
  const params = await routeParams;
  try {
    const { assessmentId } = params;
    const allowDemoPreview = req.nextUrl.searchParams.get("preview") === "demo";
    const snapshot = await loadAssessmentSnapshot(assessmentId);

    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: "Không tìm thấy hồ sơ thẩm định để xuất báo cáo." },
        { status: 404 }
      );
    }

    const report = generateAssessmentReport(snapshot, {
      strictFieldEvidence: true,
      allowDemoPreview,
    });
    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    if (error instanceof DemoDataExportBlockedError) {
      await recordAuditEventBestEffort({
        dataPartition: "DEMO",
        resourceType: "REPORT_EXPORT",
        resourceId: params.assessmentId,
        action: "DEMO_EXPORT_BLOCKED",
        status: "blocked",
        details: error.message,
      });
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
