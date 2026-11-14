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
      data: state,
    });
  } catch (error: any) {
    console.error("Lỗi lấy trạng thái phòng khảo sát:", error);
    return NextResponse.json(
      { error: "Không tìm thấy phòng khảo sát", details: error.message },
      { status: 404 }
    );
  }
}

