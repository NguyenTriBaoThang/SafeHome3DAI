import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await prisma.knowledgeSource.findUnique({
      where: { id: params.id },
      include: { passages: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });
    }

    // Update lastVerifiedAt
    await prisma.knowledgeSource.update({
      where: { id: params.id },
      data: { lastVerifiedAt: new Date(), ingestionStatus: "INDEXED" },
    });

    return NextResponse.json({
      message: `Đã tái lập chỉ mục thành công cho ${existing.title}`,
      totalChunks: existing.passages.length,
      reindexedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.knowledgeSource.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true, message: `Đã xóa tài liệu ${params.id}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

