import { SemanticSceneGraph } from "./sceneGraphTypes";
import { RoomState, SceneObjectState, WalkingZone } from "@/types";

/**
 * Converts a Semantic 3D Scene Graph into a live RoomState compatible with
 * Three.js RoomCanvas and the Deterministic Clinical Risk Engine.
 */
export function convertSceneGraphToRoomState(
  scene: SemanticSceneGraph
): RoomState {
  // 1. Map objects
  const objects: SceneObjectState[] = scene.objects.map((obj) => {
    return {
      id: obj.id,
      roomId: scene.sceneId,
      name: obj.name,
      category: (obj.category as any) || "FURNITURE",
      modelType: obj.assetId.startsWith("procedural_")
        ? obj.assetId.replace("procedural_", "")
        : obj.category.toLowerCase(),
      assetId: obj.assetId,
      glbPath: obj.glbPath,
      position: obj.position,
      rotation: obj.rotation,
      scale: obj.scale,
      dimensions: obj.dimensions,
      isFixed: obj.isFixed,
      isLoose: obj.isLoose,
      isWalkwayObstacle: obj.isWalkwayObstacle,
      isSlippery: obj.isSlippery,
      surfaceColor: obj.surfaceColor,
      verified: obj.verified,
      confidence: obj.detectionConfidence,
    };
  });

  // 2. Count grab bars for bathroom safety rules
  const grabBarsCount = objects.filter(
    (o) =>
      o.modelType === "grab_bar" ||
      o.name.toLowerCase().includes("thanh vịn") ||
      o.name.toLowerCase().includes("tay vịn")
  ).length;

  // 3. Generate default walking zones (e.g. from bed/toilet to doorway)
  const walkingZones: WalkingZone[] = [];
  const halfL = scene.dimensions.length / 2;

  if (scene.roomType === "BEDROOM") {
    walkingZones.push({
      id: `wzone-bed-exit-${scene.sceneId}`,
      name: "Lối đi từ giường ngủ ra cửa chính / WC",
      startPoint: [0.3, 0.2],
      endPoint: [0.0, halfL * 0.8],
      width: 0.9,
      importance: "CRITICAL",
    });
  } else if (scene.roomType === "BATHROOM") {
    walkingZones.push({
      id: `wzone-bath-entry-${scene.sceneId}`,
      name: "Lối di chuyển cửa vào bồn cầu & buồng tắm",
      startPoint: [0.0, halfL * 0.7],
      endPoint: [0.0, -halfL * 0.5],
      width: 0.85,
      importance: "CRITICAL",
    });
  }

  return {
    id: scene.sceneId,
    name:
      scene.roomType === "BEDROOM"
        ? `Phòng ngủ tái dựng AI (${scene.dimensions.width}m x ${scene.dimensions.length}m)`
        : scene.roomType === "BATHROOM"
        ? `Nhà vệ sinh tái dựng AI (${scene.dimensions.width}m x ${scene.dimensions.length}m)`
        : `Không gian sống tái dựng AI (${scene.dimensions.width}m x ${scene.dimensions.length}m)`,
    roomType: scene.roomType,
    layoutType: "SINGLE_ROOM",
    dimensions: {
      width: scene.dimensions.width,
      length: scene.dimensions.length,
      height: scene.dimensions.height,
    },
    floorMaterial: scene.floorProperties.material,
    lightingLevel: scene.lightingLevelLux,
    isWet: scene.floorProperties.isWet,
    isSlipResistant: scene.floorProperties.isSlipResistant,
    grabBarsCount,
    walkingZones,
    objects,
  };
}
