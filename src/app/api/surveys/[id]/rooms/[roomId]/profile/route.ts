import { NextResponse } from "next/server";
import { getRoomSurveyState } from "@/lib/survey/surveyManager";
import { convertRoomProfileToSceneDraft } from "@/lib/survey/sceneDraftAdapter";

export async function GET(
  request: Request,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const state = await getRoomSurveyState(params.roomId);

    if (!state.profile) {
      return NextResponse.json(
        { error: "Hồ sơ phòng chưa được khởi tạo" },
        { status: 404 }
      );
    }

    const sceneDraft = convertRoomProfileToSceneDraft(state.profile);

    return NextResponse.json({
      success: true,
      profile: state.profile,
      sceneDraft,
    });
  } catch (error: any) {
    console.error("Lỗi lấy hồ sơ phòng:", error);
    return NextResponse.json(
      { error: "Không thể lấy hồ sơ phòng", details: error.message },
      { status: 500 }
    );
  }
}

