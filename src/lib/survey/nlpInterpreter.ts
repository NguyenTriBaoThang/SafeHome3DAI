import { NLPInterpretationProposal, SurveyQuestion } from "./types";

/**
 * Natural language interpreter for Vietnamese survey answers.
 * Parses free-form text and extracts structured values with explainable confidence.
 */
export function interpretVietnameseAnswer(
  question: SurveyQuestion,
  userInput: string
): NLPInterpretationProposal {
  const trimmed = userInput.trim().toLowerCase();

  // 1. Check for Unknown / Uncertainty signals
  const UNKNOWN_SIGNALS = [
    "không biết",
    "chưa rõ",
    "không rõ",
    "chưa đo",
    "không chắc",
    "để hỏi lại",
    "chưa kiểm tra",
    "tùy hôm",
  ];
  const isUnknown = UNKNOWN_SIGNALS.some((sig) => trimmed.includes(sig));

  if (isUnknown) {
    if (question.answerType === "DIMENSIONS") {
      return {
        questionId: question.questionId,
        extractedValue: { lengthM: null, widthM: null, isUnknown: true },
        confidenceScore: 0.95,
        needsUserConfirmation: false,
        rationale: "Người dùng cho biết hiện chưa rõ hoặc chưa đo kích thước phòng.",
      };
    }

    return {
      questionId: question.questionId,
      extractedValue: "UNKNOWN",
      confidenceScore: 0.95,
      needsUserConfirmation: false,
      rationale: "Người dùng phản hồi chưa rõ hoặc chưa thể xác định thông tin này.",
    };
  }

  // 2. DIMENSIONS Parsing
  if (question.answerType === "DIMENSIONS") {
    // E.g., "dài 4 mét, rộng 3 mét" or "4m x 3m" or "khoảng 4x3" or "dài 4.5m rộng 3.2m"
    const lengthMatch =
      trimmed.match(/dài\s*(khoảng|chừng)?\s*([0-9]+[.,]?[0-9]*)\s*(m|mét)?/i) ||
      trimmed.match(/([0-9]+[.,]?[0-9]*)\s*(m|mét)?\s*(dài|chiều dài)/i);

    const widthMatch =
      trimmed.match(/rộng\s*(khoảng|chừng)?\s*([0-9]+[.,]?[0-9]*)\s*(m|mét)?/i) ||
      trimmed.match(/([0-9]+[.,]?[0-9]*)\s*(m|mét)?\s*(rộng|chiều rộng)/i);

    const crossMatch = trimmed.match(/([0-9]+[.,]?[0-9]*)\s*(m|mét)?\s*[x*xX]\s*([0-9]+[.,]?[0-9]*)\s*(m|mét)?/);

    let len: number | null = null;
    let wid: number | null = null;

    if (crossMatch) {
      len = parseFloat(crossMatch[1].replace(",", "."));
      wid = parseFloat(crossMatch[3].replace(",", "."));
    } else {
      if (lengthMatch) {
        len = parseFloat(lengthMatch[2]?.replace(",", ".") || lengthMatch[1]?.replace(",", "."));
      }
      if (widthMatch) {
        wid = parseFloat(widthMatch[2]?.replace(",", ".") || widthMatch[1]?.replace(",", "."));
      }
    }

    if (len && wid && len > 0 && wid > 0 && len <= 20 && wid <= 20) {
      return {
        questionId: question.questionId,
        extractedValue: { lengthM: len, widthM: wid, isUnknown: false },
        confidenceScore: 0.9,
        needsUserConfirmation: true,
        rationale: `Trích xuất được kích thước ước tính: Dài ${len}m, Rộng ${wid}m.`,
      };
    }

    return {
      questionId: question.questionId,
      extractedValue: null,
      confidenceScore: 0.3,
      clarificationMessage:
        "Bạn có thể nhập rõ dạng số, ví dụ '4m x 3m' hoặc chọn 'Chưa rõ kích thước' được không?",
      needsUserConfirmation: false,
      rationale: "Không nhận diện được đủ cặp số chiều dài và chiều rộng hợp lệ.",
    };
  }

  // 3. Multi-choice (e.g. BED_010 obstacles)
  if (question.answerType === "MULTI_CHOICE") {
    const selected: string[] = [];
    if (trimmed.includes("ghế")) selected.push("GHE");
    if (trimmed.includes("tủ")) selected.push("TU");
    if (trimmed.includes("bàn")) selected.push("BAN");
    if (trimmed.includes("hộp") || trimmed.includes("thùng") || trimmed.includes("đồ chơi") || trimmed.includes("đồ đạc dưới sàn")) {
      selected.push("HOP_DO");
    }
    if (trimmed.includes("khác") || trimmed.includes("vật khác")) selected.push("VAT_KHAC");

    if (selected.length > 0) {
      return {
        questionId: question.questionId,
        extractedValue: selected,
        confidenceScore: 0.88,
        needsUserConfirmation: true,
        rationale: `Trích xuất được các loại vật dụng cản trở: ${selected.join(", ")}.`,
      };
    }
  }

  // 4. Single-choice (e.g. BATH_006 grab bar locations, BATH_007 check status)
  if (question.questionId === "BATH_006") {
    if (trimmed.includes("cả hai") || (trimmed.includes("bồn cầu") && trimmed.includes("tắm"))) {
      return {
        questionId: question.questionId,
        extractedValue: "BOTH",
        confidenceScore: 0.92,
        needsUserConfirmation: true,
        rationale: "Nhận diện tay vịn ở cả khu vực bồn cầu và buồng tắm.",
      };
    }
    if (trimmed.includes("bồn cầu") || trimmed.includes("toilet") || trimmed.includes("xí")) {
      return {
        questionId: question.questionId,
        extractedValue: "TOILET",
        confidenceScore: 0.9,
        needsUserConfirmation: true,
        rationale: "Nhận diện vị trí tay vịn gần bồn cầu.",
      };
    }
    if (trimmed.includes("tắm") || trimmed.includes("sen") || trimmed.includes("vòi")) {
      return {
        questionId: question.questionId,
        extractedValue: "SHOWER",
        confidenceScore: 0.9,
        needsUserConfirmation: true,
        rationale: "Nhận diện vị trí tay vịn trong buồng tắm.",
      };
    }
  }

  // 5. Binary YES / NO Evaluation
  const YES_KEYWORDS = [
    "có",
    "đúng",
    "chuẩn",
    "đã có",
    "thường xuyên",
    "rất trơn",
    "bị trơn",
    "bị ướt",
    "bị cản",
    "có thảm",
    "khó khăn",
    "lắp rồi",
    "sáng rõ",
  ];

  const NO_KEYWORDS = [
    "không",
    "chưa",
    "không có",
    "khô ráo",
    "không trơn",
    "không bị",
    "thông thoáng",
    "không cản",
    "tối om",
    "không sáng",
    "bình thường",
    "dễ dàng",
  ];

  // Look for negated assertions (e.g., "không có thảm")
  const hasNo = NO_KEYWORDS.some((kw) => trimmed.includes(kw));
  const hasYes = YES_KEYWORDS.some((kw) => trimmed.includes(kw));

  // Nuance for rugs: check negation first
  if (question.questionId === "BED_006") {
    if (
      trimmed.includes("không có thảm") ||
      trimmed.includes("không dùng thảm") ||
      trimmed.includes("không thảm") ||
      (hasNo && trimmed.includes("thảm"))
    ) {
      return {
        questionId: "BED_006",
        extractedValue: "NO",
        confidenceScore: 0.92,
        needsUserConfirmation: false,
        rationale: "Người dùng xác nhận không có thảm trải sàn trong phòng.",
      };
    }
    if (trimmed.includes("có thảm") || (trimmed.includes("có") && trimmed.includes("thảm"))) {
      return {
        questionId: "BED_006",
        extractedValue: "YES",
        confidenceScore: 0.92,
        needsUserConfirmation: false,
        rationale: "Người dùng xác nhận trong phòng ngủ có thảm trải sàn.",
      };
    }
  }

  // If sentence contains negation word, it takes precedence over isolated "có" (which might be inside "không có")
  if (hasNo) {
    return {
      questionId: question.questionId,
      extractedValue: "NO",
      confidenceScore: 0.88,
      needsUserConfirmation: false,
      rationale: "Phát hiện câu trả lời phủ định (Không / Chưa có).",
    };
  }

  if (hasYes) {
    return {
      questionId: question.questionId,
      extractedValue: "YES",
      confidenceScore: 0.88,
      needsUserConfirmation: false,
      rationale: "Phát hiện câu trả lời khẳng định (Có / Đã có).",
    };
  }

  // 6. Ambiguous fallback
  return {
    questionId: question.questionId,
    extractedValue: null,
    confidenceScore: 0.35,
    clarificationMessage:
      "Bạn có thể chọn trực tiếp một trong các nút lựa chọn bên dưới hoặc diễn đạt ngắn gọn 'Có' / 'Không' được không?",
    needsUserConfirmation: false,
    rationale: "Câu trả lời chứa cả ý khẳng định lẫn phủ định hoặc chưa đủ rõ ràng.",
  };
}
