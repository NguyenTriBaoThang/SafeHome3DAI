import type { AnalyzeRoomPhotoOptions } from "../geminiVisionAdapter";
import type { DetectionCategory, VisionDetection, VisionObservation } from "../types";
import { CATEGORY_TAXONOMY } from "../taxonomy";
import { candidateObservations, prepareProviderImage } from "./normalization";
import { unknownRisks, VisionProviderError, type VisionProvider, type VisionProviderResult } from "./contracts";
import { generateStructuredRoom, STRUCTURED_CONFIG, validateStructuredResponse, type StructuredGenerator, type ServingRoom } from "./structuredGemini";
import { getServerOnlySecret } from "@/lib/security/secretGuard";
import {
  executeWithResilience,
  ExternalServiceCircuitOpenError,
  ExternalServiceTimeoutError,
} from "@/lib/security/resilience";
import { inspectAndSanitizeUntrustedText } from "@/lib/security/promptInjectionGuard";

export class GeminiProvider implements VisionProvider {
  readonly name = "gemini" as const;
  constructor(private readonly generate: StructuredGenerator = generateStructuredRoom) {}

  async analyze(image: Buffer, _mimeType?: string, options: AnalyzeRoomPhotoOptions = {}): Promise<VisionProviderResult> {
    const prepared = prepareProviderImage(image);
    const apiKey = getServerOnlySecret("GEMINI_API_KEY");
    if (!apiKey) throw new VisionProviderError("PROVIDER_UNAVAILABLE", "Chưa cấu hình GEMINI_API_KEY.");
    const timeoutMs = Number(process.env.VISION_TIMEOUT_MS || 60000);
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
      throw new VisionProviderError("INVALID_CONFIG", "VISION_TIMEOUT_MS phải là số nguyên từ 1000 đến 120000.");
    }
    const room: ServingRoom = options.roomType === "BATHROOM" ? "bathroom" : options.roomType === "LIVING_ROOM" ? "living_room" : "bedroom";
    const model = process.env.GEMINI_MODEL || STRUCTURED_CONFIG.model_at_reference;
    const started = performance.now();
    try {
      const response = await executeWithResilience(
        "gemini-vision",
        async () => this.generate({ image: prepared.image, mimeType: prepared.mimeType, room, model, timeoutMs }),
        { timeoutMs, maxRetries: 1, failureThreshold: 3, cooldownMs: 30000 }
      );
      const parsed = validateStructuredResponse(response.payload, room);
      const imageId = options.imageId || crypto.randomUUID(), analysisId = options.analysisId || crypto.randomUUID();
      const now = new Date().toISOString();
      const detections: VisionDetection[] = parsed.objects.filter(o => o.confidence >= STRUCTURED_CONFIG.object_threshold).map(o => ({
        id: crypto.randomUUID(), imageId, analysisId, category: o.category as DetectionCategory,
        originalLabel: CATEGORY_TAXONOMY[o.category as DetectionCategory].vietnameseName,
        sceneModelType: o.category, bbox: o.bbox, confidence: o.confidence, source: "VISION_LANGUAGE_MODEL",
        verificationStatus: "PENDING_REVIEW", createdAt: now, updatedAt: now,
      }));
      const riskObservations: VisionObservation[] = Object.entries(parsed.risks).filter(([, risk]) => risk.present === true).map(([id, risk]) => {
        const sanitizedEvidence = inspectAndSanitizeUntrustedText(risk.evidence, 300).sanitizedText;
        return {
          id: crypto.randomUUID(), analysisId, observationType: id === "RISK-001" ? "RUG_OBSERVED" : id === "RISK-002" ? "CABLE_OBSERVED" : "GRAB_BAR_UNCERTAIN",
          description: `Đề xuất AI ${id}, cần người xác nhận: ${sanitizedEvidence}`, relatedDetectionIds: [],
          uncertaintyType: "CONDITION_UNCERTAINTY", requiresConfirmation: true, verificationStatus: "PENDING_REVIEW",
          evidenceJson: { riskId: id, candidate: { ...risk, evidence: sanitizedEvidence }, clinicalConfirmation: "unknown" },
        };
      });
      return { detections, observations: [...candidateObservations(detections), ...riskObservations],
        detectedRoomType: options.roomType, modelUsed: model, provider: this.name,
        risks: unknownRisks(), riskCandidates: parsed.risks, risk_supported: false, untrainedClasses: [],
        providerMetadata: { recipeId: STRUCTURED_CONFIG.recipe_id, recipeSha256: STRUCTURED_CONFIG.content_sha256,
          referenceConfigId: STRUCTURED_CONFIG.reference_config_id, modelVersion: response.modelVersion,
          latencyMs: Math.round(performance.now() - started), objectThreshold: STRUCTURED_CONFIG.object_threshold } };
    } catch (error) {
      if (error instanceof VisionProviderError) throw error;
      if (error instanceof ExternalServiceCircuitOpenError || error instanceof ExternalServiceTimeoutError) {
        throw new VisionProviderError("PROVIDER_UNAVAILABLE", error.message);
      }
      throw new VisionProviderError("PROVIDER_UNAVAILABLE", "Gemini không hoàn tất phân tích. Có thể thử lại hoặc duyệt thủ công.");
    }
  }
}
