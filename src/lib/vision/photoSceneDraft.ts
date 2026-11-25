import type { RoomState, RoomType, AssessmentResult } from "@/types";
import type { VisionDetection, ViewpointType } from "./types";
import { reconstructSceneFromDetections, type ReconstructionConfig } from "@/lib/reconstruction/spatialReconstructor";
import { convertSceneGraphToRoomState } from "@/lib/reconstruction/sceneToRoomAdapter";

export interface PhotoDraftOptions {
  viewpoint?: ViewpointType;
  imageAspect?: number;
  floorMaterial?: RoomState["floorMaterial"];
  manualDimensions?: { width?: number; length?: number; height?: number };
  /** Source per axis of `manualDimensions`: pass "simulated" for values the user never typed. */
  dimensionSources?: ReconstructionConfig["dimensionSources"];
}

/** Coordinates and dimensions below are AI-estimated from photo geometry, never laser measurements. */
export function buildVerifiedPhotoDraft(
  detections: VisionDetection[],
  roomType: RoomType,
  caption: string,
  sourceImageUrls?: string[],
  options?: PhotoDraftOptions
): RoomState {
  const verified = detections.filter(d => ["CONFIRMED", "CORRECTED"].includes(d.verificationStatus));
  if (!verified.length) throw new Error("Hãy xác nhận ít nhất một vật thể trước khi dựng 3D.");
  const id = `photo-draft-${crypto.randomUUID()}`;
  const reconstructRoomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM" =
    roomType === "BATHROOM" || roomType === "LIVING_ROOM" ? roomType : "BEDROOM";

  const sceneGraph = reconstructSceneFromDetections(verified, {
    roomType: reconstructRoomType,
    viewpoint: options?.viewpoint ?? "ENTRANCE",
    imageAspect: options?.imageAspect ?? 4 / 3,
    floorMaterial: options?.floorMaterial,
    manualDimensions: options?.manualDimensions,
    dimensionSources: options?.dimensionSources,
    sourceImageUrls,
  });
  const reconstructed = convertSceneGraphToRoomState(sceneGraph);

  // Strip unverified environmental hazard booleans so PHOTO_DRAFT remains neutral until verified.
  const draftObjects = reconstructed.objects.map((obj) => {
    const {
      isLoose: _isLoose,
      isFixed: _isFixed,
      isSlippery: _isSlippery,
      isWalkwayObstacle: _isWalkwayObstacle,
      ...safeFields
    } = obj;
    return {
      ...safeFields,
      roomId: id,
      verified: true,
      customProperties: {
        ...safeFields.customProperties,
        geometryEstimated: true,
      },
    };
  });

  return {
    ...reconstructed,
    id,
    name: `Bản dựng ước lượng: ${caption || "Ảnh hiện trường"}`,
    roomType,
    evidenceStatus: "PHOTO_DRAFT",
    ...(sourceImageUrls?.length ? { sourceImageUrls } : {}),
    walkingZones: [],
    objects: draftObjects,
  };
}

export function unverifiedPhotoAssessment(room: RoomState): AssessmentResult {
  return { id: `unverified-${room.id}`, roomId: room.id, timestamp: new Date().toISOString(),
    totalHazards: 0, resolvedHazards: 0, remainingHazards: 0, newHazards: 0, safetyScore: null,
    findings: [], assessmentStatus: "NEEDS_VERIFICATION", notes: "Bản dựng ảnh chỉ ước lượng hình học; chưa đo và xác minh thực trạng." };
}
