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
      data: state,
    });
  } catch (error: any) {
    console.error("Lỗi lấy trạng thái phòng khảo sát:", error);
    return NextResponse.json(
      { success: false, code: "SURVEYS_ROOMS_ERROR", error: "Không tìm thấy phòng khảo sát" },
      { status: 404 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
