import { withAccount } from "@/lib/auth/withAccount";
import { processCopilotChat } from "@/lib/ai/geminiChatService";
import { ChatRequestSchema } from "@/lib/ai/chatRequest";
import {
  saveUserMessage,
  saveAssistantMessage,
  getRecentConversationTurns,
} from "@/lib/ai/conversationManager";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

async function POSTHandler(request: Request) {
  try {
    const rawBody = await request.json();
    const parsed = ChatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Tin nhắn không hợp lệ", details: parsed.error.flatten() }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const { message, conversationId = `conv-${Date.now()}`, roomId, roomState } = parsed.data;

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

    // 3. Persist to DB
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
    } catch (e) {
      console.warn("DB persistence warning:", e);
    }

    // 4. Stream text chunks and tool events via Server-Sent Events (SSE)
    const encoder = new TextEncoder();
    const fullText =
      copilotResult.answer && copilotResult.answer.trim().length > 0
        ? copilotResult.answer
        : "Chưa nhận được câu trả lời từ trợ lý. Vui lòng thử lại.";
    const chunkSize = 20;

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "meta",
              evidence_status: copilotResult.evidenceStatus,
              response_mode: copilotResult.responseMode,
              model_provider: copilotResult.modelProvider,
              model_name: copilotResult.modelName,
            })}\n\n`
          )
        );

        // Send tool invocations if any
        if (copilotResult.toolInvocations && copilotResult.toolInvocations.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "tools",
                tool_invocations: copilotResult.toolInvocations,
              })}\n\n`
            )
          );
        }

        // Stream text chunks
        for (let i = 0; i < fullText.length; i += chunkSize) {
          const slice = fullText.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "chunk",
                content: slice,
              })}\n\n`
            )
          );
          // Micro delay for realistic streaming cadence
          await new Promise((r) => setTimeout(r, 16));
        }

        // Send final verified payload with citations & follow-ups
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              conversation_id: conversationId,
              citations: copilotResult.citations,
              suggested_follow_ups: copilotResult.suggestedFollowUps,
              tool_invocations: copilotResult.toolInvocations,
              warnings: copilotResult.warnings,
              source_support_map: copilotResult.sourceSupportMap,
              document_audit_trail: copilotResult.documentAuditTrail,
              evidence_breakdown: copilotResult.evidenceBreakdown,
            })}\n\n`
          )
        );

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify(
        buildSafeErrorPayload(error, "Lỗi kết nối streaming Copilot", "COPILOT_STREAM_ERROR")
      ),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
