import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { exportSurveyData } from "@/lib/survey/surveyManager";
import {
  assertRealFieldEvidenceForReport,
  DemoDataExportBlockedError,
} from "@/lib/persistence/demoBoundary";
import { recordAuditEventBestEffort } from "@/lib/persistence/reliablePersistence";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const url = new URL(request.url);
    const allowDemoPreview = url.searchParams.get("preview") === "demo";

    const data = await exportSurveyData(params.id);
    const banner = assertRealFieldEvidenceForReport(
      { id: data.surveyId, dataPartition: (data as any).dataPartition },
      { allowDemoPreview }
    );

    return NextResponse.json({
      success: true,
      dataPartition: banner.dataPartition,
      isDemo: banner.isDemo,
      demoBanner: banner.bannerText,
      export: data,
    });
  } catch (error: any) {
    if (error instanceof DemoDataExportBlockedError) {
      await recordAuditEventBestEffort({
        dataPartition: "DEMO",
        resourceType: "SURVEY",
        resourceId: params.id,
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
      { success: false, code: "SURVEYS_EXPORT_ERROR", error: "Không thể xuất dữ liệu" },
      { status: error?.message?.includes("not found") ? 404 : 500 }
    );
  }
}

export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
