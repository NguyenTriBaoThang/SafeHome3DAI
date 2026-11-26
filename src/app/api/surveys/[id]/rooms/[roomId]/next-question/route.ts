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
      nextQuestion: state.nextQuestion,
      progress: state.progress,
    });
  } catch (error: any) {
    console.error("Lỗi lấy câu hỏi tiếp theo:", error);
    return NextResponse.json(
      { success: false, code: "SURVEYS_ROOMS_NEXTQUESTION_ERROR", error: "Lỗi tải câu hỏi tiếp theo" },
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
