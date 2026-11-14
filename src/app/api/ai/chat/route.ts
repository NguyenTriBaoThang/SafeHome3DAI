import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeUserQuery } from "@/lib/rag/queryAnalysis";
import { retrieveEvidenceChunks } from "@/lib/rag/retrieval";
import { evaluateEvidenceSufficiency } from "@/lib/rag/evidenceSufficiency";
import { generateGroundedAnswer } from "@/lib/rag/groundedGenerator";
import {
  saveUserMessage,
  saveAssistantMessage,
  getRecentConversationTurns,
} from "@/lib/ai/conversationManager";

const ChatRequestSchema = z.object({
  message: z.string().min(1, "Tin nhắn không được để trống").max(2000, "Tin nhắn quá dài"),
  conversationId: z.string().optional(),
  roomContext: z
    .object({
      roomName: z.string(),
      hazardCount: z.number(),
      hazardTitles: z.array(z.string()),
      lightingLux: z.number(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const parseResult = ChatRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu yêu cầu không hợp lệ", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { message, conversationId = `conv-${Date.now()}`, roomContext } = parseResult.data;

    // 1. Retrieve recent history for conversational memory
    const history = await getRecentConversationTurns(conversationId, 4);

    // 2. Query Analysis & Rewriting for follow-up resolution
    const analysis = analyzeUserQuery(message, history);

    // 3. Hybrid Knowledge Retrieval
    const retrievedChunks = retrieveEvidenceChunks(analysis.rewrittenQuery, {
      topK: 4,
      minScoreThreshold: 1.2,
      approvalOnly: true,
    });

    // 4. Evidence Sufficiency Evaluation
    const evaluation = evaluateEvidenceSufficiency(
      analysis.rewrittenQuery,
      analysis.intent,
      retrievedChunks
    );

    // 5. Grounded Answer Generation
    const generationResult = await generateGroundedAnswer({
      query: message,
      rewrittenQuery: analysis.rewrittenQuery,
      intent: analysis.intent,
      evaluation,
      retrievedChunks,
      roomContext,
    });

    // 6. Persist to Database
    try {
      await saveUserMessage(conversationId, message);
      await saveAssistantMessage(conversationId, generationResult);
    } catch (dbErr) {
      console.warn("DB persistence warning (running in memory fallback):", dbErr);
    }

    // 7. Structured Response Contract
    return NextResponse.json({
      conversation_id: conversationId,
      answer: generationResult.answer,
      evidence_status: generationResult.evidenceStatus,
      response_mode: generationResult.responseMode,
      citations: generationResult.citations,
      retrieved_source_ids: generationResult.retrievedChunkIds,
      model_provider: generationResult.modelProvider,
      model_name: generationResult.modelName,
      suggested_follow_ups: generationResult.suggestedFollowUps,
      warnings: generationResult.warnings,
      created_at: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Lỗi xử lý AI Chat:", error);
    return NextResponse.json(
      { error: "Lỗi nội bộ khi xử lý hội thoại RAG", details: error.message },
      { status: 500 }
    );
  }
}

