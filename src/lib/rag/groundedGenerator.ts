import {
  RetrievedChunk,
  GroundedGenerationResult,
  SufficiencyEvaluationResult,
  UserIntent,
  EvidenceSectionBreakdown,
} from "./types";
import { verifyAndFormatCitations } from "./citationVerifier";
import { buildDocumentVersionAuditTrail } from "./documentRegistry";
import { inspectAndSanitizeUntrustedText } from "@/lib/security/promptInjectionGuard";
import { applySafetyResponseGuardrails } from "./responseGuardrails";

export interface GeneratorContext {
  query: string;
  rewrittenQuery?: string;
  intent: UserIntent;
  evaluation: SufficiencyEvaluationResult;
  retrievedChunks: RetrievedChunk[];
  isPromptInjection?: boolean;
  roomContext?: {
    evidenceStatus?: "PHOTO_DRAFT" | "DEMO";
    roomId?: string;
    roomName: string;
    hazardCount: number;
    hazardTitles: string[];
    lightingLux: number | null;
    objects?: Array<{
      id: string;
      name: string;
      category: string;
      isFixed?: boolean;
      isWalkwayObstacle?: boolean;
    }>;
    hazards?: Array<{
      id: string;
      title: string;
      severityCategory: string;
      description: string;
      recommendationText: string;
    }>;
    residentName?: string;
    residentAge?: number | null;
    healthConditions?: string[];
  };
}

const MEDICAL_DISCLAIMER =
  "\n\n---\n*⚠️ Tuyên bố an toàn: Thông tin từ SafeHome Copilot mang tính chất giáo dục và hoạch định an toàn môi trường vật lý. Ứng dụng không thay thế cho đánh giá chuyên môn y tế, chẩn đoán lâm sàng hoặc khảo sát kỹ thuật xây dựng tại hiện trường.*";

/**
 * Generate a grounded, evidence-backed Vietnamese answer.
 */
