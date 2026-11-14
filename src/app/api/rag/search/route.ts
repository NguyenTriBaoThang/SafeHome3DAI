import { NextResponse } from "next/server";
import { retrieveEvidenceChunks } from "@/lib/rag/retrieval";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, topK = 4, minScoreThreshold = 1.0 } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Truy vấn tìm kiếm không hợp lệ" }, { status: 400 });
    }

    const chunks = retrieveEvidenceChunks(query, {
      topK,
      minScoreThreshold,
      approvalOnly: true,
    });

    return NextResponse.json({
      query,
      total_found: chunks.length,
      chunks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

