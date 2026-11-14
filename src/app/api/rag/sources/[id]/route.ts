import { NextResponse } from "next/server";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const source = CURATED_KNOWLEDGE_SOURCES.find((s) => s.id === params.id);
    if (!source) {
      return NextResponse.json(
        { error: `Không tìm thấy tài liệu với ID: ${params.id}` },
        { status: 404 }
      );
    }
    return NextResponse.json(source);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

