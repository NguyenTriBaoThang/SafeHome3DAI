/**
 * ==============================================================================
 * TASK A08: KNOWLEDGE SOURCE REGISTRY, APPROVAL WORKFLOW & VERSIONING AUDIT
 * ==============================================================================
 * Enforces:
 * - Approved-source gate (only APPROVED, non-outdated docs enter active RAG)
 * - Strict officialUrl validation (reject empty/fake/placeholder URLs)
 * - SHA-256 versioning & audit trail of documents evaluated per answer
 * ==============================================================================
 */
import { CURATED_KNOWLEDGE_SOURCES, EnrichedKnowledgeSource } from "@/data/curatedKnowledge";
import { DocumentApprovalStatus, DocumentVersionAuditEntry, RetrievedChunk } from "./types";

export const DEFAULT_DOCUMENT_MAX_AGE_DAYS = 365;

const BLOCKED_FAKE_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "www.example.org",
  "example.net",
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "fake.invalid",
  "invalid",
  "placeholder.local",
  "safehome3d.ai",
]);

const FAKE_HOST_SUBSTRINGS = ["fake", "placeholder", "dummy", "mock", "not-a-real", "example."];

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl: string;
  reason?: string;
}

/**
 * Validates that a knowledge source or citation URL is a genuine, non-empty HTTP(S) link
 * and not a fabricated/placeholder/script URL.
 */
