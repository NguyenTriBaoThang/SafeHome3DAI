import { NextResponse } from "next/server";
import {
  getConversationWithMessages,
  deleteConversation,
  renameConversation,
} from "@/lib/ai/conversationManager";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await deleteConversation(params.id);
    return NextResponse.json({ success: true, message: "Đã xóa cuộc trò chuyện" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

