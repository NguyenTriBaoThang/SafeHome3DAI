import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getQuestionById } from "@/lib/survey/questionBank";
import { interpretVietnameseAnswer } from "@/lib/survey/nlpInterpreter";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

const InterpretNLPSchema = z.object({
  questionId: z.string().min(1),
  userInput: z.string().min(1, "Câu trả lời không được để trống"),
});

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();
    const parseResult = InterpretNLPSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { questionId, userInput } = parseResult.data;
    const question = getQuestionById(questionId);

    if (!question) {
      return NextResponse.json(
        { error: `Không tìm thấy câu hỏi với ID ${questionId}` },
        { status: 404 }
      );
    }

    const proposal = interpretVietnameseAnswer(question, userInput);

    return NextResponse.json({
      success: true,
      proposal,
    });
  } catch (error: any) {
    console.error("Lỗi thông dịch câu trả lời ngôn ngữ tự nhiên:", error);
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi xử lý ngôn ngữ tự nhiên", "SURVEY_NLP_ERROR"),
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
