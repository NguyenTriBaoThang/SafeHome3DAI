import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { getRoomSurveyState } from "@/lib/survey/surveyManager";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string; roomId: string }> }
) {
  const params = await routeParams;
  try {
    const state = await getRoomSurveyState(params.roomId);
    return NextResponse.json({
      success: true,
      findings: state.findings,
      totalFindings: state.findings.length,
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách nguy cơ khảo sát:", error);
    return NextResponse.json(
      { success: false, code: "SURVEYS_ROOMS_FINDINGS_ERROR", error: "Không thể lấy danh sách nguy cơ" },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
