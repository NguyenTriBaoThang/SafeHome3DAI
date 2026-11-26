import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { saveClarificationAnswer } from "@/lib/vision/clarificationEngine";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(
  req: NextRequest,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const { id } = params;
    const body = await req.json();
    const { answer } = body;

    if (typeof answer !== "string" || answer.length > 100) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp câu trả lời." },
        { status: 400 }
      );
    }

    const result = await saveClarificationAnswer(id, answer);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi hệ thống", "VISION_CLARIFICATIONS_ANSWER_ERROR"),
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
