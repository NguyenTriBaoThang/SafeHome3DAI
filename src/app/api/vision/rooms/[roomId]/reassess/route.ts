import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { triggerRiskAssessmentFromVision } from "@/lib/vision/surveySyncAdapter";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ roomId: string }> }
) {
  const params = await routeParams;
  try {
    const { roomId } = params;
    const snapshot = await triggerRiskAssessmentFromVision(roomId);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi hệ thống", "VISION_ROOMS_REASSESS_ERROR"),
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
