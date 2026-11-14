import { RetrievedChunk, SufficiencyEvaluationResult, UserIntent, EvidenceStatus } from "./types";
import { tokenizeQuery } from "./retrieval";

/**
 * Evaluates whether the retrieved evidence is genuinely sufficient,
 * partially supported, insufficient, or out of scope.
 */
export function evaluateEvidenceSufficiency(
  query: string,
  intent: UserIntent,
  chunks: RetrievedChunk[]
): SufficiencyEvaluationResult {
  // 1. Emergency situation
  if (intent === "EMERGENCY") {
    return {
      status: "EMERGENCY",
      intent,
      confidenceScore: 1.0,
      coverageRationale: "Tình huống cấp cứu chấn thương cấp tính, cần hỗ trợ y tế khẩn cấp ngay lập tức.",
      missingElements: ["Hỗ trợ y tế chuyên khoa tại hiện trường"],
      isEmergency: true,
      isOutOfScope: true,
    };
  }

  // 2. Out-of-scope medical (diagnosis/prescriptions)
  if (intent === "OUT_OF_SCOPE_MEDICAL") {
    return {
      status: "OUT_OF_SCOPE",
      intent,
      confidenceScore: 0.0,
      coverageRationale: "Yêu cầu chẩn đoán lâm sàng hoặc kê đơn thuốc ngoài phạm vi tư vấn an toàn không gian sống.",
      missingElements: ["Chỉ định của bác sĩ chuyên khoa"],
      isEmergency: false,
      isOutOfScope: true,
    };
  }

  // 3. Check if no chunks retrieved
  if (chunks.length === 0) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      intent,
      confidenceScore: 0.0,
      coverageRationale: "Không tìm thấy đoạn văn nào trong kho tài liệu chuẩn đáp ứng câu hỏi này.",
      missingElements: ["Tài liệu hướng dẫn chuyên môn phù hợp"],
      isEmergency: false,
      isOutOfScope: false,
    };
  }

  // 4. Check for unsupported specific numerical claims (e.g. "80%", "95% giảm ngã")
  const numericMatch = query.match(/(\d+)\s*%/);
  if (numericMatch) {
    const claimedNumber = numericMatch[1];
    // Check if any retrieved chunk actually contains this exact percentage
    const hasNumberInEvidence = chunks.some((c) =>
      c.chunkText.includes(`${claimedNumber}%`) || c.chunkText.includes(`${claimedNumber} %`)
    );
    if (!hasNumberInEvidence) {
      return {
        status: "INSUFFICIENT_EVIDENCE",
        intent,
        confidenceScore: 0.35,
        coverageRationale: `Câu hỏi chứa số liệu khẳng định (${claimedNumber}%) không có trong bất kỳ tài liệu nào đã thẩm định.`,
        missingElements: [`Bằng chứng thực nghiệm xác thực con số ${claimedNumber}%`],
        isEmergency: false,
        isOutOfScope: false,
      };
    }
  }

  // 5. Calculate lexical coverage of query terms across retrieved chunks
  const queryTokens = tokenizeQuery(query);
  const combinedText = chunks.map((c) => `${c.sectionTitle} ${c.chunkText}`).join(" ").toLowerCase();

  let matchedTokens = 0;
  const missingTokens: string[] = [];
  for (const token of queryTokens) {
    if (combinedText.includes(token)) {
      matchedTokens++;
    } else {
      missingTokens.push(token);
    }
  }

  const coverageRatio = queryTokens.length > 0 ? matchedTokens / queryTokens.length : 0;
  const topScore = chunks[0]?.score || 0;

  // Mathematically formulated confidence score
  // Based strictly on query coverage ratio and retrieval strength (not a fake accuracy claim)
  const confidenceScore = Math.min(
    1.0,
    Math.round(
      (0.5 * coverageRatio + 0.3 * Math.min(1.0, topScore / 8) + 0.2 * Math.min(1.0, chunks.length / 3)) * 100
    ) / 100
  );

  let status: EvidenceStatus = "SUPPORTED";
  let rationale = "Các tài liệu đã thẩm định cung cấp đầy đủ căn cứ trực tiếp cho câu hỏi.";

  if (coverageRatio < 0.35 || topScore < 2.5) {
    status = "INSUFFICIENT_EVIDENCE";
    rationale = "Tài liệu hiện có chưa đủ thông tin chi tiết để kết luận chắc chắn.";
  } else if (coverageRatio < 0.45 && topScore < 5.0) {
    status = "PARTIALLY_SUPPORTED";
    rationale = "Tài liệu cung cấp nguyên tắc chung nhưng cần xem xét thêm bối cảnh cụ thể của từng căn nhà.";
  }

  return {
    status,
    intent,
    confidenceScore,
    coverageRationale: rationale,
    missingElements: missingTokens.slice(0, 3),
    isEmergency: false,
    isOutOfScope: false,
  };
}
