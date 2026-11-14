import { UserIntent } from "./types";

export interface AnalyzedQuery {
  originalQuery: string;
  rewrittenQuery: string;
  intent: UserIntent;
  isEmergency: boolean;
  isOutOfScope: boolean;
  isPromptInjection: boolean;
  extractedEntities: {
    roomType?: string;
    objectType?: string;
    targetResident?: string;
  };
  clarificationRequired?: string;
}

export interface ConversationTurn {
  role: "user" | "assistant" | "system";
  content: string;
}

// Regex patterns for Emergency and Out-of-Scope medical queries
const EMERGENCY_KEYWORDS = [
  /vừa\s+(té|ngã)\s+(bất tỉnh|chảy máu|đau dữ dội|gãy xương|không dậy được)/i,
  /cấp cứu/i,
  /gọi 115/i,
  /ngất xỉu/i,
  /chấn thương sọ não/i,
  /co giật/i,
  /hôn mê/i,
];

const OUT_OF_SCOPE_MEDICAL_KEYWORDS = [
  /uống thuốc gì/i,
  /kê đơn/i,
  /chẩn đoán bệnh/i,
  /liều dùng thuốc/i,
  /bị bệnh gì/i,
  /thuốc điều trị/i,
  /kháng sinh/i,
  /tiêm thuốc/i,
  /prescription/i,
  /medication/i,
  /diagnos/i,
];

const PROMPT_INJECTION_KEYWORDS = [
  /ignore (all )?previous instructions/i,
  /system prompt/i,
  /bỏ qua (mọi )?chỉ dẫn/i,
  /hãy giả vờ/i,
  /jailbreak/i,
  /reveal (the )?secret/i,
  /bật chế độ dev/i,
  /you are now DAN/i,
  /act as an? unrestricted/i,
];

/**
 * Classify user's query intent and assess safety flags.
 */
