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

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  publisher: string;
  officialUrl: string;
  sectionTitle: string;
  chunkText: string;
  pageNumber?: number;
  score: number;
  citationIndex?: number;
  contentHash: string;
  publicationDate?: string;
  lastVerifiedAt?: string;
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
  publicationDate?: string;
  lastVerifiedAt?: string;
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
}

