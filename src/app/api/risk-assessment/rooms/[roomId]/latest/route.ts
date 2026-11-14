import { NextRequest, NextResponse } from "next/server";
import { getLatestAssessmentForRoom } from "@/lib/risk/assessmentManager";

export async function GET(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
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
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

