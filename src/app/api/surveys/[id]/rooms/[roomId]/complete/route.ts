import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { completeRoomSurvey } from "@/lib/survey/surveyManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string; roomId: string }> }
) {
  const params = await routeParams;
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
      buildSafeErrorPayload(error, "Không thể hoàn thành khảo sát", "SURVEYS_ROOMS_COMPLETE_ERROR"),
      { status: 400 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
