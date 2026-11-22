import type { AnalyzeRoomPhotoOptions } from "../geminiVisionAdapter";
import { CATEGORY_TAXONOMY } from "../taxonomy";
import type { DetectionCategory, VisionDetection } from "../types";
import { unknownRisks, VisionProviderError, type VisionProvider, type VisionProviderResult } from "./contracts";
import { candidateObservations, normalizeBoundingBox, prepareProviderImage, validateDetections } from "./normalization";

function endpoint(base: string): string {
  try {
    const url = new URL(base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash ||
        (url.pathname !== "/" && url.pathname !== "")) throw Error();
    return `${url.origin}/detect`;
  } catch { throw new VisionProviderError("INVALID_CONFIG", "LOCAL_DETECTOR_URL phải là HTTP(S) origin, không chứa đường dẫn hay thông tin đăng nhập."); }
}

/** Talks only to the explicitly selected Stage 5 service; never downloads weights. */
export class LocalDetectorProvider implements VisionProvider {
  readonly name = "local" as const;
  private readonly url: string;
  constructor(baseUrl = process.env.LOCAL_DETECTOR_URL || "http://127.0.0.1:8766", private readonly transport: typeof fetch = fetch) {
    this.url = endpoint(baseUrl);
  }

  async analyze(image: Buffer, _mimeType?: string, options: AnalyzeRoomPhotoOptions = {}): Promise<VisionProviderResult> {
    const prepared = prepareProviderImage(image);
    try {
      const response = await this.transport(this.url, { method: "POST", headers: { "Content-Type": prepared.mimeType },
        body: new Uint8Array(prepared.image), signal: AbortSignal.timeout(20000), redirect: "error" });
      if (!response.ok) throw new VisionProviderError("PROVIDER_UNAVAILABLE", "Detector local chưa sẵn sàng. Kiểm tra model ONNX và dịch vụ FastAPI.");
      const data = await response.json();
      const categories = Object.keys(CATEGORY_TAXONOMY);
      const knownList = (list: unknown): list is DetectionCategory[] => Array.isArray(list) &&
        list.every(c => typeof c === "string" && categories.includes(c)) && new Set(list).size === list.length;
      if (data.contract_version !== 1 || data.source !== "LOCAL_FINE_TUNED_DETECTOR" || data.risk_supported !== false ||
          !/^[a-f0-9]{64}$/.test(data.model_sha256) || !knownList(data.trained_classes) || !data.trained_classes.length ||
          !knownList(data.untrained_classes) ||
          categories.some(c => Number(data.trained_classes.includes(c)) + Number(data.untrained_classes.includes(c)) !== 1) ||
          !Array.isArray(data.objects) || data.objects.length > 1000) {
        throw new VisionProviderError("INVALID_RESPONSE", "Hợp đồng detector local hoặc phạm vi lớp không hợp lệ.");
      }
      const now = new Date().toISOString();
      const imageId = options.imageId || crypto.randomUUID();
      const analysisId = options.analysisId || crypto.randomUUID();
      const detections: VisionDetection[] = data.objects.map((obj: any) => {
        if (!obj || !data.trained_classes.includes(obj.category)) {
          throw new VisionProviderError("INVALID_RESPONSE", "Detector trả lớp chưa được huấn luyện.");
        }
        return { id: crypto.randomUUID(), analysisId, imageId, category: obj.category,
          originalLabel: CATEGORY_TAXONOMY[obj.category as DetectionCategory].vietnameseName,
          confidence: obj.confidence, bbox: normalizeBoundingBox(obj.bbox), source: "OBJECT_DETECTOR",
          verificationStatus: "PENDING_REVIEW", createdAt: now, updatedAt: now };
      });
      return { detections: validateDetections(detections), observations: candidateObservations(detections),
        modelUsed: `local-rtdetr-${data.model_sha256}`, modelSha256: data.model_sha256,
        provider: this.name, untrainedClasses: data.untrained_classes, risks: unknownRisks(), risk_supported: false };
    } catch (error) {
      if (error instanceof VisionProviderError) throw error;
      throw new VisionProviderError("PROVIDER_UNAVAILABLE", "Không kết nối được detector local hoặc phản hồi không đọc được.");
    }
  }
}
