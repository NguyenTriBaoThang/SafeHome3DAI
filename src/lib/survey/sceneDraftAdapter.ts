import { RoomProfile, SceneDraft, SceneDraftObject, AnswerSource } from "./types";

/**
 * Transforms a structured RoomProfile into a 3D SceneDraft
 * suitable for consumption by the SafeHome 3D Digital Twin Engine.
 */
export function convertRoomProfileToSceneDraft(profile: RoomProfile): SceneDraft {
  const unresolvedMeasurements: string[] = [];
  const dataProvenance: Record<string, AnswerSource> = {};

  // 1. Dimensions Resolution
  let length = 5.0;
  let width = 4.0;
  let height = 2.8;
  let isDemoFallback = true;

  if (profile.dimensions.lengthM && profile.dimensions.widthM) {
    length = profile.dimensions.lengthM;
    width = profile.dimensions.widthM;
    height = profile.dimensions.heightM || 2.8;
    isDemoFallback = false;
    dataProvenance["dimensions"] = profile.dimensions.measurementSource;
  } else {
    unresolvedMeasurements.push("Kích thước phòng (Dài x Rộng)");
    dataProvenance["dimensions"] = "IMPORTED_MEASUREMENT";
  }

  // 2. Objects Synthesis based on room type and reported answers
  const objects: SceneDraftObject[] = [];

  if (profile.roomType === "BEDROOM") {
    // Bed (Always present in bedroom)
    objects.push({
      id: `obj-bed-${profile.roomId}`,
      modelType: "bed",
      name: "Giường ngủ",
      category: "FURNITURE",
      suggestedPosition: [0, 0.4, -1.2],
      suggestedDimensions: [1.8, 0.8, 2.0],
      requiresPlacementConfirmation: false,
    });

    // Nightstand
    objects.push({
      id: `obj-nightstand-${profile.roomId}`,
      modelType: "nightstand",
      name: "Tủ đầu giường",
      category: "FURNITURE",
      suggestedPosition: [1.2, 0.3, -1.2],
      suggestedDimensions: [0.5, 0.6, 0.5],
      requiresPlacementConfirmation: false,
    });

    // Rug (if reported present)
    if (profile.rugs.present) {
      objects.push({
        id: `obj-rug-${profile.roomId}`,
        modelType: "rug",
        name: "Thảm trải sàn cạnh giường",
        category: "RUG",
        suggestedPosition: [0, 0.02, 0.2],
        suggestedDimensions: [1.5, 0.02, 1.0],
        isHazardSource: profile.rugs.secured === false,
        requiresPlacementConfirmation: true,
      });
      dataProvenance["rug"] = "USER_SELECTED";
    }

    // Electrical Cable (if reported on walkway)
    if (profile.electricalCables.onWalkway) {
      objects.push({
        id: `obj-cable-${profile.roomId}`,
        modelType: "cable",
        name: "Dây điện vắt ngang lối đi",
        category: "CABLE",
        suggestedPosition: [0.5, 0.01, 0.8],
        suggestedDimensions: [1.2, 0.02, 0.05],
        isHazardSource: true,
        requiresPlacementConfirmation: true,
      });
      dataProvenance["cable"] = "USER_SELECTED";
    }

    // Obstacles
    if (profile.obstacles.present && profile.obstacles.types.length > 0) {
      profile.obstacles.types.forEach((type, idx) => {
        const nameMap: Record<string, string> = {
          GHE: "Ghế cản lối đi",
          TU: "Tủ thấp cản lối đi",
          BAN: "Bàn nhỏ cản lối đi",
          HOP_DO: "Hộp đồ / đồ chơi để dưới sàn",
          VAT_KHAC: "Vật dụng cản trở lối đi",
        };
        objects.push({
          id: `obj-obstacle-${idx}-${profile.roomId}`,
          modelType: type === "GHE" ? "chair" : "box",
          name: nameMap[type] || "Chướng ngại vật",
          category: "OBSTACLE",
          suggestedPosition: [-0.8 + idx * 0.4, 0.25, 0.6],
          suggestedDimensions: [0.5, 0.5, 0.5],
          isHazardSource: true,
          requiresPlacementConfirmation: true,
        });
      });
    }
  } else if (profile.roomType === "BATHROOM") {
    // Toilet
    objects.push({
      id: `obj-toilet-${profile.roomId}`,
      modelType: "toilet",
      name: "Bồn cầu",
      category: "SAFETY_DEVICE",
      suggestedPosition: [-1.0, 0.4, -0.8],
      suggestedDimensions: [0.5, 0.8, 0.7],
      requiresPlacementConfirmation: false,
    });

    // Shower
    objects.push({
      id: `obj-shower-${profile.roomId}`,
      modelType: "shower",
      name: "Khu vực sen tắm",
      category: "FURNITURE",
      suggestedPosition: [1.0, 1.0, -0.8],
      suggestedDimensions: [0.9, 2.0, 0.9],
      requiresPlacementConfirmation: false,
    });

    // Grab Bar (if present)
    if (profile.grabBars.present) {
      objects.push({
        id: `obj-grabbar-${profile.roomId}`,
        modelType: "grab_bar",
        name: "Thanh tay vịn an toàn",
        category: "SAFETY_DEVICE",
        suggestedPosition: [-0.65, 0.8, -0.8],
        suggestedDimensions: [0.05, 0.05, 0.6],
        isHazardSource: profile.grabBars.inspected === false,
        requiresPlacementConfirmation: true,
      });
      dataProvenance["grabBar"] = "USER_SELECTED";
    }
  }

  // 3. Environmental Properties
  let lightingLux = 150;
  if (profile.lighting.adequateAtNight === false || profile.lighting.generalLightingAdequate === false) {
    lightingLux = 50; // Dim / poor lighting
  } else if (profile.lighting.nightLightPresent) {
    lightingLux = 100;
  }

  return {
    roomId: profile.roomId,
    roomType: profile.roomType,
    roomName: profile.roomName,
    approximateDimensions: {
      length,
      width,
      height,
      isDemoFallback,
    },
    objects,
    environmentalProperties: {
      lightingLux,
      floorMaterial: profile.floor.material,
      isWet: profile.floor.isWetReported === true,
      isSlippery: profile.floor.isSlipperyReported === true,
    },
    objectPlacementStatus: "DRAFT_AUTO_GENERATED",
    unresolvedMeasurements,
    dataProvenance,
  };
}

