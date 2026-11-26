import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { getRoomSurveyState } from "@/lib/survey/surveyManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string; roomId: string }> }
) {
  const params = await routeParams;
  try {
    const state = await getRoomSurveyState(params.roomId);
    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    console.error("Lỗi lấy trạng thái phòng khảo sát:", error);
    return NextResponse.json(
      buildSafeErrorPayload(error, "Không tìm thấy phòng khảo sát", "SURVEYS_ROOMS_ERROR"),
      { status: 404 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
