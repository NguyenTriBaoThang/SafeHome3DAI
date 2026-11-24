import type { RoomState, RoomType, SceneObjectState, AssessmentResult } from "@/types";
import type { VisionDetection } from "./types";
import { CATEGORY_TAXONOMY } from "./taxonomy";

/** Coordinates and dimensions below are rendering placeholders, never measurements. */
export function buildVerifiedPhotoDraft(detections: VisionDetection[], roomType: RoomType, caption: string): RoomState {
  const verified = detections.filter(d => ["CONFIRMED", "CORRECTED"].includes(d.verificationStatus));
  if (!verified.length) throw new Error("Hãy xác nhận ít nhất một vật thể trước khi dựng 3D.");
  const id = `photo-draft-${crypto.randomUUID()}`;
  const objects: SceneObjectState[] = verified.map(d => ({
    id: `draft-${d.id}`, roomId: id, name: d.userLabel || CATEGORY_TAXONOMY[d.category]?.vietnameseName || d.originalLabel,
    category: d.category === "rug" ? "RUG" : d.category === "electrical_cable" ? "CABLE" : d.category === "grab_bar" ? "SAFETY_DEVICE" : "FURNITURE",
    modelType: d.category, position: [((d.bbox.xMin + d.bbox.xMax) / 2 - .5) * 3.8, .1, ((d.bbox.yMin + d.bbox.yMax) / 2 - .5) * 3.4],
    rotation: [0, 0, 0], scale: [1, 1, 1], dimensions: { width: 1, length: 1, height: .8 }, verified: true,
    customProperties: { sourceDetectionId: d.id, geometryEstimated: true },
  }));
  return { id, name: `Bản dựng ước lượng: ${caption || "Ảnh hiện trường"}`, roomType, evidenceStatus: "PHOTO_DRAFT",
    dimensions: { width: 4.5, length: 4, height: 2.8 }, floorMaterial: "WOOD", lightingLevel: 200,
    isWet: false, isSlipResistant: false, grabBarsCount: 0, walkingZones: [], objects };
}

export function unverifiedPhotoAssessment(room: RoomState): AssessmentResult {
  return { id: `unverified-${room.id}`, roomId: room.id, timestamp: new Date().toISOString(),
    totalHazards: 0, resolvedHazards: 0, remainingHazards: 0, newHazards: 0, safetyScore: null,
    findings: [], assessmentStatus: "NEEDS_VERIFICATION", notes: "Bản dựng ảnh chỉ ước lượng hình học; chưa đo và xác minh thực trạng." };
}
