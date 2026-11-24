import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

async function GETHandler() {
  try {
    const sourcesSummary = CURATED_KNOWLEDGE_SOURCES.map((src) => ({
      id: src.id,
      title: src.title,
      publisher: src.publisher || src.organization,
      officialUrl: src.officialUrl || src.url,
      publicationDate: src.publicationDate,
      lastVerifiedAt: src.lastVerifiedAt,
      language: src.language,
      documentType: src.documentType,
      approvalStatus: src.approvalStatus,
      ingestionStatus: src.ingestionStatus,
      totalPassages: src.passages.length,
    }));

    return NextResponse.json(sourcesSummary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
