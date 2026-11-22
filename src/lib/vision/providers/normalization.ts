import type { NormalizedBoundingBox, VisionDetection, VisionObservation } from "../types";
import { CATEGORY_TAXONOMY } from "../taxonomy";
import { MAX_IMAGE_FILE_SIZE, stripExifMetadata, validateImageBuffer } from "../imagePreprocessor";
import { VisionProviderError } from "./contracts";

/** Coordinate order and scale are explicit: never guess whether pixels mean 0..1000. */
export function normalizeBoundingBox(value: unknown, format: "xyxy" | "gemini1000" = "xyxy"): NormalizedBoundingBox {
  if (format === "gemini1000" && (!Array.isArray(value) || value.length !== 4)) {
    throw new VisionProviderError("INVALID_RESPONSE", "BBox Gemini phải có đúng bốn tọa độ.");
  }
  const coordinates = format === "gemini1000" && Array.isArray(value)
    ? [value[1], value[0], value[3], value[2]].map(v => typeof v === "number" ? v / 1000 : v)
    : value && typeof value === "object" && !Array.isArray(value)
      ? ["xMin", "yMin", "xMax", "yMax"].map(key => (value as Record<string, unknown>)[key]) : [];
  if (coordinates.length !== 4 || coordinates.some(v => typeof v !== "number" || !Number.isFinite(v))) {
    throw new VisionProviderError("INVALID_RESPONSE", "Tọa độ bbox phải là bốn số hữu hạn.");
  }
  const [x1, y1, x2, y2] = coordinates as number[];
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const box = { xMin: clamp(Math.min(x1, x2)), yMin: clamp(Math.min(y1, y2)),
    xMax: clamp(Math.max(x1, x2)), yMax: clamp(Math.max(y1, y2)) };
  if (box.xMin >= box.xMax || box.yMin >= box.yMax) {
    throw new VisionProviderError("INVALID_RESPONSE", "BBox rỗng hoặc nằm ngoài ảnh.");
  }
  return box;
}

export function prepareProviderImage(image: Buffer): { image: Buffer; mimeType: string } {
  if (!Buffer.isBuffer(image) || image.length > MAX_IMAGE_FILE_SIZE) {
    throw new VisionProviderError("INVALID_IMAGE", "Ảnh phải có dung lượng tối đa 10 MB.");
  }
  const validation = validateImageBuffer(image);
  if (!validation.isValid) throw new VisionProviderError("INVALID_IMAGE", validation.errorMessage || "Ảnh không hợp lệ.");
  try { return { image: stripExifMetadata(image), mimeType: validation.mimeType }; }
  catch { throw new VisionProviderError("INVALID_IMAGE", "Cấu trúc ảnh JPEG không hợp lệ."); }
}

export function validateDetections(detections: VisionDetection[]): VisionDetection[] {
  if (!Array.isArray(detections) || detections.length > 1000) {
    throw new VisionProviderError("INVALID_RESPONSE", "Danh sách vật thể không hợp lệ.");
  }
  return detections.map(det => {
    if (!det || !Object.hasOwn(CATEGORY_TAXONOMY, det.category) || typeof det.confidence !== "number" ||
        !Number.isFinite(det.confidence) || det.confidence < 0 || det.confidence > 1) {
      throw new VisionProviderError("INVALID_RESPONSE", "Nhãn hoặc độ tin cậy vật thể không hợp lệ.");
    }
    return { ...det, bbox: normalizeBoundingBox(det.bbox), verificationStatus: "PENDING_REVIEW" };
  });
}

/** Presence is only a candidate; do not propagate speculative hazard notes or measurements. */
export function candidateObservations(detections: VisionDetection[]): VisionObservation[] {
  return detections.filter(d => ["rug", "electrical_cable", "obstacle_route"].includes(d.category)).map(d => ({
    id: `obs_${crypto.randomUUID()}`, analysisId: d.analysisId,
    observationType: d.category === "rug" ? "RUG_OBSERVED" : d.category === "electrical_cable" ? "CABLE_OBSERVED" : "OBSTACLE_CANDIDATE",
    description: `${CATEGORY_TAXONOMY[d.category].vietnameseName}: cần xác nhận sự hiện diện, vị trí và điều kiện an toàn.`,
    relatedDetectionIds: [d.id], uncertaintyType: "CONDITION_UNCERTAINTY", requiresConfirmation: true,
    verificationStatus: "PENDING_REVIEW", evidenceJson: { category: d.category, riskPresent: "unknown" },
  }));
}