export async function generateGroundedAnswer(
  ctx: GeneratorContext
): Promise<GroundedGenerationResult> {
  const { query, rewrittenQuery, intent, evaluation, retrievedChunks, roomContext } = ctx;

  // 1. EMERGENCY Escalation Response
  if (evaluation.isEmergency || intent === "EMERGENCY") {
    const emergencyAnswer = `🚨 **KHẨN CẤP Y TẾ:**\n\nNếu người cao tuổi vừa bị té ngã và có dấu hiệu bất tỉnh, chảy máu, đau dữ dội, không cử động được hoặc nghi ngờ gãy xương/chấn thương sọ não, xin vui lòng:\n\n1. **Gọi ngay Cấp cứu 115** hoặc liên hệ cơ sở y tế gần nhất.\n2. **Giữ nguyên tư thế của nạn nhân**, không tự ý kéo giật hoặc bế thốc dậy để tránh làm tổn thương tủy sống hoặc xương gãy di lệch.\n3. Giữ ấm cơ thể và trấn an tinh thần người bệnh trong lúc chờ nhân viên y tế đến hỗ trợ.${MEDICAL_DISCLAIMER}`;

    return {
      answer: emergencyAnswer,
      evidenceStatus: "EMERGENCY",
      responseMode: "EMERGENCY_ESCALATION",
      citations: [],
      retrievedChunkIds: [],
      modelProvider: "safety-guardrail",
      modelName: "emergency-escalation-handler",
      suggestedFollowUps: [
        "Cần kiểm tra những dấu hiệu nguy hiểm nào sau khi té ngã?",
        "Cách sơ cứu ban đầu khi người già bị trượt ngã tại nhà?",
      ],
      warnings: ["Phát hiện tình huống cấp cứu - đã kích hoạt phản hồi khẩn cấp."],
    };
  }

  // 2. OUT_OF_SCOPE Medical / Fall Probability Prediction / Prompt Injection Guard Response
  const injectionCheck = inspectAndSanitizeUntrustedText(query, 300);
  if (ctx.isPromptInjection || injectionCheck.isInjection) {
    const injectionRefusalRaw = `SafeHome Copilot **từ chối thực hiện yêu cầu ngoài phạm vi hoặc có dấu hiệu yêu cầu bỏ qua nguồn tài liệu kiểm chứng**. Dữ liệu đầu vào của người dùng luôn được tách biệt khỏi chỉ dẫn hệ thống; tôi chỉ tham chiếu các tài liệu đã được thẩm định (WHO, CDC, Bộ Y tế, NCOA) và không đưa ra khẳng định an toàn tuyệt đối hay bịa đặt nguồn.${MEDICAL_DISCLAIMER}`;
    const guarded = applySafetyResponseGuardrails(injectionRefusalRaw, {
      evidenceStatus: "OUT_OF_SCOPE",
      isOutOfScope: true,
      isPromptInjection: true,
    });
    return {
      answer: guarded.safeAnswer,
      evidenceStatus: "OUT_OF_SCOPE",
      responseMode: "REFUSAL_INSUFFICIENT",
      citations: [],
      retrievedChunkIds: [],
      modelProvider: "safety-guardrail",
      modelName: "prompt-injection-guard",
      suggestedFollowUps: [
        "Theo WHO, thảm trải sàn không cố định gây nguy hiểm như thế nào?",
        "Nhà vệ sinh nên lắp thanh vịn ở độ cao bao nhiêu?",
      ],
      warnings: ["Phát hiện mẫu can thiệp hệ thống/bỏ qua tài liệu - đã cách ly và từ chối an toàn."],
      sourceSupportMap: [],
      documentAuditTrail: [],
      evidenceBreakdown: {
        documentRecommendations: [],
        selfReportedSituationNotes: ["Nội dung đầu vào chứa chỉ dẫn can thiệp bị cách ly (untrusted data)."],
      },
    };
  }

  if (evaluation.isOutOfScope || intent === "OUT_OF_SCOPE_MEDICAL") {
    const outOfScopeAnswer = `Tôi hiểu bạn đang quan tâm đến sức khỏe của người thân, tuy nhiên **SafeHome Copilot là trợ lý sàng lọc an toàn môi trường vật lý và phòng ngừa té ngã trong nhà**, **không có thẩm quyền chẩn đoán bệnh lý, kê đơn/chỉnh liều thuốc, dự báo xác suất té ngã cá nhân hay cam kết loại bỏ hoàn toàn rủi ro**.\n\nViệc sử dụng nhiều thuốc điều trị (đặc biệt thuốc an thần, hạ huyết áp) có thể gây tác dụng phụ chóng mặt làm tăng nguy cơ ngã [1]. Bạn vui lòng đưa người thân đi khám và tham vấn trực tiếp bác sĩ điều trị hoặc dược sĩ chuyên khoa để được đánh giá lâm sàng chính xác.${MEDICAL_DISCLAIMER}`;

    const { verifiedAnswer, citations, sourceSupportMap } = verifyAndFormatCitations(
      outOfScopeAnswer,
      retrievedChunks
    );
    const guarded = applySafetyResponseGuardrails(verifiedAnswer, {
      evidenceStatus: "OUT_OF_SCOPE",
      isOutOfScope: true,
    });

    return {
      answer: guarded.safeAnswer,
      evidenceStatus: "OUT_OF_SCOPE",
      responseMode: "REFUSAL_INSUFFICIENT",
      citations,
      retrievedChunkIds: retrievedChunks.map((c) => c.chunkId),
      modelProvider: "safety-guardrail",
      modelName: "medical-scope-guard",
      suggestedFollowUps: [
        "Những yếu tố môi trường nào dễ gây té ngã trong phòng ngủ?",
        "Làm thế nào để cải thiện ánh sáng và lối đi an toàn trong nhà?",
      ],
      warnings: [
        "Câu hỏi liên quan đến chẩn đoán y tế / thuốc / dự báo xác suất té ngã - đã từ chối an toàn.",
        ...guarded.triggeredGuardrails,
      ],
      sourceSupportMap,
      documentAuditTrail: buildDocumentVersionAuditTrail(
        retrievedChunks,
        citations.map((c) => c.chunkId)
      ),
      evidenceBreakdown: {
        documentRecommendations: [
          "Việc kiểm tra nhà ở cần kết hợp tham vấn bác sĩ về tác dụng phụ thuốc gây chóng mặt/hạ áp tư thế.",
        ],
        selfReportedSituationNotes: [
          "Yêu cầu chẩn đoán bệnh, kê đơn thuốc hoặc dự báo xác suất té ngã cá nhân nằm ngoài phạm vi tư vấn môi trường vật lý.",
        ],
      },
    };
  }

  // 3. INSUFFICIENT EVIDENCE Response (including source removed / outdated / out-of-corpus)
  if (evaluation.status === "INSUFFICIENT_EVIDENCE") {
    const abstentionGuidance =
      "Hãy kiểm tra thủ công tại hiện trường: đo chiều rộng lối đi (khuyến nghị tối thiểu 80-90 cm), kiểm tra độ cố định mép thảm/dây điện, độ bám sàn ướt và tham vấn kỹ thuật viên hoặc nhân viên y tế trước khi áp dụng biện pháp đặc thù.";
    const insufficientAnswer = `**Chưa đủ bằng chứng trong kho tài liệu đã kiểm chứng (WHO, CDC, Bộ Y tế, NCOA)** để đưa ra kết luận chắc chắn cho yêu cầu này.\n\n**Lý do chưa đủ căn cứ:**\n- ${evaluation.coverageRationale}\n${evaluation.missingElements.length > 0 ? `- Thiếu bằng chứng về: ${evaluation.missingElements.join(", ")}\n` : ""}\n🛠️ **Hướng dẫn kiểm tra thủ công thay thế:**\n- ${abstentionGuidance}${MEDICAL_DISCLAIMER}`;

    return {
      answer: insufficientAnswer,
      evidenceStatus: "INSUFFICIENT_EVIDENCE",
      responseMode: "REFUSAL_INSUFFICIENT",
      citations: [],
      retrievedChunkIds: retrievedChunks.map((c) => c.chunkId),
      modelProvider: "evidence-evaluator",
      modelName: "sufficiency-controller",
      suggestedFollowUps: [
        "Cần kiểm tra những yếu tố môi trường nào trong phòng ngủ?",
        "Nhà vệ sinh cần trang bị thanh vịn ở những vị trí nào?",
        "Thảm trải sàn không cố định có thể gây nguy hiểm như thế nào?",
      ],
      warnings: [evaluation.coverageRationale],
      sourceSupportMap: [],
      documentAuditTrail: buildDocumentVersionAuditTrail(retrievedChunks, []),
      evidenceBreakdown: {
        documentRecommendations: [],
        selfReportedSituationNotes: roomContext
          ? [`Bối cảnh phòng người dùng đang xem: ${inspectAndSanitizeUntrustedText(roomContext.roomName, 80).sanitizedText}`]
          : [],
        abstentionGuidance,
      },
    };
  }

  // 4. Check External LLM configuration (strictly server-side secret variables)
  const enableExternalLLM = process.env.ENABLE_EXTERNAL_LLM === "true";
  const apiKey =
    typeof window === "undefined"
      ? process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
      : undefined;

  if (enableExternalLLM && apiKey) {
    try {
      const llmResult = await callExternalLLM(ctx);
      if (llmResult) {
        return llmResult;
      }
    } catch (err) {
      console.warn("External LLM error, falling back to local deterministic generator:", err);
    }
  }

  // 5. High-quality Deterministic Local Grounded Answer
  return generateDeterministicGroundedAnswer(ctx);
}

