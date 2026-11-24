import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import {
  getConversationWithMessages,
  deleteConversation,
  renameConversation,
} from "@/lib/ai/conversationManager";

async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    const conv = await getConversationWithMessages(params.id);
    if (!conv) {
      return NextResponse.json(
        { error: "Không tìm thấy cuộc trò chuyện" },
        { status: 404 }
      );
    }
    return NextResponse.json(conv);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function DELETEHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ id: string }> }
) {
  const params = await routeParams;
  try {
    await deleteConversation(params.id);
    return NextResponse.json({ success: true, message: "Đã xóa cuộc trò chuyện" });
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
    if (!body.title) {
      return NextResponse.json({ error: "Tiêu đề không hợp lệ" }, { status: 400 });
    }
    await renameConversation(params.id, body.title);
    return NextResponse.json({ success: true, title: body.title });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export const GET = withAccount(GETHandler);
export const DELETE = withAccount(DELETEHandler);
export const PATCH = withAccount(PATCHHandler);
export const dynamic = "force-dynamic";
