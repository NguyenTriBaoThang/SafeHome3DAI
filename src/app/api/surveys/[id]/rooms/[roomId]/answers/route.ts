import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveRoomAnswer } from "@/lib/survey/surveyManager";
import { AnswerSource, ConfirmationStatus } from "@/lib/survey/types";

const SubmitAnswerSchema = z.object({
  questionId: z.string().min(1, "Question ID không được để trống"),
  value: z.any(),
  answerSource: z.enum([
    "USER_SELECTED",
    "USER_FREE_TEXT",
    "USER_ESTIMATED",
    "NLP_EXTRACTED",
    "VISION_SUGGESTED",
    "IMPORTED_MEASUREMENT",
  ]).optional(),
  confirmationStatus: z.enum([
    "CONFIRMED",
    "PENDING_CONFIRMATION",
    "UNKNOWN",
  ]).optional(),
});

async function POSTHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string; roomId: string }> }
) {
  const params = await routeParams;
  try {
    const body = await request.json();
    const parseResult = SubmitAnswerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu câu trả lời không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { questionId, value, answerSource, confirmationStatus } = parseResult.data;

    const result = await saveRoomAnswer({
      roomId: params.roomId,
      questionId,
      value,
      answerSource: answerSource as AnswerSource,
      confirmationStatus: confirmationStatus as ConfirmationStatus,
    });

    return NextResponse.json({
      success: true,
      message: "Đã lưu câu trả lời thành công",
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi lưu câu trả lời khảo sát:", error);
    return NextResponse.json(
      { success: false, code: "SURVEYS_ROOMS_ANSWERS_ERROR", error: "Không thể lưu câu trả lời" },
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
