import { analyzeUserQuery } from "@/lib/rag/queryAnalysis";
import { retrieveEvidenceChunks } from "@/lib/rag/retrieval";
import { evaluateEvidenceSufficiency } from "@/lib/rag/evidenceSufficiency";
import { generateGroundedAnswer } from "@/lib/rag/groundedGenerator";
import {
  saveUserMessage,
  saveAssistantMessage,
  getRecentConversationTurns,
} from "@/lib/ai/conversationManager";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const { message, conversationId = `conv-${Date.now()}`, roomContext } = rawBody;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Tin nhắn không hợp lệ" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 1. Retrieve recent history for conversational memory
    const history = await getRecentConversationTurns(conversationId, 4);

    // 2. Query Analysis & Rewriting for follow-ups
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

    // 5. Generate Grounded Answer
    const generationResult = await generateGroundedAnswer({
      query: message,
      rewrittenQuery: analysis.rewrittenQuery,
      intent: analysis.intent,
      evaluation,
      retrievedChunks,
      roomContext,
    });

    // 6. Persist to DB
    try {
      await saveUserMessage(conversationId, message);
      await saveAssistantMessage(conversationId, generationResult);
    } catch (e) {
      console.warn("DB persistence warning:", e);
    }

    // 7. Stream text chunks via Server-Sent Events (SSE)
    const encoder = new TextEncoder();
    const fullText = generationResult.answer;
    const chunkSize = 24; // Stream words/characters smoothly

    const stream = new ReadableStream({
      async start(controller) {
        // Send initial metadata
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "meta",
              evidence_status: generationResult.evidenceStatus,
              response_mode: generationResult.responseMode,
              model_provider: generationResult.modelProvider,
            })}\n\n`
          )
        );

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
          // Micro delay to simulate streaming cadence
          await new Promise((r) => setTimeout(r, 20));
        }

        // Send final verified payload with citations
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              conversation_id: conversationId,
              citations: generationResult.citations,
              suggested_follow_ups: generationResult.suggestedFollowUps,
              warnings: generationResult.warnings,
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
      JSON.stringify({ error: "Lỗi streaming", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

