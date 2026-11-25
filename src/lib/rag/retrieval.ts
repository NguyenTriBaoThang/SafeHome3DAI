import { getActiveRegistrySources, validateOfficialSourceUrl } from "./documentRegistry";
import { RetrievedChunk } from "./types";

export interface RetrievalOptions {
  topK?: number;
  minScoreThreshold?: number;
  approvalOnly?: boolean;
  maxAgeDays?: number;
  now?: Date;
  excludeOutdated?: boolean;
}

export const VIETNAMESE_STOP_WORDS = new Set([
  "trong",
  "ngoài",
  "của",
  "và",
  "với",
  "các",
  "những",
  "cái",
  "tôi",
  "bạn",
  "ông",
  "bà",
  "là",
  "có",
  "được",
  "để",
  "thế",
  "nào",
  "gì",
  "sao",
  "như",
  "cần",
  "nên",
  "cho",
  "thì",
  "này",
  "đó",
  "ở",
  "tại",
  "một",
  "hai",
  "khoảng",
  "khoảng chừng",
]);

/**
 * Tokenize Vietnamese and English queries into search terms, filtering common stop words.
 */
export function tokenizeQuery(query: string, filterStopWords = true): string[] {
  const words = query
    .toLowerCase()
    .normalize("NFC")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>\[\]\\|]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (!filterStopWords) return words;
  const filtered = words.filter((w) => !VIETNAMESE_STOP_WORDS.has(w));
  return filtered.length > 0 ? filtered : words;
}

/**
 * Perform hybrid keyword/BM25-style retrieval over approved knowledge chunks.
 */
export function retrieveEvidenceChunks(
  query: string,
  options: RetrievalOptions = {}
): RetrievedChunk[] {
  const topK = options.topK ?? 4;
  const minScore = options.minScoreThreshold ?? 1.5;
  const approvalOnly = options.approvalOnly ?? true;

  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0) return [];

  const { activeSources } = getActiveRegistrySources({
    approvalOnly,
    maxAgeDays: options.maxAgeDays,
    now: options.now,
    excludeOutdated: options.excludeOutdated ?? true,
  });

  const candidateChunks: RetrievedChunk[] = [];

  for (const source of activeSources) {
    const urlCheck = validateOfficialSourceUrl(source.officialUrl || source.url);
    if (!urlCheck.valid) continue;

    for (const passage of source.passages) {
      let score = 0;
      let matchedTokensCount = 0;

      const sectionLower = passage.section.toLowerCase();
      const textLower = passage.passageText.toLowerCase();
      const keywordsLower = passage.keywords.map((k) => k.toLowerCase());

      for (const token of queryTokens) {
        let tokenMatched = false;

        // 1. Boost for Section Title match
        if (sectionLower.includes(token)) {
          score += 5.0;
          tokenMatched = true;
        }

        // 2. Boost for Curated Keywords match
        if (keywordsLower.some((kw) => kw.includes(token))) {
          score += 4.0;
          tokenMatched = true;
        }

        // 3. Body text match
        if (textLower.includes(token)) {
          const count = (textLower.match(new RegExp(token, "g")) || []).length;
          score += Math.min(count * 1.5, 4.5);
          tokenMatched = true;
        }

        if (tokenMatched) {
          matchedTokensCount++;
        }
      }

      // Bonus for multi-token coverage
      if (queryTokens.length > 1) {
        const coverageRatio = matchedTokensCount / queryTokens.length;
        score *= 0.5 + coverageRatio * 1.5;
      }

      if (score >= minScore) {
        candidateChunks.push({
          chunkId: passage.id,
          documentId: source.id,
          documentTitle: source.title,
          publisher: source.publisher || source.organization,
          officialUrl: urlCheck.normalizedUrl,
          sectionTitle: passage.section,
          chunkText: passage.passageText,
          pageNumber: passage.pageNumber,
          startOffset: passage.startOffset,
          endOffset: passage.endOffset,
          score: Math.round(score * 10) / 10,
          contentHash: passage.contentHash,
          publicationDate: source.publicationDate,
          lastVerifiedAt: source.lastVerifiedAt,
          version: source.version,
          license: source.license,
          approvalStatus: source.approvalStatus,
        });
      }
    }
  }

  // Sort descending by relevance score
  candidateChunks.sort((a, b) => b.score - a.score);

  // Take top K and assign sequential citation indices (1, 2, 3...)
  const selected = candidateChunks.slice(0, topK);
  selected.forEach((chunk, index) => {
    chunk.citationIndex = index + 1;
  });

  return selected;
}
