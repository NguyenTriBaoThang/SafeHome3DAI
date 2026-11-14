import { NextResponse } from "next/server";
import { getRoomSurveyState } from "@/lib/survey/surveyManager";

export async function GET(
  request: Request,
  { params }: { params: { id: string; roomId: string } }
) {
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
      { error: "Lỗi tải câu hỏi tiếp theo", details: error.message },
      { status: 500 }
    );
  }
}

