import type { VisionDetection, VisionObservation } from "./types";
import type { AssessmentSnapshot } from "@/lib/risk/types";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";

/**
 * Computes deterministic clinical fall-risk assessment snapshot tailored directly to the detections in a photo
 */
export function computeImageRiskAssessment(
  roomType: "BEDROOM" | "BATHROOM",
  dets: VisionDetection[],
  obs: VisionObservation[],
  customCaption?: string
): AssessmentSnapshot {
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

  const rawInput = {
    roomId: `vision-eval-${Date.now()}`,
    roomName: displayRoomName,
    roomType,
    dimensions: { lengthM: 4.5, widthM: 4.0, heightM: 2.8 },
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
  };

  return evaluateRoomHazards(rawInput);
}

