export type UserIntent =
  | "GENERAL_SAFETY"
  | "EXPLANATION_REQUEST"
  | "RECOMMENDATION_REQUEST"
  | "EVIDENCE_REQUEST"
  | "FOLLOW_UP"
  | "OUT_OF_SCOPE_MEDICAL"
  | "EMERGENCY"
  | "INSUFFICIENT_INFO";

export type EvidenceStatus =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "INSUFFICIENT_EVIDENCE"
  | "CONFLICTING_EVIDENCE"
  | "OUT_OF_SCOPE"
  | "EMERGENCY";

export type ResponseMode =
  | "LOCAL_GROUNDED"
  | "LLM_GENERATED"
  | "REFUSAL_INSUFFICIENT"
  | "EMERGENCY_ESCALATION";

export type DocumentApprovalStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface SourceSpan {
  startOffset?: number;
  endOffset?: number;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  publisher: string;
  officialUrl: string;
  sectionTitle: string;
  chunkText: string;
  pageNumber?: number;
  startOffset?: number;
  endOffset?: number;
  score: number;
  citationIndex?: number;
  contentHash: string;
  publicationDate?: string;
  lastVerifiedAt?: string;
  version?: string;
  license?: string;
  approvalStatus?: DocumentApprovalStatus;
}

export interface StructuredCitation {
  citationId: string;
  citationNumber: number; // e.g. 1 for [1]
  documentId: string;
  chunkId: string;
  documentTitle: string;
  publisher: string;
  sectionTitle: string;
  pageNumber?: number;
  supportingExcerpt: string;
  officialUrl: string;
  accessLink?: string;
  publicationDate?: string;
  lastVerifiedAt?: string;
  version?: string;
  contentHash?: string;
  license?: string;
  sourceSpan?: SourceSpan;
}

export interface SourceSupportEntry {
  citationNumber: number;
  citationId: string;
  documentId: string;
  chunkId: string;
  claimText: string;
  supported: boolean;
  overlapScore: number;
  reason: string;
  sourceSpan?: SourceSpan;
}

export interface DocumentVersionAuditEntry {
  documentId: string;
  documentTitle: string;
  publisher: string;
  version: string;
  contentHash: string;
  approvalStatus: DocumentApprovalStatus;
  lastVerifiedAt?: string;
  accessLink: string;
  usedInAnswer: boolean;
}

export interface EvidenceSectionBreakdown {
  documentRecommendations: string[];
  selfReportedSituationNotes: string[];
  abstentionGuidance?: string;
}

export interface SufficiencyEvaluationResult {
  status: EvidenceStatus;
  intent: UserIntent;
  confidenceScore: number; // 0.0 - 1.0 (calculated mathematically from term coverage)
  coverageRationale: string;
  missingElements: string[];
  isEmergency: boolean;
  isOutOfScope: boolean;
}

export interface GroundedGenerationResult {
  answer: string;
  evidenceStatus: EvidenceStatus;
  responseMode: ResponseMode;
  citations: StructuredCitation[];
  retrievedChunkIds: string[];
  modelProvider: string;
  modelName: string;
  suggestedFollowUps: string[];
  warnings: string[];
  sourceSupportMap?: SourceSupportEntry[];
  documentAuditTrail?: DocumentVersionAuditEntry[];
  evidenceBreakdown?: EvidenceSectionBreakdown;
}

