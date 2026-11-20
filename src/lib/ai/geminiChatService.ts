import { COPILOT_TOOLS, executeCopilotTool, ToolExecutionResult } from "./copilotToolRegistry";
import { getSafeHomeSystemContext, formatSystemContextPrompt, resolveContextReference } from "./safeHomeContextService";
import { retrieveEvidenceChunks } from "@/lib/rag/retrieval";
import { evaluateEvidenceSufficiency } from "@/lib/rag/evidenceSufficiency";
import { generateGroundedAnswer } from "@/lib/rag/groundedGenerator";
import { analyzeUserQuery, ConversationTurn } from "@/lib/rag/queryAnalysis";
import { StructuredCitation } from "@/lib/rag/types";

export interface CopilotChatOptions {
  message: string;
  history?: ConversationTurn[];
  roomId?: string;
  conversationId?: string;
  attachedImageBase64?: string;
}

export interface CopilotChatResponse {
  answer: string;
  evidenceStatus: string;
  responseMode: string;
  citations: StructuredCitation[];
  modelProvider: string;
  modelName: string;
  suggestedFollowUps: string[];
  toolInvocations: ToolExecutionResult[];
  warnings?: string[];
}

/**
 * Main AI Copilot 2.0 Chat Service
 */
export async function processCopilotChat(options: CopilotChatOptions): Promise<CopilotChatResponse> {
  const { message, history = [], roomId, conversationId } = options;

  // 1. Resolve context and references
  const sysContext = getSafeHomeSystemContext(roomId);
  const resolvedRef = resolveContextReference(message, sysContext);

  // 2. Query Analysis & RAG Retrieval
  const analysis = analyzeUserQuery(message, history.slice(-4));

  const retrievedChunks = retrieveEvidenceChunks(analysis.rewrittenQuery, {
    topK: 4,
    minScoreThreshold: 1.1,
    approvalOnly: true,
  });

  const evaluation = evaluateEvidenceSufficiency(
    analysis.rewrittenQuery,
    analysis.intent,
    retrievedChunks
  );

  // 3. Check for direct Tool Calling intents from Context Resolver
  const toolInvocations: ToolExecutionResult[] = [];
  if (resolvedRef.inferredIntent === "FOCUS_3D" && resolvedRef.resolvedTargetId) {
    const toolRes = await executeCopilotTool("focus3DObject", { objectId: resolvedRef.resolvedTargetId }, roomId);
    toolInvocations.push(toolRes);
  } else if (resolvedRef.inferredIntent === "FOCUS_3D" && resolvedRef.resolvedRoomId) {
    const toolRes = await executeCopilotTool("focus3DRoom", { roomId: resolvedRef.resolvedRoomId }, roomId);
    toolInvocations.push(toolRes);
  }

  // 4. Check if live Gemini API is available
  const apiKey = process.env.GEMINI_API_KEY;
  const configuredModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (apiKey) {
    try {
      // Build system instruction
      const contextPrompt = formatSystemContextPrompt(sysContext);
      let evidencePrompt = "### TÀI LIỆU Y KHOA ĐÃ THẨM ĐỊNH (WHO, CDC, BỘ Y TẾ VIỆT NAM):\n";
      retrievedChunks.forEach((c, idx) => {
        evidencePrompt += `[${idx + 1}] (${c.publisher} - ${c.sectionTitle}):\n${c.chunkText}\n\n`;
      });

      const systemInstruction = `Bạn là SafeHome Copilot 2.0 — Trợ lý AI chuyên sâu về an toàn môi trường sống và phòng ngừa té ngã cho người cao tuổi.
Nhiệm vụ:
1. Trả lời bằng tiếng Việt tự nhiên, ân cần, giải thích nguyên nhân và đưa ra giải pháp cải tạo cụ thể.
2. Bạn ĐANG CÓ KẾT NỐI TRỰC TIẾP với Bản sao số 3D của căn nhà và hồ sơ người cao tuổi. Hãy sử dụng thông tin hiện trường được cung cấp bên dưới.
3. Luôn đối chiếu với tài liệu y tế có chứng cứ đã thẩm định. Gắn số trích dẫn trong ngoặc vuông (ví dụ: [1], [2]) ngay sau khẳng định.
4. NGUYÊN TẮC AN TOÀN Y TẾ: Không tự chẩn đoán bệnh lý, không kê đơn thuốc. Đối với thuốc điều trị, hướng dẫn tham khảo ý kiến bác sĩ.
5. Khi người dùng muốn xem vị trí đồ vật hoặc nguy cơ trên 3D, hãy nêu rõ bạn đã định vị vật thể đó để người dùng bấm vào xem.

${contextPrompt}

${evidencePrompt}
`;

      // Build chat contents
      const contents: any[] = [];
      history.slice(-6).forEach((h) => {
        contents.push({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        });
      });
      contents.push({
        role: "user",
        parts: [{ text: message }],
      });

      // Call Gemini REST API with timeout
      const res = await Promise.race([
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${configuredModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1200,
              },
            }),
          }
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API call timed out after 12s")), 12000)
        ),
      ]);

      let rawText = "";
      if (res && (res as any).ok) {
        const json = await (res as any).json();
        rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }

      // Format citations from retrieved chunks
      const citations: StructuredCitation[] = retrievedChunks.map((c, idx) => ({
        citationId: `cit-${c.chunkId}`,
        citationNumber: idx + 1,
        documentId: c.documentId,
        chunkId: c.chunkId,
        publisher: c.publisher,
        documentTitle: c.documentTitle,
        sectionTitle: c.sectionTitle,
        officialUrl: c.officialUrl,
        supportingExcerpt: c.chunkText.slice(0, 220) + "...",
      }));

      // Add tool action card note in answer if a tool was executed
      let finalAnswer = rawText;
      if (toolInvocations.length > 0) {
        const actionInfo = toolInvocations.map((t) => `\n\n> 🎯 **Thao tác 3D:** ${t.message}`).join("");
        finalAnswer += actionInfo;
      }

      return {
        answer: finalAnswer,
        evidenceStatus: evaluation.status,
        responseMode: "LLM_GENERATED",
        citations,
        modelProvider: "Google-Gemini",
        modelName: configuredModel,
        suggestedFollowUps: [
          "Làm sao để cố định thảm chống trơn trượt mép giường?",
          "Vị trí lắp thanh vịn chuẩn theo hướng dẫn CDC STEADI?",
          "Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.",
        ],
        toolInvocations,
        warnings: evaluation.coverageRationale ? [evaluation.coverageRationale] : [],
      };
    } catch (apiErr: any) {
      console.warn("Gemini Live API fallback:", apiErr?.message || apiErr);
    }
  }

  // 5. High-quality Grounded Deterministic Generation Fallback
  const deterministicResult = await generateGroundedAnswer({
    query: message,
    rewrittenQuery: analysis.rewrittenQuery,
    intent: analysis.intent,
    evaluation,
    retrievedChunks,
    roomContext: {
      roomName: sysContext.rooms.find((r) => r.id === roomId)?.name || "Phòng ngủ",
      hazardCount: sysContext.rooms.find((r) => r.id === roomId)?.hazards.length || 0,
      hazardTitles: sysContext.rooms.find((r) => r.id === roomId)?.hazards.map((h) => h.title) || [],
      lightingLux: sysContext.rooms.find((r) => r.id === roomId)?.lightingLevel || 150,
    },
  });

  let answerWithTool = deterministicResult.answer;
  if (toolInvocations.length > 0) {
    answerWithTool += toolInvocations.map((t) => `\n\n> 🎯 **Thao tác 3D:** ${t.message}`).join("");
  }

  return {
    answer: answerWithTool,
    evidenceStatus: deterministicResult.evidenceStatus,
    responseMode: deterministicResult.responseMode,
    citations: deterministicResult.citations,
    modelProvider: deterministicResult.modelProvider,
    modelName: deterministicResult.modelName,
    suggestedFollowUps: deterministicResult.suggestedFollowUps,
    toolInvocations,
    warnings: deterministicResult.warnings,
  };
}

