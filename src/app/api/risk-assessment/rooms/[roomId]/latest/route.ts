import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { getLatestAssessmentForRoom } from "@/lib/risk/assessmentManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function GETHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ roomId: string }> }
) {
  const params = await routeParams;
  try {
    const { roomId } = params;
    const snapshot = await getLatestAssessmentForRoom(roomId);

    if (!snapshot) {
      return NextResponse.json(
        { success: false, error: "Chưa có dữ liệu thẩm định cho không gian này." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: snapshot });
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi hệ thống", "RISKASSESSMENT_ROOMS_LATEST_ERROR"),
      { status: 500 }
    );
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
