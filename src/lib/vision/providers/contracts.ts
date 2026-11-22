import type { AnalyzeRoomPhotoOptions, GeminiAnalysisResult } from "../geminiVisionAdapter";

export const RISK_IDS = ["RISK-001", "RISK-002", "RISK-003", "RISK-004", "RISK-005", "RISK-006", "RISK-007", "RISK-008"] as const;
export type RiskId = typeof RISK_IDS[number];
export interface PhotoRisk {
  present: true | false | "unknown";
  severity: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  evidence: string;
}

/** Compatible with existing scan-photo consumers; all machine output is unverified. */
export interface VisionProviderResult extends GeminiAnalysisResult {
  provider: "gemini" | "local";
  risks: Record<RiskId, PhotoRisk>;
  risk_supported: false;
  untrainedClasses: string[];
  modelSha256?: string;
  riskCandidates?: Record<RiskId, PhotoRisk & { visible: boolean | "unknown"; applicable: boolean }>;
  providerMetadata?: { recipeId: string; recipeSha256: string; referenceConfigId: string; modelVersion: string; latencyMs: number; objectThreshold: number };
}

export interface VisionProvider {
  readonly name: "gemini" | "local";
  analyze(image: Buffer, mimeType?: string, options?: AnalyzeRoomPhotoOptions): Promise<VisionProviderResult>;
}

export class VisionProviderError extends Error {
  constructor(public readonly code: "INVALID_IMAGE" | "INVALID_CONFIG" | "PROVIDER_UNAVAILABLE" | "INVALID_RESPONSE", message: string) {
    super(message);
    this.name = "VisionProviderError";
  }
}

export function unknownRisks(): Record<RiskId, PhotoRisk> {
  return Object.fromEntries(RISK_IDS.map(id => [id, {
    present: "unknown", severity: "UNKNOWN",
    evidence: "Cần khảo sát hoặc xác nhận hiện trường; nhận diện vật thể chưa xác định được nguy cơ.",
  }])) as Record<RiskId, PhotoRisk>;
}
