import { NextResponse } from "next/server";
import { runRAGEvaluationSuite } from "@/lib/rag/evaluator";

export async function GET() {
  try {
    const report = await runRAGEvaluationSuite();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: "Lỗi thực thi kiểm thử đánh giá RAG", details: error.message },
      { status: 500 }
    );
  }
}

