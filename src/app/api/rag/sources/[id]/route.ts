import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
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


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