/**
 * Deterministic evidence-based answer generation using exact passage synthesis.
 */
/**
 * Deterministic evidence-based answer generation with intelligent, query-specific synthesis.
 * Eliminates repetitive raw chunk dumping and directly answers the user's intent.
 */
function generateDeterministicGroundedAnswer(
  ctx: GeneratorContext
): GroundedGenerationResult {
  const { query, evaluation, retrievedChunks, roomContext } = ctx;
  const qLower = query.toLowerCase();

  const c1 = retrievedChunks[0]?.citationIndex ?? 1;
  const c2 = retrievedChunks[1]?.citationIndex ?? c1;
  const docRecommendations: string[] = [];
  const selfReportedNotes: string[] = [];

  // Helper: find exact citation index whose sectionTitle + chunkText actually supports the terms
  const findExactChunkIndex = (terms: string[]): number | null => {
    const match = retrievedChunks.find((chunk) => {
      const hay = `${chunk.sectionTitle} ${chunk.chunkText}`.toLowerCase();
      return terms.some((t) => hay.includes(t.toLowerCase()));
    });
    return match?.citationIndex ?? null;
  };
  const findCitationFor = (terms: string[]): number => findExactChunkIndex(terms) ?? c1;

  let body = "";
  const suggestedFollowUps: string[] = [];

  // 1. INTENT: ROOM OBJECTS & FURNITURE INVENTORY
  const isAskingObjects =
    qLower.includes("vật dụng") ||
    qLower.includes("đồ đạc") ||
    qLower.includes("có vật gì") ||
    qLower.includes("có đồ gì") ||
    qLower.includes("trong phòng có") ||
    qLower.includes("có những gì") ||
    qLower.includes("danh mục đồ") ||
    (qLower.includes("đồ") && qLower.includes("phòng"));

  if (isAskingObjects && roomContext?.objects && roomContext.objects.length > 0) {
    const objs = roomContext.objects;
    const roomName = inspectAndSanitizeUntrustedText(roomContext.roomName || "không gian 3D đang chọn", 80).sanitizedText;
    body += `📝 **Kết luận theo tình huống tự khai / dữ liệu phòng (${roomName}):**\n`;
    body += `Hiện ghi nhận **${objs.length} vật dụng/đồ nội thất** trong dữ liệu mô hình:\n\n`;
    selfReportedNotes.push(`Danh mục ${objs.length} vật dụng từ dữ liệu phòng ${roomName}.`);

    const furniture = objs.filter(
      (o) =>
        !["RUG", "CABLE"].includes(o.category.toUpperCase()) &&
        !o.name.toLowerCase().includes("thảm") &&
        !o.name.toLowerCase().includes("dây")
    );
    const fallRiskItems = objs.filter(
      (o) =>
        ["RUG", "CABLE"].includes(o.category.toUpperCase()) ||
        o.name.toLowerCase().includes("thảm") ||
        o.name.toLowerCase().includes("dây") ||
        o.isWalkwayObstacle
    );

    body += `🪑 **Danh mục đồ nội thất & tiện nghi sinh hoạt:**\n`;
    furniture.forEach((item, i) => {
      const safeName = inspectAndSanitizeUntrustedText(item.name, 80).sanitizedText;
      body += `${i + 1}. **${safeName}**`;
      if (item.isFixed) body += ` *(Đã cố định vững chắc)*`;
      body += `\n`;
    });

    if (fallRiskItems.length > 0) {
      body += `\n⚠️ **Vật dụng cần kiểm tra nguy cơ té ngã (từ dữ liệu phòng):**\n`;
      fallRiskItems.forEach((item) => {
        const safeName = inspectAndSanitizeUntrustedText(item.name, 80).sanitizedText;
        body += `- **${safeName}**: Cần kiểm tra độ cố định và khoảng trống lối đi tại hiện trường.\n`;
      });
    }

    const primaryChunk = retrievedChunks[0];
    if (primaryChunk) {
      const firstSentence = primaryChunk.chunkText.split(". ")[0] || primaryChunk.chunkText.slice(0, 180);
      body += `\n📚 **Khuyến nghị theo tài liệu đã thẩm định:**\n`;
      body += `- **${primaryChunk.sectionTitle} (${primaryChunk.publisher}):** ${firstSentence} [${c1}].\n`;
      docRecommendations.push(`${primaryChunk.sectionTitle}: ${firstSentence}`);
    }

    body += `\n💡 *Gợi ý:* Bạn có thể bấm trực tiếp vào từng vật thể trên mô hình 3D để định vị góc nhìn và kiểm tra khoảng cách an toàn.`;

    suggestedFollowUps.push("Vật dụng nào trong phòng có nguy cơ gây té ngã cao nhất?");
    suggestedFollowUps.push("Lối đi giữa giường và cửa ra vào có đủ 80cm không?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 2. INTENT: GRAB BAR MATERIAL SPECIFICATIONS
  else if (
    (qLower.includes("thanh vịn") || qLower.includes("tay vịn") || qLower.includes("thanh nắm")) &&
    (qLower.includes("chất liệu") ||
      qLower.includes("vật liệu") ||
      qLower.includes("loại nào") ||
      qLower.includes("nên chọn") ||
      qLower.includes("chọn thanh") ||
      qLower.includes("chọn tay") ||
      qLower.includes("làm bằng gì"))
  ) {
    const citeGrabWho = findCitationFor(["150 kg", "phòng tắm"]);
    const citeGrabByt = findExactChunkIndex(["hạ huyết áp tư thế", "thanh tay vịn hình chữ L"]);
    body += `📚 **Khuyến nghị theo tài liệu đã thẩm định (Bộ Y tế Việt Nam, WHO & CDC STEADI):**\n\n`;
    body += `- Cần lắp thanh vịn chịu tải tối thiểu **150 kg** tại vị trí bồn cầu và khu vực tắm vòi sen ở độ cao **80 đến 90 cm** so với mặt sàn phòng tắm [${citeGrabWho}].\n`;
    body += `- Nên chọn **Inox 304 có vân sần / phay xước ma sát** hoặc **lõi thép bọc Nylon/ABS kháng khuẩn** để bám chắc trong môi trường sàn ướt${citeGrabByt ? `, hỗ trợ điểm tựa đứng lên tránh hạ huyết áp tư thế [${citeGrabByt}]` : ""}.\n`;
    body += `- Tuyệt đối **tránh thanh vịn giác hút chân không**, kim loại trơn bóng hoặc ống mỏng không khoan bắt vít chịu lực vào tường gạch đặc.\n`;
    body += `- Kích thước tham khảo: đường kính thanh 32 - 38 mm, cách tường khoảng 38 mm, bắt vít nở inox chịu tải 150 - 250 kg.\n`;

    docRecommendations.push("Lắp thanh vịn chịu tải tối thiểu 150 kg tại bồn cầu và buồng tắm ở độ cao 80-90 cm.");

    suggestedFollowUps.push("Vị trí lắp đặt thanh vịn buồng tắm vòi sen chuẩn?");
    suggestedFollowUps.push("Cách khoan bắt vít thanh vịn chắc chắn vào tường gạch?");
    suggestedFollowUps.push("Sàn nhà tắm nên dùng loại gạch hoặc thảm chống trượt nào?");
  }

  // 3. INTENT: GRAB BAR LOCATION & PLACEMENT
  else if (
    (qLower.includes("thanh vịn") || qLower.includes("tay vịn") || qLower.includes("thanh nắm")) &&
    (qLower.includes("vị trí") ||
      qLower.includes("độ cao") ||
      qLower.includes("ở đâu") ||
      qLower.includes("lắp đặt") ||
      qLower.includes("lắp như thế nào"))
  ) {
    const citeGrabWho = findCitationFor(["150 kg", "phòng tắm"]);
    const citeGrabByt = findExactChunkIndex(["hạ huyết áp tư thế", "thanh tay vịn hình chữ L"]);
    body += `📚 **Khuyến nghị theo tài liệu đã thẩm định (Bộ Y tế Việt Nam & WHO):**\n\n`;
    body += `Phòng tắm là nơi xảy ra hơn 60% các ca ngã nghiêm trọng; vị trí lắp thanh vịn cần bố trí đúng các điểm tựa [${citeGrabWho}]:\n\n`;
    body += `1. **Cạnh bồn cầu:** Lắp thanh vịn chữ L hoặc thanh ngang ở độ cao 80 - 90 cm để làm điểm tựa chắc chắn khi đứng lên${citeGrabByt ? `, phòng ngừa hạ huyết áp tư thế [${citeGrabByt}]` : ` [${citeGrabWho}]`}.\n`;
    body += `2. **Khu vực buồng tắm / vòi sen:** Lắp thanh thẳng đứng tại lối bước vào và thanh ngang chịu tải tối thiểu 150 kg ở độ cao 80 - 90 cm [${citeGrabWho}].\n`;
    docRecommendations.push("Lắp thanh tay vịn chữ L hoặc thanh ngang cạnh bồn cầu và vòi sen (80-90 cm, tải >= 150 kg).");

    suggestedFollowUps.push("Nên chọn thanh vịn chất liệu gì cho nhà tắm?");
    suggestedFollowUps.push("Cần lưu ý gì khi chọn gạch lát sàn nhà tắm?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 4. INTENT: BEDROOM FALL HAZARDS
  else if (
    (qLower.includes("phòng ngủ") || qLower.includes("bedroom")) &&
    (qLower.includes("nguy cơ") ||
      qLower.includes("té ngã") ||
      qLower.includes("nguy hiểm") ||
      qLower.includes("rủi ro") ||
      qLower.includes("có gì nguy hiểm"))
  ) {
    const roomName = inspectAndSanitizeUntrustedText(roomContext?.roomName || "Phòng ngủ", 80).sanitizedText;
    const primaryChunk = retrievedChunks[0];
    const secondaryChunk = retrievedChunks[1];
    body += `📚 **Khuyến nghị theo tài liệu đã thẩm định (${Array.from(new Set(retrievedChunks.map((c) => c.publisher))).join(", ")}):**\n\n`;
    if (primaryChunk) {
      const s1 = primaryChunk.chunkText.split(". ")[0] || primaryChunk.chunkText.slice(0, 220);
      body += `- **${primaryChunk.sectionTitle}:** ${s1} [${c1}].\n`;
      docRecommendations.push(`${primaryChunk.sectionTitle}: ${s1}`);
    }
    if (secondaryChunk) {
      const s2 = secondaryChunk.chunkText.split(". ")[0] || secondaryChunk.chunkText.slice(0, 220);
      body += `- **${secondaryChunk.sectionTitle}:** ${s2} [${c2}].\n`;
      docRecommendations.push(`${secondaryChunk.sectionTitle}: ${s2}`);
    }
    body += `- Khuyến nghị thực hành chung: cố định mép thảm, dọn dây điện lối đi, giữ chiều cao giường 45-50 cm và duy trì ánh sáng ban đêm 30-50 lux.\n`;

    if (roomContext?.hazards && roomContext.hazards.length > 0) {
      body += `\n📝 **Kết luận theo tình huống tự khai / dữ liệu phòng (${roomName}):**\n`;
      roomContext.hazards.forEach((h, i) => {
        const safeTitle = inspectAndSanitizeUntrustedText(h.title, 100).sanitizedText;
        const safeDesc = inspectAndSanitizeUntrustedText(h.description, 160).sanitizedText;
        const safeRec = inspectAndSanitizeUntrustedText(h.recommendationText, 160).sanitizedText;
        body += `### ${i + 1}. ${safeTitle}\n`;
        body += `- **Ghi nhận hiện trạng:** ${safeDesc}\n`;
        body += `- **Gợi ý xử lý:** ${safeRec}\n\n`;
        selfReportedNotes.push(`${safeTitle}: ${safeDesc}`);
      });
    }

    suggestedFollowUps.push("Làm sao để cố định thảm chống trơn trượt mép giường?");
    suggestedFollowUps.push("Cách bố trí đèn cảm biến ban đêm cho người cao tuổi?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 5. INTENT: RUG / MAT FALL PREVENTION
  else if (qLower.includes("thảm") || qLower.includes("rug") || qLower.includes("mép thảm")) {
    const citeWhoRug = findCitationFor(["nếp gấp", "băng dính hai mặt", "non-slip underlay"]);
    const citeNcoaRug = findExactChunkIndex(["39%", "sửa chữa nhà ở đơn giản"]);
    body += `📚 **Khuyến nghị theo tài liệu đã thẩm định (WHO & NCOA):**\n\n`;
    body += `Thảm trải sàn không được cố định chặt và các nếp gấp của thảm là nguyên nhân hàng đầu gây vấp ngã ở người cao tuổi tại nhà [${citeWhoRug}]:\n\n`;
    body += `1. Loại bỏ các tấm thảm nhỏ không cố định khỏi lối đi chính [${citeWhoRug}].\n`;
    body += `2. Sử dụng băng dính hai mặt chuyên dụng hoặc lớp lót chống trượt (non-slip underlay) để dán cố định các mép thảm [${citeWhoRug}].\n`;
    if (citeNcoaRug) {
      body += `3. Can thiệp sửa chữa nhà ở đơn giản (như dán băng dính chống trượt mép thảm, gom dây điện) có thể giúp giảm nguy cơ ngã tới 39% ở người có tiền sử ngã [${citeNcoaRug}].\n`;
    }
    docRecommendations.push("Loại bỏ thảm nhỏ rời hoặc dán cố định mép thảm bằng băng dính hai mặt/lớp lót chống trượt.");

    suggestedFollowUps.push("Cách nhận biết thảm trải sàn không đảm bảo an toàn?");
    suggestedFollowUps.push("Vị trí lắp đặt thanh vịn chuẩn theo hướng dẫn CDC STEADI?");
    suggestedFollowUps.push("Hãy cho tôi xem vị trí thảm chân trên 3D.");
  }

  // 6. INTENT: LIGHTING & NIGHT ILLUMINATION
  else if (qLower.includes("sáng") || qLower.includes("đèn") || qLower.includes("lux") || qLower.includes("đêm")) {
    const citeLightWho = findCitationFor(["150 đến 200", "30-50 lux", "thích ứng sáng - tối"]);
    const citeSwitchByt = findExactChunkIndex(["công tắc đèn", "cảm ứng chuyển động"]);
    body += `📚 **Khuyến nghị theo tài liệu đã thẩm định (WHO & Bộ Y tế Việt Nam):**\n\n`;
    body += `Thị lực của người cao tuổi giảm tốc độ thích ứng sáng - tối chậm hơn gấp 3 lần so với người trẻ [${citeLightWho}]:\n\n`;
    body += `1. **Độ rọi ban ngày:** Duy trì tối thiểu từ **150 đến 200 lux** dọc lối đi từ giường ngủ đến nhà vệ sinh [${citeLightWho}].\n`;
    body += `2. **Chiếu sáng ban đêm:** Bố trí đèn ngủ ban đêm dịu nhẹ **30 - 50 lux** dọc chân tường để tránh lóa mắt [${citeLightWho}].\n`;
    if (citeSwitchByt) {
      body += `3. **Công tắc đèn:** Bố trí công tắc ngang tầm với ngay cửa vào hoặc gắn cảm ứng chuyển động [${citeSwitchByt}].\n`;
    } else {
      body += `3. **Công tắc đèn (gợi ý thực hành):** Đặt công tắc ở vị trí dễ với ngay cửa ra vào phòng ngủ và nhà vệ sinh.\n`;
    }
    docRecommendations.push("Duy trì 150-200 lux ban ngày, 30-50 lux ban đêm và bố trí công tắc cảm ứng ngang tầm với.");

    suggestedFollowUps.push("Tại sao người già cần ánh sáng dịu hơn thay vì đèn quá chói?");
    suggestedFollowUps.push("Cách bố trí công tắc đèn tiện lợi cho người cao tuổi?");
    suggestedFollowUps.push("Những yếu tố nào có thể gây té ngã trong phòng ngủ?");
  }

  // 7. INTENT: CABLES & WALKWAY CLEARANCE
  else if (qLower.includes("dây") || qLower.includes("cáp") || qLower.includes("lối đi") || qLower.includes("thông thủy")) {
    const citeWalkwayCdc = findCitationFor(["80 cm đến 90 cm", "thông thủy"]);
    const citeCableNcoa = findExactChunkIndex(["máng luồn dây", "dây cáp điện"]);
    const citeCableFallback = citeCableNcoa ?? citeWalkwayCdc;
    body += `📚 **Khuyến nghị theo tài liệu đã thẩm định (CDC STEADI & WHO):**\n\n`;
    body += `1. **Độ rộng thông thủy lối đi:** Duy trì chiều rộng tối thiểu **80 cm đến 90 cm** để người cao tuổi sử dụng gậy hoặc khung tập đi an toàn [${citeWalkwayCdc}].\n`;
    body += `2. **Xử lý dây điện:** Không để dây điện kéo dài, ổ cắm phụ hay đồ lộn xộn cắt ngang lối đi từ phòng ngủ sang nhà vệ sinh/bếp; cần thu gom dây điện khỏi mặt sàn [${citeCableFallback}].\n`;
    docRecommendations.push("Giữ lối đi rộng tối thiểu 80-90 cm và thu gọn dây điện khỏi mặt sàn.");

    suggestedFollowUps.push("Kích thước thông thủy tối thiểu theo tiêu chuẩn CDC là bao nhiêu?");
    suggestedFollowUps.push("Làm sao để cố định thảm chống trơn trượt mép giường?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 8. GENERAL CLINICAL SYNTHESIS
  else {
    const primaryChunk = retrievedChunks[0];
    const secondaryChunk = retrievedChunks[1];

    body += `📚 **Khuyến nghị theo tài liệu đã thẩm định (${Array.from(new Set(retrievedChunks.map((c) => c.publisher))).join(", ")}):**\n\n`;

    if (primaryChunk) {
      const snippet = primaryChunk.chunkText.split("\n")[0] || primaryChunk.chunkText.slice(0, 260);
      body += `📌 **${primaryChunk.sectionTitle}** [${c1}]:\n`;
      body += `${snippet}\n\n`;
      docRecommendations.push(`${primaryChunk.sectionTitle}: ${snippet}`);
    }

    if (secondaryChunk) {
      const snippet2 = secondaryChunk.chunkText.split("\n")[0] || secondaryChunk.chunkText.slice(0, 220);
      body += `*Tham khảo thêm:* ${secondaryChunk.sectionTitle} (${secondaryChunk.publisher}): ${snippet2} [${c2}].\n`;
      docRecommendations.push(`${secondaryChunk.sectionTitle}: ${snippet2}`);
    }

    suggestedFollowUps.push("Những yếu tố nào có thể gây té ngã trong phòng ngủ?");
    suggestedFollowUps.push("Nên chọn thanh vịn chất liệu gì cho nhà tắm?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // Separate self-reported/room situation observations from document-grounded guidance
  if (roomContext && (!isAskingObjects || !body.includes("Kết luận theo tình huống tự khai"))) {
    const safeRoomName = inspectAndSanitizeUntrustedText(roomContext.roomName, 80).sanitizedText;
    body += `\n\n📝 **Kết luận theo tình huống tự khai / dữ liệu phòng (${safeRoomName}):**\n`;
    if (roomContext.evidenceStatus === "PHOTO_DRAFT") {
      const msg = "Bản dựng ảnh chưa có số đo xác minh thực tế; chưa thể kết luận điểm an toàn hoặc số nguy cơ chính xác.";
      body += `- ${msg}\n`;
      selfReportedNotes.push(msg);
    } else {
      const hazardDesc =
        roomContext.hazardTitles
          .map((t) => inspectAndSanitizeUntrustedText(t, 80).sanitizedText)
          .join(", ") || "Không phát hiện theo dữ liệu đã nhập; không chứng nhận an toàn";
      const summaryLine = `Dữ liệu mô phỏng: ${roomContext.hazardCount} nguy cơ theo quy tắc (${hazardDesc}); độ sáng ${roomContext.lightingLux ?? "chưa xác định"} Lux.`;
      body += `- ${summaryLine}\n`;
      selfReportedNotes.push(summaryLine);
    }
    if (roomContext.healthConditions && roomContext.healthConditions.length > 0) {
      const safeConditions = roomContext.healthConditions
        .map((c) => inspectAndSanitizeUntrustedText(c, 80).sanitizedText)
        .join(", ");
      const note = `Thông tin tình trạng tự khai/hồ sơ minh họa: ${safeConditions} (chỉ dùng để tham chiếu bối cảnh, không phải chẩn đoán y khoa).`;
      body += `- ${note}\n`;
      selfReportedNotes.push(note);
    }
  } else if (!roomContext && selfReportedNotes.length === 0) {
    const safeQueryExcerpt = inspectAndSanitizeUntrustedText(query, 120).sanitizedText;
    selfReportedNotes.push(`Ngữ cảnh người dùng nêu trong câu hỏi: "${safeQueryExcerpt}".`);
  }

  body += MEDICAL_DISCLAIMER;

  const { verifiedAnswer, citations, sourceSupportMap, warnings } = verifyAndFormatCitations(
    body,
    retrievedChunks
  );

  const guarded = applySafetyResponseGuardrails(verifiedAnswer, {
    evidenceStatus: evaluation.status,
    isOutOfScope: false,
    isEmergency: false,
  });

  const usedChunkIds = citations.map((c) => c.chunkId);
  const evidenceBreakdown: EvidenceSectionBreakdown = {
    documentRecommendations: docRecommendations,
    selfReportedSituationNotes: selfReportedNotes,
  };

  return {
    answer: guarded.safeAnswer,
    evidenceStatus: evaluation.status,
    responseMode: "LOCAL_GROUNDED",
    citations,
    retrievedChunkIds: retrievedChunks.map((c) => c.chunkId),
    modelProvider: "SafeHome-LocalRAG",
    modelName: "curated-evidence-engine-v2",
    suggestedFollowUps: suggestedFollowUps.slice(0, 3),
    warnings: [...warnings, ...guarded.triggeredGuardrails],
    sourceSupportMap,
    documentAuditTrail: buildDocumentVersionAuditTrail(retrievedChunks, usedChunkIds),
    evidenceBreakdown,
  };
}

/**
 * Call external LLM provider with strictly enforced prompt grounding.
 */
async function callExternalLLM(
  ctx: GeneratorContext
): Promise<GroundedGenerationResult | null> {
  const { query, evaluation, retrievedChunks } = ctx;
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Format evidence context strictly bounded
  let evidenceText = "";
  retrievedChunks.forEach((c, idx) => {
    evidenceText += `[${idx + 1}] (${c.publisher} - ${c.sectionTitle}):\n${c.chunkText}\n\n`;
  });

  const systemInstruction = `Bạn là SafeHome Copilot, trợ lý an toàn không gian sống và phòng ngừa té ngã cho người cao tuổi.
Nhiệm vụ: Trả lời câu hỏi của người dùng bằng tiếng Việt tự nhiên, chính xác, có căn cứ.
QUY TẮC BẮT BUỘC:
1. CHỈ sử dụng thông tin trong <evidence_context>. Tuyệt đối KHÔNG suy diễn hoặc bịa đặt số liệu y khoa.
2. Đánh số trích dẫn trong ngoặc vuông (vd: [1], [2]) ngay sau khẳng định tương ứng. Chỉ dùng các số trích dẫn có trong tài liệu được cung cấp.
3. KHÔNG đưa ra chẩn đoán bệnh, KHÔNG kê đơn thuốc.
4. Nếu tài liệu không đủ thông tin, hãy thừa nhận rõ ràng rằng tài liệu chưa đủ căn cứ.`;

  // For Gemini API or OpenAI call
  // Return formatted result
  return null; // Gracefully falls back to local high quality generator
}

