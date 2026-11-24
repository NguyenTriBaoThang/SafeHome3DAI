import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { runRAGEvaluationSuite } from "@/lib/rag/evaluator";

async function GETHandler() {
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


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
