import { RetrievedChunk, SourceSupportEntry, StructuredCitation } from "./types";
import { validateOfficialSourceUrl } from "./documentRegistry";

export interface CitationVerificationResult {
  verifiedAnswer: string;
  citations: StructuredCitation[];
  validCitationCount: number;
  invalidCitationCount: number;
  mismatchCitationCount: number;
  sourceSupportMap: SourceSupportEntry[];
  warnings: string[];
}

const VERIFIER_STOPWORDS = new Set([
  "trong", "ngoài", "của", "và", "với", "các", "những", "cái", "là", "có", "được",
  "để", "thế", "nào", "nên", "cho", "thì", "mà", "nhưng", "tại", "vì", "khi",
  "nếu", "theo", "hãy", "cần", "phải", "này", "đó", "cùng", "vào", "lên", "xuống",
  "gây", "làm", "giúp", "tránh", "không", "hoặc", "người", "cao", "tuổi", "gia",
  "đình", "the", "and", "for", "with", "that", "this", "from", "into",
]);

function extractContentTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>|*+]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !VERIFIER_STOPWORDS.has(t));
}

function extractClaimSegmentForMatch(rawAnswer: string, matchStart: number): string {
  const before = rawAnswer.slice(0, matchStart);
  const after = rawAnswer.slice(matchStart);
  const startBoundary = Math.max(
    before.lastIndexOf("\n"),
    before.lastIndexOf(". "),
    before.lastIndexOf("; "),
    before.lastIndexOf("! "),
    before.lastIndexOf("? ")
  );
  const endNewline = after.indexOf("\n");
  const endPeriod = after.indexOf(". ");
  const candidates = [endNewline, endPeriod].filter((idx) => idx >= 0);
  const endBoundary = candidates.length > 0 ? matchStart + Math.min(...candidates) : rawAnswer.length;

  return rawAnswer
    .slice(startBoundary >= 0 ? startBoundary + 1 : 0, endBoundary)
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * Evaluates lexical support between a generated sentence claim and the cited chunk.
 */
export function evaluateClaimSupportAgainstChunk(
  claimText: string,
  chunk: RetrievedChunk
): { supported: boolean; overlapScore: number; reason: string } {
  const claimTokens = Array.from(new Set(extractContentTokens(claimText)));
  const sourceTokens = new Set(extractContentTokens(`${chunk.sectionTitle} ${chunk.chunkText}`));

  if (claimTokens.length === 0) {
    return { supported: true, overlapScore: 1, reason: "Trích dẫn ngắn gọn/tham chiếu tiêu đề" };
  }

  let matched = 0;
  for (const token of claimTokens) {
    if (sourceTokens.has(token)) {
      matched++;
    }
  }

  const overlapScore = Math.round((matched / claimTokens.length) * 100) / 100;
  // Detect retrieval/citation mismatch: substantive claim (>= 2 content tokens) without sufficient whole-token grounding in chunk
  if (claimTokens.length >= 2 && (matched === 0 || (claimTokens.length >= 4 && overlapScore < 0.15))) {
    return {
      supported: false,
      overlapScore,
      reason: "Khẳng định trong câu không có từ khóa/ngữ nghĩa tương ứng trong đoạn trích được gắn",
    };
  }

  return {
    supported: true,
    overlapScore,
    reason: `Khớp ${matched}/${claimTokens.length} thuật ngữ nội dung với đoạn trích nguồn`,
  };
}

/**
 * Parses inline citations like [1], [2], verifies they correspond to actual
 * retrieved chunks, validates official URLs, checks claim-to-chunk support (sourceSupportMap),
 * strips invalid/hallucinated/mismatched citation numbers,
 * and formats structured citation metadata for UI rendering and DB persistence.
 */
export function verifyAndFormatCitations(
  rawAnswer: string,
  retrievedChunks: RetrievedChunk[]
): CitationVerificationResult {
  const warnings: string[] = [];
  const chunkMap = new Map<number, RetrievedChunk>();

  retrievedChunks.forEach((chunk, index) => {
    const idx = chunk.citationIndex ?? index + 1;
    chunkMap.set(idx, chunk);
  });

  const citedIndices = new Set<number>();
  const sourceSupportMap: SourceSupportEntry[] = [];
  let validCount = 0;
  let invalidCount = 0;
  let mismatchCount = 0;

  const verifiedAnswer = rawAnswer.replace(/\[(\d+)(?:,\s*(\d+))*\]/g, (match, ...args) => {
    const offset = typeof args[args.length - 2] === "number" ? (args[args.length - 2] as number) : 0;
    const rawNumbers = match
      .slice(1, -1)
      .split(",")
      .map((s) => parseInt(s.trim(), 10));
    const validNumbers: number[] = [];
    const claimText = extractClaimSegmentForMatch(rawAnswer, offset);

    for (const num of rawNumbers) {
      const chunk = chunkMap.get(num);
      if (!chunk) {
        invalidCount++;
        warnings.push(`Phát hiện và loại bỏ số trích dẫn không có thật [${num}]`);
        continue;
      }

      const urlCheck = validateOfficialSourceUrl(chunk.officialUrl);
      if (!urlCheck.valid) {
        invalidCount++;
        warnings.push(`Loại bỏ trích dẫn [${num}] do URL không hợp lệ: ${urlCheck.reason}`);
        sourceSupportMap.push({
          citationNumber: num,
          citationId: `cite-${chunk.chunkId}-${num}`,
          documentId: chunk.documentId,
          chunkId: chunk.chunkId,
          claimText,
          supported: false,
          overlapScore: 0,
          reason: urlCheck.reason || "URL nguồn không hợp lệ",
          sourceSpan: { startOffset: chunk.startOffset, endOffset: chunk.endOffset },
        });
        continue;
      }

      const claimCheck = evaluateClaimSupportAgainstChunk(claimText, chunk);
      sourceSupportMap.push({
        citationNumber: num,
        citationId: `cite-${chunk.chunkId}-${num}`,
        documentId: chunk.documentId,
        chunkId: chunk.chunkId,
        claimText,
        supported: claimCheck.supported,
        overlapScore: claimCheck.overlapScore,
        reason: claimCheck.reason,
        sourceSpan: { startOffset: chunk.startOffset, endOffset: chunk.endOffset },
      });

      if (!claimCheck.supported) {
        mismatchCount++;
        invalidCount++;
        warnings.push(`Loại bỏ trích dẫn [${num}] do nội dung đoạn nguồn không hỗ trợ phát biểu này (${claimCheck.reason})`);
        continue;
      }

      validNumbers.push(num);
      citedIndices.add(num);
      validCount++;
    }

    if (validNumbers.length === 0) {
      return "";
    }
    return `[${validNumbers.join(", ")}]`;
  });

  const citations: StructuredCitation[] = [];
  const targetIndices = Array.from(citedIndices).sort((a, b) => a - b);

  for (const idx of targetIndices) {
    const chunk = chunkMap.get(idx);
    if (!chunk) continue;

    const urlCheck = validateOfficialSourceUrl(chunk.officialUrl);
    if (!urlCheck.valid) continue;

    citations.push({
      citationId: `cite-${chunk.chunkId}-${idx}`,
      citationNumber: idx,
      documentId: chunk.documentId,
      chunkId: chunk.chunkId,
      documentTitle: chunk.documentTitle,
      publisher: chunk.publisher,
      sectionTitle: chunk.sectionTitle,
      pageNumber: chunk.pageNumber,
      supportingExcerpt: chunk.chunkText,
      officialUrl: urlCheck.normalizedUrl,
      accessLink: urlCheck.normalizedUrl,
      publicationDate: chunk.publicationDate,
      lastVerifiedAt: chunk.lastVerifiedAt,
      version: chunk.version,
      contentHash: chunk.contentHash,
      license: chunk.license,
      sourceSpan:
        chunk.startOffset !== undefined || chunk.endOffset !== undefined
          ? { startOffset: chunk.startOffset, endOffset: chunk.endOffset }
          : undefined,
    });
  }

  return {
    verifiedAnswer,
    citations,
    validCitationCount: validCount,
    invalidCitationCount: invalidCount,
    mismatchCitationCount: mismatchCount,
    sourceSupportMap,
    warnings,
  };
}
