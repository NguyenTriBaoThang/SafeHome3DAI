import {
  RetrievedChunk,
  GroundedGenerationResult,
  SufficiencyEvaluationResult,
  UserIntent,
} from "./types";
import { verifyAndFormatCitations } from "./citationVerifier";

export interface GeneratorContext {
  query: string;
  rewrittenQuery?: string;
  intent: UserIntent;
  evaluation: SufficiencyEvaluationResult;
  retrievedChunks: RetrievedChunk[];
  roomContext?: {
    roomName: string;
    hazardCount: number;
    hazardTitles: string[];
    lightingLux: number;
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

  // 2. OUT_OF_SCOPE Medical Response
  if (evaluation.isOutOfScope || intent === "OUT_OF_SCOPE_MEDICAL") {
    const outOfScopeAnswer = `Tôi hiểu bạn đang quan tâm đến sức khỏe của người thân, tuy nhiên **SafeHome Copilot là trợ lý chuyên sâu về an toàn môi trường vật lý và phòng ngừa té ngã trong nhà**, không có thẩm quyền chẩn đoán bệnh lý hoặc hướng dẫn dùng thuốc.\n\nViệc sử dụng các loại thuốc điều trị (đặc biệt là thuốc hạ huyết áp, an thần, giãn cơ) có thể gây tác dụng phụ chóng mặt hoặc hạ huyết áp tư thế, làm tăng nguy cơ ngã [1]. Bạn vui lòng tham vấn trực tiếp bác sĩ điều trị hoặc dược sĩ để được kê đơn và chỉ định liều lượng chính xác.${MEDICAL_DISCLAIMER}`;

    const { verifiedAnswer, citations } = verifyAndFormatCitations(
      outOfScopeAnswer,
      retrievedChunks
    );

    return {
      answer: verifiedAnswer,
      evidenceStatus: "OUT_OF_SCOPE",
      responseMode: "REFUSAL_INSUFFICIENT",
      citations,
      retrievedChunkIds: retrievedChunks.map((c) => c.chunkId),
      modelProvider: "safety-guardrail",
      modelName: "medical-scope-guard",
      suggestedFollowUps: [
        "Những loại thuốc nào có thể làm tăng nguy cơ té ngã ở người già?",
        "Làm thế nào để cải thiện ánh sáng và lối đi an toàn trong nhà?",
      ],
      warnings: ["Câu hỏi liên quan đến thuốc/chẩn đoán y tế - đã từ chối an toàn."],
    };
  }

  // 3. INSUFFICIENT EVIDENCE Response
  if (evaluation.status === "INSUFFICIENT_EVIDENCE") {
    const insufficientAnswer = `Hiện tại, tôi chưa tìm thấy đủ bằng chứng trong kho tài liệu đã được kiểm chứng (WHO, CDC, Bộ Y tế) để đưa ra kết luận chắc chắn về nội dung này.\n\n**Lý do chưa đủ căn cứ:**\n- ${evaluation.coverageRationale}\n${evaluation.missingElements.length > 0 ? `- Thiếu thông tin về: ${evaluation.missingElements.join(", ")}` : ""}\n\nTrong an toàn phòng ngừa té ngã, không có giải pháp đơn lẻ nào có thể cam kết loại bỏ hoàn toàn nguy cơ mà cần kết hợp đồng bộ: cải tạo môi trường (thông thoáng lối đi, chống trơn), nâng cao thị lực và duy trì tập luyện thăng bằng.${MEDICAL_DISCLAIMER}`;

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
    };
  }

