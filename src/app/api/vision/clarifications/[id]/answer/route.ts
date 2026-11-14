import { NextRequest, NextResponse } from "next/server";
import { saveClarificationAnswer } from "@/lib/vision/clarificationEngine";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { answer } = body;

    if (!answer) {
      return NextResponse.json(
        { success: false, error: "Vui lòng cung cấp câu trả lời." },
        { status: 400 }
      );
    }

    const result = await saveClarificationAnswer(id, answer);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