export function validateOfficialSourceUrl(
  rawUrl: string | null | undefined,
  options: { requireHttps?: boolean } = {}
): UrlValidationResult {
  const { requireHttps = false } = options;
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, normalizedUrl: "", reason: "URL tài liệu bị thiếu hoặc rỗng." };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === "#" || trimmed.toLowerCase().startsWith("javascript:")) {
    return { valid: false, normalizedUrl: "", reason: "URL tài liệu không hợp lệ." };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, normalizedUrl: "", reason: `URL không đúng định dạng: ${trimmed}` };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (requireHttps ? protocol !== "https:" : protocol !== "https:" && protocol !== "http:") {
    return {
      valid: false,
      normalizedUrl: "",
      reason: `Giao thức URL không được chấp nhận (${protocol}).`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || !hostname.includes(".")) {
    return { valid: false, normalizedUrl: "", reason: `Tên miền nguồn tài liệu không hợp lệ: ${hostname}` };
  }

  if (
    BLOCKED_FAKE_HOSTS.has(hostname) ||
    FAKE_HOST_SUBSTRINGS.some((token) => hostname.includes(token))
  ) {
    return {
      valid: false,
      normalizedUrl: "",
      reason: `Từ chối URL giả lập hoặc không chính thức (${hostname}).`,
    };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

export interface RegistryDocument extends EnrichedKnowledgeSource {
  approvalStatus: DocumentApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  removedAt?: string;
  lifecycleStatus?: "ACTIVE" | "OUTDATED" | "REMOVED";
}

function cloneSource(source: EnrichedKnowledgeSource): RegistryDocument {
  return {
    ...source,
    approvalStatus: source.approvalStatus,
    lifecycleStatus: "ACTIVE",
    passages: source.passages.map((p) => ({
      ...p,
      keywords: [...p.keywords],
      relatedRules: [...p.relatedRules],
    })),
  };
}

let runtimeRegistry: RegistryDocument[] = CURATED_KNOWLEDGE_SOURCES.map(cloneSource);

/**
 * Resets runtime registry back to static curated baseline (primarily for tests).
 */
export function resetDocumentRegistry(): void {
  runtimeRegistry = CURATED_KNOWLEDGE_SOURCES.map(cloneSource);
}

/**
 * Checks whether an approved document has exceeded its verification freshness window
 * or passed explicit `validUntil` / outdated lifecycle flag.
 */
export function isDocumentOutdated(
  source: Pick<RegistryDocument, "lastVerifiedAt" | "validUntil" | "lifecycleStatus">,
  options: { maxAgeDays?: number; now?: Date } = {}
): boolean {
  if (source.lifecycleStatus === "OUTDATED") return true;

  const nowMs = (options.now ?? new Date()).getTime();
  if (source.validUntil) {
    const validUntilMs = Date.parse(source.validUntil);
    if (!Number.isNaN(validUntilMs) && nowMs > validUntilMs) {
      return true;
    }
  }

  const maxAgeDays = options.maxAgeDays ?? DEFAULT_DOCUMENT_MAX_AGE_DAYS;
  if (maxAgeDays <= 0) return false;

  const verifiedMs = Date.parse(source.lastVerifiedAt || "");
  if (Number.isNaN(verifiedMs)) {
    return true;
  }

  const ageDays = (nowMs - verifiedMs) / (1000 * 60 * 60 * 24);
  return ageDays > maxAgeDays;
}

/**
 * Registers a newly ingested or submitted document as PENDING review by default.
 * Rejects empty or fake URLs immediately.
 */
export function registerDocumentForReview(
  doc: Omit<RegistryDocument, "approvalStatus" | "lifecycleStatus"> & {
    approvalStatus?: DocumentApprovalStatus;
  }
): RegistryDocument {
  const urlCheck = validateOfficialSourceUrl(doc.officialUrl || doc.url, { requireHttps: true });
  if (!urlCheck.valid) {
    throw new Error(urlCheck.reason || "URL nguồn tài liệu không hợp lệ.");
  }

  if (!doc.license || !doc.license.trim()) {
    throw new Error("Tài liệu bắt buộc phải khai báo thông tin bản quyền/giấy phép (license).");
  }

  // Newly submitted documents must enter PENDING review unless explicitly approved via approveDocument()
  const entry: RegistryDocument = {
    ...doc,
    url: urlCheck.normalizedUrl,
    officialUrl: urlCheck.normalizedUrl,
    approvalStatus: "PENDING",
    lifecycleStatus: "ACTIVE",
    passages: doc.passages.map((p) => ({
      ...p,
      keywords: [...p.keywords],
      relatedRules: [...p.relatedRules],
    })),
  };

  const existingIndex = runtimeRegistry.findIndex((item) => item.id === entry.id);
  if (existingIndex >= 0) {
    runtimeRegistry[existingIndex] = entry;
  } else {
    runtimeRegistry.push(entry);
  }
  return entry;
}

/**
 * Approves a document in the registry so it becomes eligible for RAG retrieval.
 */
export function approveDocument(
  documentId: string,
  reviewer = "editorial-reviewer",
  verifiedAt = new Date().toISOString()
): RegistryDocument {
  const doc = runtimeRegistry.find((item) => item.id === documentId);
  if (!doc) {
    throw new Error(`Không tìm thấy tài liệu trong registry: ${documentId}`);
  }
  const urlCheck = validateOfficialSourceUrl(doc.officialUrl || doc.url, { requireHttps: true });
  if (!urlCheck.valid) {
    throw new Error(`Không thể phê duyệt tài liệu có URL không hợp lệ: ${urlCheck.reason}`);
  }
  doc.approvalStatus = "APPROVED";
  doc.lifecycleStatus = "ACTIVE";
  doc.reviewedBy = reviewer;
  doc.reviewedAt = verifiedAt;
  doc.lastVerifiedAt = verifiedAt;
  doc.rejectionReason = undefined;
  doc.removedAt = undefined;
  return doc;
}

/**
 * Rejects a document so it cannot enter retrieval responses.
 */
export function rejectDocument(
  documentId: string,
  reason: string,
  reviewer = "editorial-reviewer"
): RegistryDocument {
  const doc = runtimeRegistry.find((item) => item.id === documentId);
  if (!doc) {
    throw new Error(`Không tìm thấy tài liệu trong registry: ${documentId}`);
  }
  doc.approvalStatus = "REJECTED";
  doc.rejectionReason = reason;
  doc.reviewedBy = reviewer;
  doc.reviewedAt = new Date().toISOString();
  return doc;
}

/**
 * Removes (or marks removed) a document so retrieval immediately drops it.
 */
export function removeDocument(documentId: string): boolean {
  const idx = runtimeRegistry.findIndex((item) => item.id === documentId);
  if (idx < 0) return false;
  runtimeRegistry.splice(idx, 1);
  return true;
}

/**
 * Marks a document as outdated (e.g. superseded edition or expired verification).
 */
export function markDocumentOutdated(documentId: string, lastVerifiedAt = "2023-01-01T00:00:00.000Z"): void {
  const doc = runtimeRegistry.find((item) => item.id === documentId);
  if (!doc) {
    throw new Error(`Không tìm thấy tài liệu trong registry: ${documentId}`);
  }
  doc.lifecycleStatus = "OUTDATED";
  doc.lastVerifiedAt = lastVerifiedAt;
}

export interface RetrievalFilterResult {
  activeSources: RegistryDocument[];
  excludedDocuments: Array<{
    documentId: string;
    version: string;
    reason: "NOT_APPROVED" | "OUTDATED" | "INVALID_URL";
    approvalStatus: DocumentApprovalStatus;
  }>;
}

/**
 * Returns registry entries filtered by approval status, valid official URL, and freshness.
 */
export function getActiveRegistrySources(
  options: { approvalOnly?: boolean; maxAgeDays?: number; now?: Date; excludeOutdated?: boolean } = {}
): RetrievalFilterResult {
  const {
    approvalOnly = true,
    maxAgeDays = DEFAULT_DOCUMENT_MAX_AGE_DAYS,
    now,
    excludeOutdated = true,
  } = options;

  const activeSources: RegistryDocument[] = [];
  const excludedDocuments: RetrievalFilterResult["excludedDocuments"] = [];

  for (const doc of runtimeRegistry) {
    if (approvalOnly && doc.approvalStatus !== "APPROVED") {
      excludedDocuments.push({
        documentId: doc.id,
        version: doc.version,
        reason: "NOT_APPROVED",
        approvalStatus: doc.approvalStatus,
      });
      continue;
    }

    const urlCheck = validateOfficialSourceUrl(doc.officialUrl || doc.url);
    if (!urlCheck.valid) {
      excludedDocuments.push({
        documentId: doc.id,
        version: doc.version,
        reason: "INVALID_URL",
        approvalStatus: doc.approvalStatus,
      });
      continue;
    }

    if (excludeOutdated && isDocumentOutdated(doc, { maxAgeDays, now })) {
      excludedDocuments.push({
        documentId: doc.id,
        version: doc.version,
        reason: "OUTDATED",
        approvalStatus: doc.approvalStatus,
      });
      continue;
    }

    activeSources.push(doc);
  }

  return { activeSources, excludedDocuments };
}

/**
 * Returns a snapshot list of all documents currently in the registry with calculated freshness metadata.
 */
export function listDocumentRegistryEntries(options: { maxAgeDays?: number; now?: Date } = {}) {
  return runtimeRegistry.map((doc) => ({
    ...doc,
    isOutdated: isDocumentOutdated(doc, options),
    urlValid: validateOfficialSourceUrl(doc.officialUrl || doc.url).valid,
  }));
}

/**
 * Builds an immutable audit trail entry list logging document IDs and versions evaluated per response.
 */
export function buildDocumentVersionAuditTrail(
  retrievedChunks: RetrievedChunk[],
  usedChunkIds: string[] = []
): DocumentVersionAuditEntry[] {
  const usedSet = new Set(usedChunkIds);
  const byDoc = new Map<string, DocumentVersionAuditEntry>();

  for (const chunk of retrievedChunks) {
    const existing = byDoc.get(chunk.documentId);
    const registryMatch = runtimeRegistry.find((d) => d.id === chunk.documentId);
    const usedInAnswer = usedSet.has(chunk.chunkId);
    if (existing) {
      existing.usedInAnswer = existing.usedInAnswer || usedInAnswer;
      continue;
    }

    byDoc.set(chunk.documentId, {
      documentId: chunk.documentId,
      documentTitle: chunk.documentTitle,
      publisher: chunk.publisher,
      version: chunk.version || registryMatch?.version || "1.0",
      contentHash: registryMatch?.contentHash || chunk.contentHash,
      approvalStatus: chunk.approvalStatus || registryMatch?.approvalStatus || "APPROVED",
      lastVerifiedAt: chunk.lastVerifiedAt || registryMatch?.lastVerifiedAt,
      accessLink: chunk.officialUrl,
      usedInAnswer,
    });
  }

  return Array.from(byDoc.values());
}

