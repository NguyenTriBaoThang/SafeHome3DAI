import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/ingestion";
import { registerDocumentForReview } from "@/lib/rag/documentRegistry";
import { prisma } from "@/lib/database/prisma";

async function POSTHandler(request: Request) {
  try {
    const body = await request.json();
    const {
      documentId = `DOC_${Date.now()}`,
      title,
      publisher,
      officialUrl = "",
      publicationDate,
      language = "vi",
      version = "1.0",
      license,
      rawText,
      documentType = "GUIDELINE",
    } = body;

    const ingested = ingestDocument({
      documentId,
      title,
      publisher,
      officialUrl,
      publicationDate,
      language,
      version,
      license,
      rawText,
      documentType,
    });

    const registered = registerDocumentForReview({
      id: ingested.documentId,
      title: ingested.title,
      organization: ingested.publisher,
      publisher: ingested.publisher,
      url: ingested.officialUrl,
      officialUrl: ingested.officialUrl,
      publicationDate: ingested.publicationDate,
      retrievedAt: new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString(),
      language: ingested.language,
      license: ingested.license,
      documentType: (ingested.documentType as "GUIDELINE" | "STANDARD" | "RESEARCH") || "GUIDELINE",
      version: ingested.version,
      ingestionStatus: "INDEXED",
      contentHash: ingested.contentHash,
      sourceStatus: "CURATED",
      passages: ingested.chunks.map((chk) => ({
        id: chk.chunkId,
        section: chk.sectionTitle,
        passageText: chk.chunkText,
        pageNumber: chk.pageNumber,
        startOffset: chk.startOffset,
        endOffset: chk.endOffset,
        contentHash: chk.contentHash,
        keywords: chk.keywords,
        relatedRules: [],
      })),
    });

    // Optionally save to SQLite via Prisma
    try {
      await prisma.knowledgeSource.create({
        data: {
          id: ingested.documentId,
          title: ingested.title,
          organization: ingested.publisher,
          publisher: ingested.publisher,
          url: ingested.officialUrl,
          officialUrl: ingested.officialUrl,
          publicationDate: ingested.publicationDate,
          language: ingested.language,
          documentType: ingested.documentType,
          version: ingested.version,
          approvalStatus: ingested.approvalStatus,
          ingestionStatus: ingested.ingestionStatus,
          contentHash: ingested.contentHash,
          passages: {
            create: ingested.chunks.map((chk) => ({
              id: chk.chunkId,
              section: chk.sectionTitle,
              passageText: chk.chunkText,
              startOffset: chk.startOffset,
              endOffset: chk.endOffset,
              contentHash: chk.contentHash,
              keywords: JSON.stringify(chk.keywords),
            })),
          },
        },
      });
    } catch (dbErr) {
      console.warn("DB save skipped for ingested document:", dbErr);
    }

    return NextResponse.json(
      {
        message: "Nạp tài liệu vào hàng chờ thẩm định (PENDING) thành công",
        document: ingested,
        registryStatus: registered.approvalStatus,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, code: "RAG_DOCUMENTS_ERROR", error: "Lỗi nạp tài liệu" },
      { status: 400 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
