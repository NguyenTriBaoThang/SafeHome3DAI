/**
 * ==============================================================================
 * TASK A09: CLINICAL & SAFETY RESPONSE GUARDRAILS
 * ==============================================================================
 * Ensures RAG / Copilot responses:
 * 1. Never make absolute safety or fall-prevention guarantees ("chắc chắn 100%", "không bao giờ ngã").
 * 2. Never diagnose medical conditions, prescribe drugs/dosages, or predict personal fall probability.
 * 3. Provide clear, polite clinical escalation notices when out-of-scope, insufficient, or emergency.
 * 4. Keep untrusted user/injection text isolated from system safety assertions.
 * ==============================================================================
 */
import { EvidenceStatus } from "./types";

export interface GuardrailCheckSummary {
  noAbsoluteGuarantees: boolean;
  noMedicalDiagnosisOrPrescription: boolean;
  noFallProbabilityPrediction: boolean;
  hasClinicalEscalationWhenNeeded: boolean;
  politeAndReadable: boolean;
}

export interface GuardrailEnforcementResult {
  safeAnswer: string;
  compliant: boolean;
  triggeredGuardrails: string[];
  checks: GuardrailCheckSummary;
}

const ABSOLUTE_CLAIM_REPLACEMENTS: Array<{ id: string; regex: RegExp; replacement: string }> = [
  {
    id: "ABSOLUTE_ZERO_FALL_GUARANTEE",
    regex: /(?:đảm bảo|cam kết|khẳng định)\s*(?:sẽ\s*)?(?:không bao giờ|hoàn toàn không|100%\s*không)\s*(?:bị\s*)?(?:té\s*ngã|ngã)/gi,
    replacement: "góp phần giảm thiểu rủi ro té ngã trong môi trường sống (không cam kết loại bỏ hoàn toàn nguy cơ)",
  },
  {
    id: "ABSOLUTE_PERCENT_GUARANTEE",
    regex: /(?:chắc chắn|an toàn|hiệu quả)\s*(?:tuyệt đối\s*)?100%/gi,
    replacement: "hỗ trợ cải thiện an toàn môi trường (mức độ hiệu quả phụ thuộc thực tế hiện trường và thể trạng cá nhân)",
  },
  {
    id: "ELIMINATE_ALL_RISK",
    regex: /(?:loại bỏ hoàn toàn|triệt tiêu 100%)\s*(?:mọi\s*)?(?:nguy cơ|rủi ro)\s*(?:té\s*ngã|ngã)/gi,
    replacement: "giảm bớt các yếu tố nguy cơ môi trường thường gặp",
  },
];

const PROHIBITED_PRESCRIPTION_PATTERNS: RegExp[] = [
  /(?:^|\s)(?:uống|dùng|tiêm)\s+\d+\s*(?:mg|ml|viên|gói)(?=\s|[.,;!?]|$)/i,
  /kê đơn cho bạn/i,
  /chẩn đoán xác định bạn bị/i,
];

const PROHIBITED_PROBABILITY_PREDICTION_PATTERNS: RegExp[] = [
  /xác suất\s*(?:té\s*ngã|ngã)[^.\n]{0,50}(?:là|khoảng|đạt|tới)\s*\d+\s*%/i,
  /nguy cơ\s*(?:té\s*ngã|ngã)\s*(?:cá nhân)?[^.\n]{0,50}(?:là|bằng|khoảng|đạt)\s*\d+\s*%/i,
];

const CLINICAL_ESCALATION_REGEX = /(?:bác sĩ|dược sĩ|nhân viên y tế|chuyên khoa|cấp cứu 115|cơ sở y tế|chuyên gia)/i;

/**
 * Audits and sanitizes an outgoing RAG/Copilot response against Task A09 guardrails.
 */
