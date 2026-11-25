import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { listDocumentRegistryEntries } from "@/lib/rag/documentRegistry";

async function GETHandler() {
  try {
    const sourcesSummary = listDocumentRegistryEntries().map((src) => ({
      id: src.id,
      title: src.title,
      publisher: src.publisher || src.organization,
      officialUrl: src.officialUrl || src.url,
      publicationDate: src.publicationDate,
      lastVerifiedAt: src.lastVerifiedAt,
      language: src.language,
      license: src.license,
      version: src.version,
      contentHash: src.contentHash,
      documentType: src.documentType,
      approvalStatus: src.approvalStatus,
      ingestionStatus: src.ingestionStatus,
      isOutdated: src.isOutdated,
      urlValid: src.urlValid,
      totalPassages: src.passages.length,
    }));

    return NextResponse.json(sourcesSummary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
