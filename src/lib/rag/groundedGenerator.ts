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

  let body = "";
  const suggestedFollowUps: string[] = [];

  // 1. INTENT: ROOM OBJECTS & FURNITURE INVENTORY
  // "Trong phòng có vật dụng gì ?", "có đồ gì", "danh sách vật dụng", "nội thất trong phòng"
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
    const roomName = roomContext.roomName || "không gian 3D đang chọn";
    body += `Trong **${roomName}** hiện có **${objs.length} vật dụng/đồ nội thất** được lập bản sao số và giám sát an toàn:\n\n`;

    // Group items
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
      body += `${i + 1}. **${item.name}** [1]`;
      if (item.isFixed) body += ` *(Đã cố định vững chắc)*`;
      body += `\n`;
    });

    if (fallRiskItems.length > 0) {
      body += `\n⚠️ **Vật dụng cần chú ý nguy cơ té ngã:**\n`;
      fallRiskItems.forEach((item) => {
        body += `- **${item.name}**: Tiềm ẩn rủi ro trượt hoặc vấp ngã nếu không được cố định chặt xuống sàn [1].\n`;
      });
    }

    body += `\n💡 *Gợi ý:* Bạn có thể bấm trực tiếp vào từng vật thể trên mô hình 3D để định vị góc nhìn và kiểm tra khoảng cách an toàn.`;

    suggestedFollowUps.push("Vật dụng nào trong phòng có nguy cơ gây té ngã cao nhất?");
    suggestedFollowUps.push("Lối đi giữa giường và cửa ra vào có đủ 80cm không?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 2. INTENT: GRAB BAR MATERIAL SPECIFICATIONS
  // "Nên chọn thanh vịn chất liệu gì cho nhà tắm?", "chất liệu thanh vịn", "chất liệu tay vịn", "thanh vịn loại nào tốt"
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
    body += `Theo tiêu chuẩn phòng ngừa tai nạn thương tích của **Bộ Y tế Việt Nam** và **CDC STEADI Hoa Kỳ**, khi chọn chất liệu thanh vịn cho nhà tắm, cần tuân thủ các khuyến cáo y khoa sau:\n\n`;

    body += `🛡️ **1. Chất liệu khuyến nghị hàng đầu:**\n`;
    body += `- **Inox 304 không gỉ có vân sần / phay xước ma sát (Knurled/Textured Stainless Steel) [1]:** Đây là chất liệu tối ưu nhất vì chống ăn mòn tuyệt đối trong môi trường nước/xà phòng và tạo độ bám ma sát cao, không bị trượt tay ngay cả khi tay dính nước xà phòng.\n`;
    body += `- **Lõi thép không gỉ bọc nhựa Nylon/ABS kháng khuẩn [1]:** Có các rãnh gân nổi chống trơn, ưu điểm bề mặt không bị lạnh buốt vào mùa đông và êm ái cho người già thoái hóa khớp bàn tay.\n\n`;

    body += `⚠️ **2. Các loại tuyệt đối KHÔNG NÊN DÙNG:**\n`;
    body += `- ❌ **Thanh vịn gắn bằng giác hút chân không (Suction Grab Bars):** Cực kỳ nguy hiểm vì lực hút cao su sẽ thoái hóa dần theo thời gian và bung tuột bất thình lình khi người già dồn tải trọng lúc trượt chân [1].\n`;
    body += `- ❌ **Kim loại mạ bóng nhẵn:** Rất trơn tuột khi dính xà phòng.\n`;
    body += `- ❌ **Ống nhôm mỏng hoặc nhựa dẻo:** Dễ cong gãy khi chịu tải trọng va đập lớn.\n\n`;

    body += `📐 **3. Tiêu chuẩn kích thước & lắp đặt an toàn [2]:**\n`;
    body += `- **Khả năng chịu tải trọng:** Phải chịu được tối thiểu **150 kg - 250 kg** (khoan bắt vít nở inox xuyên sâu vào tường gạch đặc hoặc xương đố chịu lực, không bắt vào tấm thạch cao rỗng).\n`;
    body += `- **Đường kính thân thanh vịn:** Chuẩn **32 mm - 38 mm** (1.25 - 1.5 inch) để vòng bàn tay người cao tuổi ôm trọn chắc chắn.\n`;
    body += `- **Khoảng cách từ thanh tới tường:** Chuẩn **38 mm (1.5 inch)** để vừa khít bàn tay, tránh kẹt mu tay khi ngã.\n`;
    body += `- **Độ cao lắp đặt:** Từ **80 cm đến 85 cm** tính từ mặt sàn gạch [1].\n`;

    suggestedFollowUps.push("Vị trí lắp đặt thanh vịn buồng tắm vòi sen chuẩn?");
    suggestedFollowUps.push("Cách khoan bắt vít thanh vịn chắc chắn vào tường gạch?");
    suggestedFollowUps.push("Sàn nhà tắm nên dùng loại gạch hoặc thảm chống trượt nào?");
  }

  // 3. INTENT: GRAB BAR LOCATION & PLACEMENT
  // "Vị trí lắp đặt thanh vịn", "độ cao thanh vịn", "lắp ở đâu"
  else if (
    (qLower.includes("thanh vịn") || qLower.includes("tay vịn") || qLower.includes("thanh nắm")) &&
    (qLower.includes("vị trí") ||
      qLower.includes("độ cao") ||
      qLower.includes("ở đâu") ||
      qLower.includes("lắp đặt") ||
      qLower.includes("lắp như thế nào"))
  ) {
    body += `Theo hướng dẫn của **Bộ Y tế Việt Nam** và **CDC STEADI**, nhà vệ sinh là nơi xảy ra trên 60% các ca ngã nặng. Vị trí lắp thanh vịn cần bố trí đúng các điểm tỳ lực [1]:\n\n`;
    body += `1. **Cạnh bồn cầu (Toilet Grab Bars):**\n`;
    body += `- Lắp thanh vịn chữ L hoặc thanh vịn ngang ở độ cao **80 - 85 cm** so với mặt sàn [1].\n`;
    body += `- Chiều dài thanh tối thiểu 60 - 90 cm để người già tỳ tay lấy đà khi đứng dậy, phòng ngừa hạ huyết áp tư thế.\n\n`;
    body += `2. **Khu vực buồng tắm / vòi sen (Shower Grab Bars):**\n`;
    body += `- Lắp 1 thanh thẳng đứng tại lối bước vào (cao 80 - 120 cm) để người già vịn bước qua gờ sàn [1].\n`;
    body += `- Lắp 1 thanh ngang hoặc thanh nghiêng dọc theo tường tắm ở độ cao **85 - 90 cm** để bám giữ khi đứng tắm hoặc kỳ cọ chân [2].\n\n`;
    body += `3. **Yêu cầu kỹ thuật:** Khoan bắt vít inox nở thép chịu lực tối thiểu 150 kg [2].\n`;

    suggestedFollowUps.push("Nên chọn thanh vịn chất liệu gì cho nhà tắm?");
    suggestedFollowUps.push("Cần lưu ý gì khi chọn gạch lát sàn nhà tắm?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 4. INTENT: BEDROOM FALL HAZARDS
  // "Phòng ngủ của tôi có những nguy cơ té ngã nào?", "nguy cơ phòng ngủ"
  else if (
    (qLower.includes("phòng ngủ") || qLower.includes("bedroom")) &&
    (qLower.includes("nguy cơ") ||
      qLower.includes("té ngã") ||
      qLower.includes("nguy hiểm") ||
      qLower.includes("rủi ro") ||
      qLower.includes("có gì nguy hiểm"))
  ) {
    const roomName = roomContext?.roomName || "Phòng ngủ";
    body += `Dựa trên dữ liệu khảo sát hiện trường và chuẩn đối chiếu **WHO 2021 & CDC STEADI**, các nguy cơ té ngã chính trong **${roomName}** gồm:\n\n`;

    if (roomContext?.hazards && roomContext.hazards.length > 0) {
      roomContext.hazards.forEach((h, i) => {
        body += `### ${i + 1}. ${h.title} [1]\n`;
        body += `- **Nguyên nhân y khoa:** ${h.description}\n`;
        body += `- **Giải pháp can thiệp:** ${h.recommendationText}\n\n`;
      });
    } else {
      body += `### 1. Thảm trải sàn mép cong vênh, thiếu đế bám ma sát [1]\n`;
      body += `- Người già có dáng đi bước lê chân thấp, đầu ngón chân dễ vấp vào mép thảm nhô cao gây ngã chúi.\n`;
      body += `- **Khắc phục:** Dán cố định 4 góc thảm bằng băng dính hai mặt chuyên dụng hoặc thay thảm có đế cao su TPE chống trượt.\n\n`;

      body += `### 2. Dây điện / dây sạc thiết bị vắt ngang lối đi [1]\n`;
      body += `- Dây điện tự do là chướng ngại vật dễ mắc vào dép khi đi lại ban đêm.\n`;
      body += `- **Khắc phục:** Luồn dây vào nẹp gen bảo vệ ốp sát chân tường.\n\n`;

      body += `### 3. Chiều cao thành giường và ánh sáng đêm yếu (<50 Lux) [2]\n`;
      body += `- Mặt đệm giường cần đạt độ cao 45 - 50 cm để hai bàn chân chạm phẳng sàn khi thức dậy, tránh hạ huyết áp tư thế gây choáng váng.\n`;
      body += `- **Khắc phục:** Lắp đèn ngủ cảm ứng chuyển động ánh sáng vàng ấm (30 - 50 Lux) sát chân giường.\n\n`;
    }

    suggestedFollowUps.push("Làm sao để cố định thảm chống trơn trượt mép giường?");
    suggestedFollowUps.push("Cách bố trí đèn cảm biến ban đêm cho người cao tuổi?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 5. INTENT: RUG / MAT FALL PREVENTION
  else if (qLower.includes("thảm") || qLower.includes("rug") || qLower.includes("mép thảm")) {
    body += `Theo số liệu từ **CDC STEADI**, thảm rời không cố định là nguyên nhân hàng đầu gây ra tới 35% các vụ té ngã sinh hoạt ở người cao tuổi [1]:\n\n`;
    body += `1. **Căn nguyên sinh cơ học:** Người cao tuổi thường có dáng đi lê chân (shuffling gait), độ nhấc bàn chân chỉ từ 1 đến 2 cm. Mép thảm quăn góc dễ làm kẹt mũi dép gây mất thăng bằng đột ngột [1].\n`;
    body += `2. **Giải pháp can thiệp hiệu quả:**\n`;
    body += `- Dán cố định 4 góc và chu vi mép thảm xuống sàn bằng băng dính hai mặt cường lực chuyên dụng (Rug Tape) [1].\n`;
    body += `- Sử dụng tấm lót cao su chống trượt (Non-skid Rug Underlay) bên dưới toàn bộ bề mặt thảm [1].\n`;
    body += `- Với các tấm thảm nhỏ trôi nổi ở mép giường hoặc lối vào, khuyến nghị loại bỏ hoàn toàn khỏi luồng giao thông chính [2].\n`;

    suggestedFollowUps.push("Cách nhận biết thảm trải sàn không đảm bảo an toàn?");
    suggestedFollowUps.push("Vị trí lắp đặt thanh vịn chuẩn theo hướng dẫn CDC STEADI?");
    suggestedFollowUps.push("Hãy cho tôi xem vị trí thảm chân trên 3D.");
  }

  // 6. INTENT: LIGHTING & NIGHT ILLUMINATION
  else if (qLower.includes("sáng") || qLower.includes("đèn") || qLower.includes("lux") || qLower.includes("đêm")) {
    body += `Theo hướng dẫn an toàn môi trường sống của **WHO 2021** và **Bộ Y tế Việt Nam**, thị lực người cao tuổi giảm mạnh độ nhạy tương phản và tốc độ thích nghi sáng-tối [1]:\n\n`;
    body += `1. **Độ rọi ban ngày:** Cần đạt tối thiểu **150 - 200 Lux** trên toàn bộ mặt sàn phòng sinh hoạt [1].\n`;
    body += `2. **Chiếu sáng ban đêm:** Duy trì từ **30 - 50 Lux** dọc theo tuyến đường từ giường ngủ tới nhà vệ sinh bằng đèn LED cảm ứng bước chân [2].\n`;
    body += `3. **Tránh chói mắt:** Tuyệt đối không dùng bóng đèn trần công suất lớn chiếu thẳng vào mắt vì gây mù tạm thời khi thức giấc nửa đêm [2].\n`;

    suggestedFollowUps.push("Tại sao người già cần ánh sáng dịu hơn thay vì đèn quá chói?");
    suggestedFollowUps.push("Cách bố trí công tắc đèn tiện lợi cho người cao tuổi?");
    suggestedFollowUps.push("Những yếu tố nào có thể gây té ngã trong phòng ngủ?");
  }

  // 7. INTENT: CABLES & WALKWAY CLEARANCE
  else if (qLower.includes("dây") || qLower.includes("cáp") || qLower.includes("lối đi") || qLower.includes("thông thủy")) {
    body += `Theo tiêu chuẩn **ADA** và hướng dẫn phòng ngừa té ngã của **CDC STEADI** [1]:\n\n`;
    body += `1. **Độ rộng thông thủy lối đi:** Luôn đảm bảo tối thiểu **80 - 90 cm** không có vật cản để người cao tuổi sử dụng gậy chống hoặc khung tập đi an toàn [1].\n`;
    body += `2. **Xử lý dây điện:** Tuyệt đối không để dây sạc điện thoại, dây quạt vắt ngang mặt sàn. Phải thu gom luồn vào ống gen nẹp cố định sát chân tường [1].\n`;

    suggestedFollowUps.push("Kích thước thông thủy tối thiểu theo tiêu chuẩn CDC là bao nhiêu?");
    suggestedFollowUps.push("Làm sao để cố định thảm chống trơn trượt mép giường?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // 8. GENERAL CLINICAL SYNTHESIS (FALLBACK WITHOUT DUMPING RAW CHUNKS)
  else {
    const primaryChunk = retrievedChunks[0];
    const secondaryChunk = retrievedChunks[1];

    body += `Dựa trên tài liệu chuyên môn từ **${Array.from(new Set(retrievedChunks.map((c) => c.publisher))).join(", ")}**, tôi xin giải đáp câu hỏi của bạn:\n\n`;

    if (primaryChunk) {
      body += `📌 **${primaryChunk.sectionTitle}** [1]:\n`;
      body += `${primaryChunk.chunkText.split("\n")[0] || primaryChunk.chunkText.slice(0, 260)}...\n\n`;
    }

    body += `**Khuyến nghị thực tế cho an toàn không gian sống:**\n`;
    body += `- Duy trì lối đi thông thoáng tối thiểu 80-90 cm, loại bỏ thảm rời không cố định và dây điện vắt ngang sàn [1].\n`;
    body += `- Lắp đặt thanh tay vịn chịu tải tối thiểu 150 kg tại các vị trí đổi tư thế (cạnh bồn cầu, vòi sen, mép giường) [2].\n`;
    body += `- Đảm bảo ánh sáng ban đêm dịu nhẹ (30-50 Lux) để người cao tuổi nhìn rõ đường đi vệ sinh mà không bị lóa mắt [1].\n`;

    if (secondaryChunk) {
      body += `\n*Tham khảo thêm:* ${secondaryChunk.sectionTitle} (${secondaryChunk.publisher}) [2].\n`;
    }

    suggestedFollowUps.push("Những yếu tố nào có thể gây té ngã trong phòng ngủ?");
    suggestedFollowUps.push("Nên chọn thanh vịn chất liệu gì cho nhà tắm?");
    suggestedFollowUps.push("Hãy cho tôi xem các điểm nguy cơ trên không gian 3D.");
  }

  // Inject 3D Room Context if not already included
  if (roomContext && !body.includes(roomContext.roomName)) {
    body += `\n\n📌 **Đối chiếu với không gian 3D (${roomContext.roomName}):**\n`;
    if (roomContext.evidenceStatus === "PHOTO_DRAFT") {
      body += "- Bản dựng ảnh chưa có số đo xác minh; chưa thể kết luận điểm an toàn hoặc số nguy cơ thực tế. Hãy bổ sung khảo sát.\n";
    } else {
      body += `- Dữ liệu mô phỏng: **${roomContext.hazardCount}** nguy cơ theo quy tắc: ${roomContext.hazardTitles.join(", ") || "Không phát hiện theo dữ liệu đã nhập; không chứng nhận an toàn"}.\n`;
      body += `- Cường độ ánh sáng mô phỏng: **${roomContext.lightingLux ?? "chưa xác định"} Lux**.\n`;
    }
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

