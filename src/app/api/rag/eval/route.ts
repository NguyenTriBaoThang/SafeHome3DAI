import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { runRAGEvaluationSuite } from "@/lib/rag/evaluator";
import { runA09BenchmarkSuite } from "@/lib/rag/benchmarkA09";

async function GETHandler(request: Request) {
  try {
    const url = new URL(request.url);
    const suite = url.searchParams.get("suite");
    if (suite === "a09") {
      const a09Report = await runA09BenchmarkSuite();
      return NextResponse.json(a09Report);
    }
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
