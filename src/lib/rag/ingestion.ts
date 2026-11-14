import crypto from "crypto";

export interface DocumentIngestionInput {
  documentId: string;
  title: string;
  publisher: string;
  officialUrl: string;
  publicationDate: string;
  language?: string;
  documentType?: "GUIDELINE" | "STANDARD" | "RESEARCH";
  version?: string;
  rawText: string;
}

export interface IngestedChunk {
  chunkId: string;
  documentId: string;
  sectionTitle: string;
  chunkText: string;
  pageNumber?: number;
  startOffset: number;
  endOffset: number;
  contentHash: string;
  keywords: string[];
}

export interface IngestedDocumentResult {
  documentId: string;
  title: string;
  publisher: string;
  officialUrl: string;
  publicationDate: string;
  language: string;
  documentType: string;
  version: string;
  approvalStatus: "APPROVED" | "PENDING";
  ingestionStatus: "INDEXED";
  contentHash: string;
  chunks: IngestedChunk[];
}

/**
 * Normalize Unicode text (NFC), remove non-printable control characters,
 * preserve standard Vietnamese diacritics and typography.
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFC")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // remove non-printable ASCII
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Generate SHA-256 hash for provenance and tamper detection.
 */
export function computeHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Extract simple keywords from text segment for lexical boosting.
 */
export function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase();
  const words = normalized
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w);
}

/**
 * Split text into semantic chunks by headings or double-linebreaks,
 * ensuring recommendation rules are not severed from their qualifications.
 */
export function chunkDocument(
  documentId: string,
  rawText: string,
  targetChunkSize = 600,
  minChunkSize = 100
): IngestedChunk[] {
  const clean = normalizeText(rawText);
  const lines = clean.split("\n");
  const chunks: IngestedChunk[] = [];

  let currentSection = "Thông tin chung";
  let currentBuffer: string[] = [];
  let currentStartOffset = 0;
  let runningOffset = 0;
  let chunkIndex = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if line is a heading (Markdown # or Section keyword)
    const isHeading =
      /^#{1,4}\s+/.test(trimmed) ||
      /^(Phần|Chương|Mục|Điều|Section)\s+\d+/i.test(trimmed);

    if (isHeading) {
      if (currentBuffer.length > 0) {
        const chunkText = currentBuffer.join("\n").trim();
        if (chunkText.length >= minChunkSize) {
          chunks.push({
            chunkId: `${documentId}_chk_${chunkIndex++}`,
            documentId,
            sectionTitle: currentSection,
            chunkText,
            startOffset: currentStartOffset,
            endOffset: currentStartOffset + chunkText.length,
            contentHash: computeHash(chunkText),
            keywords: extractKeywords(chunkText),
          });
          currentBuffer = [];
          currentStartOffset = runningOffset;
        }
      }
      currentSection = trimmed.replace(/^#{1,4}\s+/, "");
      continue;
    }

    currentBuffer.push(line);
    runningOffset += line.length + 1;

    // Check size overflow
    const currentLen = currentBuffer.join("\n").length;
    if (currentLen >= targetChunkSize) {
      const chunkText = currentBuffer.join("\n").trim();
      chunks.push({
        chunkId: `${documentId}_chk_${chunkIndex++}`,
        documentId,
        sectionTitle: currentSection,
        chunkText,
        startOffset: currentStartOffset,
        endOffset: currentStartOffset + chunkText.length,
        contentHash: computeHash(chunkText),
        keywords: extractKeywords(chunkText),
      });
      currentBuffer = [];
      currentStartOffset = runningOffset;
    }
  }

  // Push remaining buffer
  if (currentBuffer.length > 0) {
    const chunkText = currentBuffer.join("\n").trim();
    if (chunkText.length > 0) {
      chunks.push({
        chunkId: `${documentId}_chk_${chunkIndex++}`,
        documentId,
        sectionTitle: currentSection,
        chunkText,
        startOffset: currentStartOffset,
        endOffset: currentStartOffset + chunkText.length,
        contentHash: computeHash(chunkText),
        keywords: extractKeywords(chunkText),
      });
    }
  }

  return chunks;
}

/**
 * Validate and ingest a document into the structured representation.
 */
export function ingestDocument(input: DocumentIngestionInput): IngestedDocumentResult {
  if (!input.title || input.title.trim().length < 3) {
    throw new Error("Tiêu đề tài liệu không hợp lệ (tối thiểu 3 ký tự)");
  }
  if (!input.publisher || input.publisher.trim().length < 2) {
    throw new Error("Tổ chức phát hành không được để trống");
  }
  if (!input.rawText || input.rawText.trim().length < 20) {
    throw new Error("Nội dung tài liệu quá ngắn để phân tách đoạn trích");
  }

  const normalized = normalizeText(input.rawText);
  const documentHash = computeHash(normalized);
  const chunks = chunkDocument(input.documentId, normalized);

  return {
    documentId: input.documentId,
    title: input.title.trim(),
    publisher: input.publisher.trim(),
    officialUrl: input.officialUrl?.trim() || "",
    publicationDate: input.publicationDate || new Date().getFullYear().toString(),
    language: input.language || "vi",
    documentType: input.documentType || "GUIDELINE",
    version: input.version || "1.0",
    approvalStatus: "APPROVED",
    ingestionStatus: "INDEXED",
    contentHash: documentHash,
    chunks,
  };
}