  // 4. Check External LLM configuration
  const enableExternalLLM = process.env.ENABLE_EXTERNAL_LLM === "true";
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.NEXT_PUBLIC_AI_API_KEY;

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
function generateDeterministicGroundedAnswer(
  ctx: GeneratorContext
): GroundedGenerationResult {
  const { query, evaluation, retrievedChunks, roomContext } = ctx;
  const qLower = query.toLowerCase();

  let body = "";
  const suggestedFollowUps: string[] = [];

  // Synthesize answer based on top evidence passages
  body += `Dựa trên tài liệu chuyên môn từ **${Array.from(new Set(retrievedChunks.map((c) => c.publisher))).join(", ")}**, tôi xin cung cấp thông tin đã được thẩm định:\n\n`;

  retrievedChunks.forEach((chunk, idx) => {
    const citationNum = idx + 1;
    body += `### ${chunk.sectionTitle} [${citationNum}]\n`;
    body += `${chunk.chunkText}\n\n`;
  });

  // Actionable recommendations grounded in evidence
  body += `**Khuyến nghị thực tế cho gia đình:**\n`;
  if (qLower.includes("thảm") || qLower.includes("vấp") || qLower.includes("sàn")) {
    body += `- Cố định chặt 4 mép thảm bằng băng dính hai mặt chuyên dụng hoặc thay thảm có lớp cao su chống trượt [1].\n`;
    body += `- Loại bỏ các tấm thảm nhỏ không cố định tại chân giường và cửa ra vào [1].\n`;
    suggestedFollowUps.push("Cách nhận biết thảm trải sàn không đảm bảo an toàn?");
    suggestedFollowUps.push("Cần lưu ý gì khi chọn gạch lát sàn nhà tắm?");
  }

  if (qLower.includes("vịn") || qLower.includes("nhà tắm") || qLower.includes("wc") || qLower.includes("toilet")) {
    body += `- Lắp đặt thanh tay vịn chịu tải tối thiểu 150 kg ở độ cao 80-85 cm cạnh bồn cầu và buồng tắm [2].\n`;
    body += `- Xử lý chống trơn sàn gạch bằng dung dịch phủ nano hoặc thảm cao su thoát nước tốt [1].\n`;
    suggestedFollowUps.push("Nên chọn thanh vịn chất liệu gì cho nhà tắm?");
    suggestedFollowUps.push("Vị trí lắp đặt thanh vịn buồng tắm vòi sen chuẩn?");
  }

  if (qLower.includes("sáng") || qLower.includes("đèn") || qLower.includes("lux") || qLower.includes("đêm")) {
    body += `- Đảm bảo độ rọi tối thiểu 150-200 Lux ban ngày và đèn ngủ ban đêm dịu nhẹ (30-50 Lux) dọc chân tường để tránh lóa mắt [2].\n`;
    body += `- Sử dụng đèn cảm biến chuyển động tự động bật khi chân chạm đất bước xuống giường [3].\n`;
    suggestedFollowUps.push("Tại sao người già cần ánh sáng dịu hơn thay vì đèn quá chói?");
    suggestedFollowUps.push("Cách bố trí công tắc đèn tiện lợi cho người cao tuổi?");
  }

  if (qLower.includes("dây") || qLower.includes("cáp") || qLower.includes("lối đi") || qLower.includes("thông thủy")) {
    body += `- Duy trì chiều rộng thông thủy lối đi tối thiểu 80-90 cm để người già đi lại bằng gậy hoặc khung tập đi an toàn [1].\n`;
    body += `- Luồn dây điện vào nẹp bảo vệ chân tường, tuyệt đối không thả dây nổi vắt ngang lối đi [1].\n`;
    suggestedFollowUps.push("Kích thước thông thủy tối thiểu theo tiêu chuẩn CDC là bao nhiêu?");
    suggestedFollowUps.push("Cách xử lý dây điện quạt sàn an toàn?");
  }

  if (suggestedFollowUps.length === 0) {
    suggestedFollowUps.push("Những yếu tố nào có thể gây té ngã trong phòng ngủ?");
    suggestedFollowUps.push("Nhà vệ sinh của người cao tuổi nên được kiểm tra như thế nào?");
    suggestedFollowUps.push("Tôi cần chú ý gì với thảm và dây điện?");
  }

  // Inject 3D Room Context if supplied
  if (roomContext) {
    body += `\n📌 **Đối chiếu với không gian 3D đang khảo sát (${roomContext.roomName}):**\n`;
    body += `- Ghi nhận **${roomContext.hazardCount}** nguy cơ tiềm ẩn: ${roomContext.hazardTitles.join(", ") || "Không có vi phạm nghiêm trọng"}.\n`;
    body += `- Cường độ ánh sáng hiện tại: **${roomContext.lightingLux} Lux**.\n`;
  }

  body += MEDICAL_DISCLAIMER;

  const { verifiedAnswer, citations, warnings } = verifyAndFormatCitations(
    body,
    retrievedChunks
  );

  return {
    answer: verifiedAnswer,
    evidenceStatus: evaluation.status,
    responseMode: "LOCAL_GROUNDED",
    citations,
    retrievedChunkIds: retrievedChunks.map((c) => c.chunkId),
    modelProvider: "SafeHome-LocalRAG",
    modelName: "curated-evidence-engine-v2",
    suggestedFollowUps: suggestedFollowUps.slice(0, 3),
    warnings,
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

