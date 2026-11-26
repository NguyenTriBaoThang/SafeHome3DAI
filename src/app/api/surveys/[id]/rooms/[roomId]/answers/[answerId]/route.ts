import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { saveRoomAnswer } from "@/lib/survey/surveyManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

const PatchAnswerSchema = z.object({
  value: z.any(),
});

async function PATCHHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string; roomId: string; answerId: string }> }
) {
  const params = await routeParams;
  try {
    const existing = await prisma.surveyAnswer.findUnique({
      where: { id: params.answerId },
    });

    if (!existing || existing.roomId !== params.roomId) {
      return NextResponse.json(
        { error: "Không tìm thấy câu trả lời cần sửa" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parseResult = PatchAnswerSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu chỉnh sửa không hợp lệ" },
        { status: 400 }
      );
    }

    const result = await saveRoomAnswer({
      roomId: params.roomId,
      questionId: existing.questionId,
      value: parseResult.data.value,
      answerSource: "USER_SELECTED",
      confirmationStatus: "CONFIRMED",
    });

    return NextResponse.json({
      success: true,
      message: "Đã cập nhật câu trả lời thành công",
      data: result,
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật câu trả lời:", error);
    return NextResponse.json(
      buildSafeErrorPayload(error, "Không thể cập nhật câu trả lời", "SURVEYS_ROOMS_ANSWERS_ERROR"),
      { status: 500 }
    );
  }
}


export const PATCH = withAccount(PATCHHandler);
export const dynamic = "force-dynamic";
