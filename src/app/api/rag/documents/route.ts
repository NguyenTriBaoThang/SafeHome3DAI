import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { ingestDocument } from "@/lib/rag/ingestion";
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
      rawText,
      documentType = "GUIDELINE",
    } = body;

    const ingested = ingestDocument({
      documentId,
      title,
      publisher,
      officialUrl,
      publicationDate,
      rawText,
      documentType,
    });

    // Optionally save to SQLite via Prisma
    try {
      await prisma.knowledgeSource.create({
        data: {
          id: ingested.documentId,
          title: ingested.title,
          organization: ingested.publisher,
          publisher: ingested.publisher,
          url: ingested.officialUrl || "https://safehome3d.ai/docs",
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
        message: "Nạp và phân tách đoạn trích thành công",
        document: ingested,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Lỗi nạp tài liệu", details: error.message },
      { status: 400 }
    );
  }
}


export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
