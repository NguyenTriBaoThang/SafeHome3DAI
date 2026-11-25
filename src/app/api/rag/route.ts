import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { processRAGQuery } from "@/lib/rag/engine";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();
    const { query, roomContext } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Câu hỏi (query) không được để trống" },
        { status: 400 }
      );
    }

    const message = await processRAGQuery(query, roomContext);
    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi xử lý câu hỏi RAG", "RAG_QUERY_ERROR"),
      { status: 500 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
