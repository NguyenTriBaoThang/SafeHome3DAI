import { NextResponse } from "next/server";
import { completeRoomSurvey } from "@/lib/survey/surveyManager";

export async function POST(
  request: Request,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const result = await completeRoomSurvey(params.roomId);
    return NextResponse.json({
      success: true,
      message: "Khảo sát phòng đã hoàn thành thành công",
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi hoàn thành khảo sát phòng:", error);
    return NextResponse.json(
      { error: error.message || "Không thể hoàn thành khảo sát" },
      { status: 400 }
    );
  }
}

