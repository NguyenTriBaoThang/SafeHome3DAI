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
      findings: state.findings,
      totalFindings: state.findings.length,
    });
  } catch (error: any) {
    console.error("Lỗi lấy danh sách nguy cơ khảo sát:", error);
    return NextResponse.json(
      { error: "Không thể lấy danh sách nguy cơ", details: error.message },
      { status: 500 }
    );
  }
}

