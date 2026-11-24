import type { VisionDetection, VisionObservation } from "./types";
import type { AssessmentSnapshot } from "@/lib/risk/types";
import {
  evaluateRoomHazardsCanonical,
  adaptCanonicalToLegacySnapshot,
  CanonicalAssessmentResult,
  CanonicalEngineOptions,
} from "@/lib/risk/canonicalEngine";

/**
 * Builds normalized raw assessment input from 2D vision detections and observations.
 * Tags the source explicitly as "AI_VISION" so findings are marked as "PROVISIONAL"
 * and require manual confirmation.
 */
function buildVisionAssessmentRawInput(
  roomType: "BEDROOM" | "BATHROOM",
  dets: VisionDetection[],
  obs: VisionObservation[],
  customCaption?: string
) {
  const hasRug = dets.some((d) => d.category === "rug");
  const hasUnsecuredRug = dets.some(
    (d) =>
      d.category === "rug" &&
      (d.userLabel?.toLowerCase().includes("trượt") ||
        d.originalLabel?.toLowerCase().includes("trượt") ||
        (d as any).isFallHazard)
  );
  const hasCable = dets.some(
    (d) =>
      d.category === "electrical_cable" ||
      d.originalLabel?.toLowerCase().includes("dây") ||
      d.userLabel?.toLowerCase().includes("dây") ||
      (d as any).isFallHazard
  );
  const hasGrabBar = dets.some((d) => d.category === "grab_bar");
  const hasWetFloor =
    obs.some((o) => o.observationType === "WET_SURFACE_UNCERTAIN") ||
    roomType === "BATHROOM";
  const hasTable = dets.some((d) => d.category === "table");
  const hasObstacle =
    dets.some(
      (d) =>
        d.category === "obstacle_route" ||
        d.category === "chair" ||
        (d.placementWall === "free" && d.category !== "bed" && d.category !== "sofa")
    ) || hasTable;

  const displayRoomName = customCaption
    ? `Khu vực: ${customCaption}`
    : roomType === "BATHROOM"
    ? "Phòng tắm & Nhà vệ sinh (Ảnh hiện trường)"
    : "Phòng sinh hoạt (Ảnh hiện trường)";

  // Deterministic stable ID based on detection IDs
  const detectionDigest = dets.map((d) => d.id).sort().join("_") || "empty";
  const roomId = `vision_room_${roomType.toLowerCase()}_${detectionDigest.slice(0, 16)}`;

  return {
    roomId,
    roomName: displayRoomName,
    roomType,
    sourceType: "AI_VISION", // Explicit data lineage
    dimensions: { lengthM: 4.5, widthM: 4.0, heightM: 2.8, source: "USER_ESTIMATED" },
    floor: {
      material: roomType === "BATHROOM" ? "Gạch men" : "Sàn gỗ",
      isWet: hasWetFloor,
      isSlipResistant: !hasWetFloor,
      thresholdStepPresent: false,
    },
    lighting: {
      daytimeLux: 200,
      nighttimeLux: 40,
      nightLightPresent: false,
      adequateAtNight: false,
      motionSensorPresent: false,
      pathLightToBathroom: false,
      switchReachableFromEntrance: true,
      switchReachableFromBed: false,
    },
    rugs: {
      present: hasRug,
      secured: !hasUnsecuredRug,
      items: hasRug
        ? [
            {
              id: "rug-eval-1",
              name: "Thảm trải sàn",
              location: "Gần vị trí sinh hoạt",
              isSecured: !hasUnsecuredRug,
              edgesCurled: hasUnsecuredRug,
              inWalkway: true,
            },
          ]
        : [],
    },
    cables: {
      crossingWalkway: hasCable,
      items: hasCable
        ? [
            {
              id: "cable-eval-1",
              name: "Dây điện / dây sạc thiết bị",
              location: "Vắt ngang lối đi",
              crossesWalkway: true,
              hasCordCover: false,
              hasSkirtingTrunking: false,
            },
          ]
        : [],
    },
    obstacles: {
      present: hasObstacle,
      walkwayClearWidthM: hasObstacle ? 0.72 : 1.1,
      items: hasObstacle
        ? [
            {
              id: "obstacle-eval-1",
              name: hasTable ? "Bàn sinh hoạt / Bàn làm việc" : "Vật cản lối đi",
              location: "Lối đi chính",
              obstructsWalkway: true,
              clearanceWidthM: 0.72,
            },
          ]
        : [],
    },
    grabBars: {
      present: hasGrabBar,
      count: hasGrabBar ? 1 : 0,
      toiletPresent: hasGrabBar,
      showerPresent: hasGrabBar,
      toiletGrabBarPresent: hasGrabBar,
      showerGrabBarPresent: hasGrabBar,
      inspectedSecure: hasGrabBar,
    },
    accessibility: {
      lightSwitchReachableFromBed: false,
      essentialItemsReachableFromBed: false,
      emergencyCallReachable: false,
    },
  };
}

/**
 * Canonical Vision Assessment (AssessmentResultV1).
 * Executes the single source of truth risk engine.
 */
export function computeImageRiskAssessmentCanonical(
  roomType: "BEDROOM" | "BATHROOM",
  dets: VisionDetection[],
  obs: VisionObservation[],
  customCaption?: string,
  options?: CanonicalEngineOptions
): CanonicalAssessmentResult {
  const rawInput = buildVisionAssessmentRawInput(roomType, dets, obs, customCaption);
  return evaluateRoomHazardsCanonical(rawInput, options);
}

/**
 * Backward-compatible adapter for existing UI components expecting AssessmentSnapshot.
 */
export function computeImageRiskAssessment(
  roomType: "BEDROOM" | "BATHROOM",
  dets: VisionDetection[],
  obs: VisionObservation[],
  customCaption?: string
): AssessmentSnapshot {
  const canonical = computeImageRiskAssessmentCanonical(roomType, dets, obs, customCaption);
  return adaptCanonicalToLegacySnapshot(canonical, {
    roomType,
    roomName: customCaption ? `Khu vực: ${customCaption}` : "Ảnh hiện trường",
  });
}
