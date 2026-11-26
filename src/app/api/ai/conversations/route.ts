import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { listConversations, createConversation } from "@/lib/ai/conversationManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function GETHandler() {
  try {
    const list = await listConversations();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json(buildSafeErrorPayload(error, "Lỗi hệ thống", "AI_CONVERSATIONS_ERROR"), { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const title = body.title || "Tư vấn an toàn phòng ngừa té ngã";
    const newConv = await createConversation(title);
    return NextResponse.json(newConv, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(buildSafeErrorPayload(error, "Lỗi hệ thống", "AI_CONVERSATIONS_ERROR"), { status: 500 });
  }
}


export const GET = withAccount(GETHandler);
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
