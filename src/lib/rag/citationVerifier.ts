import { RetrievedChunk, StructuredCitation } from "./types";

export interface CitationVerificationResult {
  verifiedAnswer: string;
  citations: StructuredCitation[];
  validCitationCount: number;
  invalidCitationCount: number;
  warnings: string[];
}

/**
 * Parses inline citations like [1], [2], verifies they correspond to actual
 * retrieved chunks, strips invalid/hallucinated citation numbers,
 * and formats structured citation metadata for UI rendering and DB persistence.
 */
export function verifyAndFormatCitations(
  rawAnswer: string,
  retrievedChunks: RetrievedChunk[]
): CitationVerificationResult {
  const warnings: string[] = [];
  const chunkMap = new Map<number, RetrievedChunk>();

  retrievedChunks.forEach((chunk) => {
    if (chunk.citationIndex) {
      chunkMap.set(chunk.citationIndex, chunk);
    }
  });

  const citedIndices = new Set<number>();
  let validCount = 0;
  let invalidCount = 0;

  // Regex to detect [1], [2], [1, 2], etc.
  const verifiedAnswer = rawAnswer.replace(/\[(\d+)(?:,\s*(\d+))*\]/g, (match, ...groups) => {
    const rawNumbers = match.slice(1, -1).split(",").map((s) => parseInt(s.trim(), 10));
    const validNumbers: number[] = [];

    for (const num of rawNumbers) {
      if (chunkMap.has(num)) {
        validNumbers.push(num);
        citedIndices.add(num);
        validCount++;
      } else {
        invalidCount++;
        warnings.push(`Phát hiện và loại bỏ số trích dẫn không có thật [${num}]`);
      }
    }

    if (validNumbers.length === 0) {
      return ""; // Strip citation if hallucinated
    }
    return `[${validNumbers.join(", ")}]`;
  });

  // Construct structured citation objects for all cited chunks (or top retrieved chunks if explicitly cited)
  const citations: StructuredCitation[] = [];
  const targetIndices = citedIndices.size > 0 ? Array.from(citedIndices) : retrievedChunks.map((_, i) => i + 1);

  targetIndices.sort((a, b) => a - b);

  for (const idx of targetIndices) {
    const chunk = chunkMap.get(idx);
    if (chunk) {
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
        officialUrl: chunk.officialUrl,
        publicationDate: chunk.publicationDate,
        lastVerifiedAt: chunk.lastVerifiedAt,
      });
    }
  }

  return {
    verifiedAnswer,
    citations,
    validCitationCount: validCount,
    invalidCitationCount: invalidCount,
    warnings,
  };
}

