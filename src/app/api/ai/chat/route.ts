import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { ChatRequestSchema } from "@/lib/ai/chatRequest";
import { processCopilotChat } from "@/lib/ai/geminiChatService";
import {
  saveUserMessage,
  saveAssistantMessage,
  getRecentConversationTurns,
} from "@/lib/ai/conversationManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(request: Request) {
  try {
    const rawBody = await request.json();
    const parseResult = ChatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { message, conversationId = `conv-${Date.now()}`, roomId, roomState } = parseResult.data;

    // 1. Retrieve recent history for conversational memory
    const history = await getRecentConversationTurns(conversationId, 6);

    // 2. Process Copilot Chat (Live Gemini / Grounded RAG with Tool Registry)
    const copilotResult = await processCopilotChat({
      message,
      history,
      roomId,
      roomState,
      signal: request.signal,
      conversationId,
    });

    // 3. Persist to Database
    try {
      await saveUserMessage(conversationId, message);
      await saveAssistantMessage(conversationId, {
        answer: copilotResult.answer,
        evidenceStatus: copilotResult.evidenceStatus as any,
        responseMode: copilotResult.responseMode as any,
        citations: copilotResult.citations,
        retrievedChunkIds: copilotResult.citations.map((c) => c.chunkId),
        modelProvider: copilotResult.modelProvider,
        modelName: copilotResult.modelName,
        suggestedFollowUps: copilotResult.suggestedFollowUps,
        warnings: copilotResult.warnings || [],
        sourceSupportMap: copilotResult.sourceSupportMap,
        documentAuditTrail: copilotResult.documentAuditTrail,
        evidenceBreakdown: copilotResult.evidenceBreakdown,
      });
    } catch (dbErr) {
      console.warn("DB persistence warning:", dbErr);
    }

    // 4. Return Structured Response
    return NextResponse.json({
      conversation_id: conversationId,
      answer: copilotResult.answer,
      evidence_status: copilotResult.evidenceStatus,
      response_mode: copilotResult.responseMode,
      citations: copilotResult.citations,
      model_provider: copilotResult.modelProvider,
      model_name: copilotResult.modelName,
      suggested_follow_ups: copilotResult.suggestedFollowUps,
      tool_invocations: copilotResult.toolInvocations,
      warnings: copilotResult.warnings,
      source_support_map: copilotResult.sourceSupportMap,
      document_audit_trail: copilotResult.documentAuditTrail,
      evidence_breakdown: copilotResult.evidenceBreakdown,
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Lỗi xử lý AI Chat:", error);
    return NextResponse.json(
      buildSafeErrorPayload(error, "Lỗi nội bộ khi xử lý hội thoại SafeHome Copilot 2.0", "COPILOT_CHAT_ERROR"),
      { status: 500 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