export function analyzeUserQuery(
  query: string,
  history: ConversationTurn[] = []
): AnalyzedQuery {
  const trimmed = query.trim();

  // 1. Check Prompt Injection
  const isPromptInjection = PROMPT_INJECTION_KEYWORDS.some((rgx) =>
    rgx.test(trimmed)
  );
  if (isPromptInjection) {
    return {
      originalQuery: trimmed,
      rewrittenQuery: trimmed,
      intent: "OUT_OF_SCOPE_MEDICAL",
      isEmergency: false,
      isOutOfScope: true,
      isPromptInjection: true,
      extractedEntities: {},
    };
  }

  // 2. Check Emergency
  const isEmergency = EMERGENCY_KEYWORDS.some((rgx) => rgx.test(trimmed));
  if (isEmergency) {
    return {
      originalQuery: trimmed,
      rewrittenQuery: trimmed,
      intent: "EMERGENCY",
      isEmergency: true,
      isOutOfScope: true,
      isPromptInjection,
      extractedEntities: {},
    };
  }

  // 3. Check Out-of-scope medical question
  const isOutOfScope = OUT_OF_SCOPE_MEDICAL_KEYWORDS.some((rgx) =>
    rgx.test(trimmed)
  );
  if (isOutOfScope) {
    return {
      originalQuery: trimmed,
      rewrittenQuery: trimmed,
      intent: "OUT_OF_SCOPE_MEDICAL",
      isEmergency: false,
      isOutOfScope: true,
      isPromptInjection,
      extractedEntities: {},
    };
  }

  // 4. Intent Classification
  let intent: UserIntent = "GENERAL_SAFETY";
  const lower = trimmed.toLowerCase();

  // Detect follow-up signals
  const isFollowUp =
    history.length > 0 &&
    (/^(vậy|thế|còn|vậy thì|nên đặt ở đâu|ở đâu|lắp như thế nào|tại sao lại thế|còn trong)/i.test(
      trimmed
    ) ||
      trimmed.length < 25);

  if (isFollowUp) {
    intent = "FOLLOW_UP";
  } else if (
    lower.includes("bằng chứng") ||
    lower.includes("nghiên cứu") ||
    lower.includes("số liệu") ||
    lower.includes("chứng minh") ||
    lower.includes("giảm bao nhiêu") ||
    lower.includes("%")
  ) {
    intent = "EVIDENCE_REQUEST";
  } else if (
    lower.includes("tại sao") ||
    lower.includes("nguyên nhân") ||
    lower.includes("tác dụng gì") ||
    lower.includes("nguy hiểm như thế nào")
  ) {
    intent = "EXPLANATION_REQUEST";
  } else if (
    lower.includes("làm thế nào") ||
    lower.includes("cần làm gì") ||
    lower.includes("khắc phục") ||
    lower.includes("sửa đổi") ||
    lower.includes("bố trí") ||
    lower.includes("hướng dẫn") ||
    lower.includes("cần trang bị") ||
    lower.includes("giải pháp") ||
    lower.includes("có nên") ||
    lower.includes("nên đặt") ||
    lower.includes("cần chừa") ||
    lower.includes("rộng bao nhiêu") ||
    lower.includes("khoảng chừng nào") ||
    lower.includes("cần lưu ý") ||
    lower.includes("tiêu chuẩn") ||
    lower.includes("quy chuẩn")
  ) {
    intent = "RECOMMENDATION_REQUEST";
  }

  // 5. Query Rewriting for Follow-ups using previous conversation context
  let rewritten = trimmed;
  if (intent === "FOLLOW_UP" && history.length > 0) {
    // Find the latest user query from history to resolve anaphora
    const lastUserTurn = [...history]
      .reverse()
      .find((t) => t.role === "user");

    if (lastUserTurn) {
      const prevTopic = extractCoreTopic(lastUserTurn.content);
      if (prevTopic) {
        if (/vậy nên đặt ở đâu|ở đâu|vị trí nào/i.test(trimmed)) {
          rewritten = `Vị trí lắp đặt an toàn cho ${prevTopic}`;
        } else if (/còn (trong|ở) ([^?]+)/i.test(trimmed)) {
          const match = trimmed.match(/còn (trong|ở) ([^?]+)/i);
          const room = match ? match[2].trim() : "không gian khác";
          rewritten = `Kiểm tra an toàn đối với ${prevTopic} trong ${room}`;
        } else {
          rewritten = `${prevTopic} - ${trimmed}`;
        }
      }
    }
  }

  // 6. Extract spatial entities
  const extractedEntities: AnalyzedQuery["extractedEntities"] = {};
  if (/phòng ngủ/i.test(rewritten)) extractedEntities.roomType = "BEDROOM";
  if (/phòng tắm|nhà vệ sinh|toilet|wc/i.test(rewritten))
    extractedEntities.roomType = "BATHROOM";
  if (/phòng khách/i.test(rewritten)) extractedEntities.roomType = "LIVING_ROOM";

  if (/thảm/i.test(rewritten)) extractedEntities.objectType = "RUG";
  if (/dây điện|cáp/i.test(rewritten)) extractedEntities.objectType = "CABLE";
  if (/đèn|ánh sáng|chiếu sáng|lux/i.test(rewritten))
    extractedEntities.objectType = "LIGHTING";
  if (/thanh vịn|tay vịn/i.test(rewritten))
    extractedEntities.objectType = "GRAB_BAR";

  return {
    originalQuery: trimmed,
    rewrittenQuery: rewritten,
    intent,
    isEmergency: false,
    isOutOfScope: false,
    isPromptInjection,
    extractedEntities,
  };
}

/**
 * Helper to extract noun phrase / subject from a previous user turn.
 */
function extractCoreTopic(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("thanh vịn") || lower.includes("tay vịn"))
    return "thanh tay vịn nhà vệ sinh";
  if (lower.includes("thảm") || lower.includes("thảm trải sàn"))
    return "thảm trải sàn phòng ngừa vấp ngã";
  if (lower.includes("dây điện") || lower.includes("ổ cắm"))
    return "dây điện vắt ngang lối đi";
  if (lower.includes("chiếu sáng") || lower.includes("độ sáng") || lower.includes("đèn ngủ"))
    return "chiếu sáng ban đêm";
  if (lower.includes("sàn ướt") || lower.includes("chống trượt"))
    return "sàn nhà tắm trơn trượt";
  if (lower.includes("phòng ngủ")) return "an toàn phòng ngủ người cao tuổi";
  if (lower.includes("phòng tắm")) return "an toàn phòng tắm người cao tuổi";
  return text.slice(0, 40);
}
