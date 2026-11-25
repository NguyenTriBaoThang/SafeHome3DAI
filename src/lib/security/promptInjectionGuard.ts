/**
 * ==============================================================================
 * PROMPT INJECTION GUARD FOR UNTRUSTED IMAGE / OCR / CAPTION DATA (TASK A07)
 * ==============================================================================
 * Ensures text extracted from room photos (OCR signs, notes), user captions,
 * itemHints, or external RAG passages is treated strictly as untrusted data and
 * can NEVER override system safety thresholds or clinical rules.
 * ==============================================================================
 */

const UNTRUSTED_INJECTION_PATTERNS: Array<{ id: string; regex: RegExp }> = [
  { id: "IGNORE_INSTRUCTIONS", regex: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i },
  { id: "SYSTEM_PROMPT_OVERRIDE", regex: /(?:system\s*prompt|system\s*override|\[SYSTEM\]|###\s*SYSTEM)/i },
  { id: "DEVELOPER_JAILBREAK", regex: /(?:developer\s*mode|jailbreak|bật chế độ dev|you are now DAN)/i },
  { id: "SCORE_TAMPERING", regex: /(?:force|set|override)\s+(?:safety\s*)?score\s*(?:to|=|:)?\s*100/i },
  { id: "VI_SCORE_TAMPERING", regex: /(?:ép|đặt|gán|chỉnh)\s*(?:điểm\s*an\s*toàn|safety\s*score)\s*(?:thành|lên|=)?\s*100/i },
  { id: "VI_IGNORE_RULES", regex: /(?:bỏ qua|phớt lờ|vô hiệu hóa)\s*(?:mọi\s*|toàn bộ\s*|các\s*)?(?:chỉ dẫn|hướng dẫn|quy tắc|luật|hệ thống|tài liệu|nguồn|chứng cứ|bằng chứng)/i },
  { id: "SECRET_EXFILTRATION", regex: /(?:reveal|print|output|show|tiết lộ)\s*(?:the\s*)?(?:api[_\s]?key|gemini_api_key|secret|password|env)/i },
  { id: "MARKUP_SCRIPT_TAG", regex: /<\s*script\b[^>]*>/i },
];

export interface PromptInjectionCheckResult {
  isInjection: boolean;
  matchedRuleIds: string[];
  sanitizedText: string;
}

/**
 * Inspects and neutralizes untrusted text from OCR, captions, or external inputs.
 */
export function inspectAndSanitizeUntrustedText(
  rawText: string | null | undefined,
  maxLength = 300
): PromptInjectionCheckResult {
  if (!rawText || typeof rawText !== "string") {
    return { isInjection: false, matchedRuleIds: [], sanitizedText: "" };
  }

  const bounded = rawText.replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
  const matchedRuleIds: string[] = [];

  for (const pattern of UNTRUSTED_INJECTION_PATTERNS) {
    if (pattern.regex.test(bounded)) {
      matchedRuleIds.push(pattern.id);
    }
  }

  if (matchedRuleIds.length > 0) {
    return {
      isInjection: true,
      matchedRuleIds,
      sanitizedText: "[NỘI DUNG BỊ CÁCH LY DO CHỨA MẪU CAN THIỆP HỆ THỐNG]",
    };
  }

  // Strip XML/delimiter breakouts that could escape <untrusted_data> wrappers
  const safeText = bounded.replace(/<\/?\s*(?:system|instruction|room_context|evidence_context|untrusted_data)\b[^>]*>/gi, "");

  return {
    isInjection: false,
    matchedRuleIds: [],
    sanitizedText: safeText,
  };
}

/**
 * Wraps untrusted user/OCR string safely for prompt inclusion without allowing directive takeover.
 */
export function wrapUntrustedPromptData(label: string, rawText: string | null | undefined): string {
  const checked = inspectAndSanitizeUntrustedText(rawText, 500);
  return `<untrusted_data label="${label.replace(/[^a-zA-Z0-9_-]/g, "")}">${checked.sanitizedText}</untrusted_data>`;
}

