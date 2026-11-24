import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { saveClarificationAnswer } from "@/lib/vision/clarificationEngine";

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
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