export function applySafetyResponseGuardrails(
  rawAnswer: string,
  options: {
    evidenceStatus: EvidenceStatus;
    isOutOfScope?: boolean;
    isEmergency?: boolean;
    isPromptInjection?: boolean;
  }
): GuardrailEnforcementResult {
  let safeAnswer = rawAnswer;
  const triggeredGuardrails: string[] = [];

  // 1. Neutralize any absolute safety or fall-elimination promises
  let hadAbsoluteClaim = false;
  for (const rule of ABSOLUTE_CLAIM_REPLACEMENTS) {
    if (rule.regex.test(safeAnswer)) {
      hadAbsoluteClaim = true;
      triggeredGuardrails.push(rule.id);
      safeAnswer = safeAnswer.replace(rule.regex, rule.replacement);
    }
  }

  // 2. Flag or block accidental drug dosage prescriptions / diagnosis statements
  const hasPrescriptionOrDiagnosis = PROHIBITED_PRESCRIPTION_PATTERNS.some((rgx) => rgx.test(safeAnswer));
  if (hasPrescriptionOrDiagnosis) {
    triggeredGuardrails.push("BLOCKED_PRESCRIPTION_OR_DIAGNOSIS");
    safeAnswer =
      "Xin lỗi, SafeHome Copilot chỉ hỗ trợ sàng lọc an toàn không gian sống và không có thẩm quyền chẩn đoán bệnh lý hay chỉ định liều dùng thuốc. Bạn vui lòng tham vấn trực tiếp bác sĩ hoặc dược sĩ chuyên khoa để được thăm khám an toàn.";
  }

  // 3. Block personalized fall probability predictions
  const hasProbabilityPrediction = PROHIBITED_PROBABILITY_PREDICTION_PATTERNS.some((rgx) =>
    rgx.test(safeAnswer)
  );
  if (hasProbabilityPrediction) {
    triggeredGuardrails.push("BLOCKED_FALL_PROBABILITY_PREDICTION");
    safeAnswer =
      "SafeHome Copilot không dự báo xác suất té ngã cá nhân theo phần trăm. Hệ thống chỉ hỗ trợ nhận diện các yếu tố môi trường cần kiểm tra tại nhà; để đánh giá nguy cơ lâm sàng toàn diện, gia đình nên đưa người thân đi khám chuyên khoa lão khoa.";
  }

  // 4. Ensure clinical/specialist escalation guidance is present when refusal/insufficient/emergency
  const needsEscalation =
    Boolean(options.isOutOfScope) ||
    Boolean(options.isEmergency) ||
    options.evidenceStatus === "OUT_OF_SCOPE" ||
    options.evidenceStatus === "EMERGENCY" ||
    options.evidenceStatus === "INSUFFICIENT_EVIDENCE";

  let hasClinicalEscalationWhenNeeded = true;
  if (needsEscalation && !CLINICAL_ESCALATION_REGEX.test(safeAnswer)) {
    triggeredGuardrails.push("ADDED_CLINICAL_ESCALATION_NOTICE");
    safeAnswer +=
      "\n\n🩺 **Khuyến nghị tham vấn chuyên môn:** Khi có băn khoăn về triệu chứng sức khỏe, thuốc điều trị hoặc tình trạng vận động thực tế, xin vui lòng trao đổi trực tiếp với bác sĩ hoặc nhân viên y tế.";
    hasClinicalEscalationWhenNeeded = CLINICAL_ESCALATION_REGEX.test(safeAnswer);
  }

  const politeAndReadable =
    safeAnswer.trim().length >= 20 &&
    !/[<>{}]/.test(safeAnswer.replace(/https?:\/\/\S+/g, ""));

  return {
    safeAnswer,
    compliant:
      !hasPrescriptionOrDiagnosis &&
      !hasProbabilityPrediction &&
      hasClinicalEscalationWhenNeeded &&
      politeAndReadable &&
      !hadAbsoluteClaim,
    triggeredGuardrails,
    checks: {
      noAbsoluteGuarantees: !ABSOLUTE_CLAIM_REPLACEMENTS.some((r) => r.regex.test(safeAnswer)),
      noMedicalDiagnosisOrPrescription: !hasPrescriptionOrDiagnosis,
      noFallProbabilityPrediction: !hasProbabilityPrediction,
      hasClinicalEscalationWhenNeeded,
      politeAndReadable,
    },
  };
}

