import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import {
  listDocumentRegistryEntries,
  approveDocument,
  rejectDocument,
  removeDocument,
} from "@/lib/rag/documentRegistry";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const source = listDocumentRegistryEntries().find((s) => s.id === params.id);
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

async function PATCHHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const body = await request.json();
    const { action, reason, reviewer } = body as {
      action?: "APPROVE" | "REJECT" | "REMOVE";
      reason?: string;
      reviewer?: string;
    };

    if (action === "APPROVE") {
      const updated = approveDocument(params.id, reviewer);
      return NextResponse.json({ message: "Đã phê duyệt tài liệu", document: updated });
    }
    if (action === "REJECT") {
      const updated = rejectDocument(params.id, reason || "Không đạt tiêu chuẩn kiểm chứng", reviewer);
      return NextResponse.json({ message: "Đã từ chối tài liệu", document: updated });
    }
    if (action === "REMOVE") {
      const removed = removeDocument(params.id);
      if (!removed) {
        return NextResponse.json({ error: `Không tìm thấy tài liệu: ${params.id}` }, { status: 404 });
      }
      return NextResponse.json({ success: true, removedId: params.id });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export const GET = withAccount(GETHandler);
export const PATCH = withAccount(PATCHHandler);
export const dynamic = "force-dynamic";
