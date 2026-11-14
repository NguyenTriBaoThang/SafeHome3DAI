import { AssessmentInput, AssessmentRoomDimensions } from "./types";
import { RoomProfile } from "@/lib/survey/types";
import { RoomState } from "@/types";

/**
 * Normalizes input from an AI Guided Survey `RoomProfile` into a strongly typed `AssessmentInput`.
 */
export function normalizeSurveyProfileToAssessmentInput(profile: RoomProfile): AssessmentInput {
  const dimensions: AssessmentRoomDimensions = {
    lengthM: profile.dimensions?.lengthM ?? 4.0,
    widthM: profile.dimensions?.widthM ?? 3.5,
    heightM: profile.dimensions?.heightM ?? 2.8,
    source:
      profile.dimensions?.measurementConfidenceType === "MEASURED"
        ? "USER_MEASURED"
        : profile.dimensions?.measurementConfidenceType === "ESTIMATED"
        ? "USER_ESTIMATED"
        : "SYSTEM_DEFAULT",
  };

  const isBathroom = profile.roomType === "BATHROOM";

  return {
    roomId: profile.roomId,
    roomName: profile.roomName || (isBathroom ? "Nhà vệ sinh" : "Phòng ngủ"),
    roomType: profile.roomType as any,
    dimensions,
    floor: {
      material: profile.floor?.material || (isBathroom ? "Gạch men" : "Sàn gỗ"),
      isWet: profile.floor?.isWetReported ?? (isBathroom ? true : false),
      isSlipResistant: profile.floor?.isSlipperyReported === false,
      hasNonSlipMat: false,
      levelDifferenceCm: profile.floor?.levelDifferenceCm ?? (profile.floor?.levelDifferenceReported ? 3.0 : 0),
      thresholdStepPresent: profile.floor?.levelDifferenceReported ?? false,
      hasThresholdRamp: false,
    },
    lighting: {
      daytimeLux: profile.lighting?.generalLightingAdequate === false ? 80 : 200,
      nighttimeLux: profile.lighting?.adequateAtNight === false ? 40 : 120,
      nightLightPresent: profile.lighting?.nightLightPresent ?? false,
      motionSensorPresent: false,
      pathLightToBathroom: profile.lighting?.adequateAtNight ?? false,
      switchReachableFromEntrance: true,
      switchReachableFromBed: !profile.accessibilityObservations?.reachingDifficulty,
    },
    rugs: {
      present: profile.rugs?.present ?? null,
      items:
        profile.rugs?.present
          ? [
              {
                id: "rug-survey-1",
                name: "Thảm trải sàn",
                location: profile.rugs.locations?.[0] || "Cạnh giường",
                isSecured: profile.rugs.secured ?? false,
                edgesCurled: !(profile.rugs.secured ?? false),
                inWalkway: true,
              },
            ]
          : [],
    },
    cables: {
      crossingWalkway: profile.electricalCables?.onWalkway ?? null,
      items:
        profile.electricalCables?.onWalkway
          ? [
              {
                id: "cable-survey-1",
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
      present: profile.obstacles?.present ?? null,
      walkwayClearWidthM: profile.obstacles?.present ? 0.7 : 1.1,
      items:
        profile.obstacles?.present && profile.obstacles.types?.length
          ? profile.obstacles.types.map((type, idx) => ({
              id: `obstacle-survey-${idx}`,
              name:
                type === "GHE"
                  ? "Ghế đẩu hoặc bàn nhỏ"
                  : type === "HOP_DO"
                  ? "Hộp hoặc đồ đạc để tạm"
                  : type === "QUAT"
                  ? "Quạt đứng"
                  : "Chướng ngại vật",
              location: "Lối đi chính",
              obstructsWalkway: true,
              clearanceWidthM: 0.7,
            }))
          : [],
    },
    grabBars: {
      present: profile.grabBars?.present ?? (isBathroom ? false : false),
      count: profile.grabBars?.present ? profile.grabBars.locations?.length || 1 : 0,
      toiletGrabBarPresent: profile.grabBars?.locations?.some((loc) => loc.toLowerCase().includes("toilet") || loc.toLowerCase().includes("bồn cầu")) ?? false,
      showerGrabBarPresent: profile.grabBars?.locations?.some((loc) => loc.toLowerCase().includes("shower") || loc.toLowerCase().includes("sen") || loc.toLowerCase().includes("tắm")) ?? false,
      inspectedSecure: profile.grabBars?.inspected ?? false,
    },
    accessibility: {
      lightSwitchReachableFromBed: !profile.accessibilityObservations?.reachingDifficulty,
      essentialItemsReachableFromBed: !profile.accessibilityObservations?.bedMobilityDifficulty,
      emergencyCallReachable: false,
    },
    reportedConcerns: profile.reportedConcerns || [],
    sourceType: "SURVEY_PROFILE",
  };
}

/**
 * Normalizes a 3D Digital Twin `RoomState` into `AssessmentInput`.
 */
export function normalizeRoomStateToAssessmentInput(roomState: RoomState): AssessmentInput {
  const isBathroom = roomState.roomType === "BATHROOM";
  const rugs = roomState.objects.filter((o) => o.category === "RUG" || o.modelType === "rug");
  const cables = roomState.objects.filter((o) => o.category === "CABLE" || o.modelType === "cable");
  const obstacles = roomState.objects.filter((o) => o.isWalkwayObstacle || o.category === "OBSTACLE");
  const grabBars = roomState.objects.filter((o) => o.category === "SAFETY_DEVICE" && o.modelType.includes("grab_bar"));

  return {
    roomId: roomState.id,
    roomName: roomState.name,
    roomType: roomState.roomType as any,
    dimensions: {
      lengthM: roomState.dimensions.length,
      widthM: roomState.dimensions.width,
      heightM: roomState.dimensions.height,
      source: "USER_MEASURED",
    },
    floor: {
      material: roomState.floorMaterial,
      isWet: roomState.isWet,
      isSlipResistant: roomState.isSlipResistant,
      hasNonSlipMat: roomState.objects.some((o) => o.name.toLowerCase().includes("chống trượt")),
      levelDifferenceCm: isBathroom ? 2.5 : 0,
      thresholdStepPresent: isBathroom,
      hasThresholdRamp: false,
    },
    lighting: {
      daytimeLux: Math.max(roomState.lightingLevel, 150),
      nighttimeLux: roomState.lightingLevel,
      nightLightPresent: roomState.objects.some((o) => o.category === "LIGHTING" && o.name.toLowerCase().includes("ngủ")),
      motionSensorPresent: false,
      pathLightToBathroom: roomState.lightingLevel >= 80,
      switchReachableFromEntrance: true,
      switchReachableFromBed: true,
    },
    rugs: {
      present: rugs.length > 0,
      items: rugs.map((r) => ({
        id: r.id,
        name: r.name,
        location: `[${r.position[0]}, ${r.position[2]}]`,
        isSecured: r.isFixed ?? !r.isLoose,
        edgesCurled: r.isLoose ?? false,
        inWalkway: true,
      })),
    },
    cables: {
      crossingWalkway: cables.some((c) => !c.isFixed),
      items: cables.map((c) => ({
        id: c.id,
        name: c.name,
        location: `[${c.position[0]}, ${c.position[2]}]`,
        crossesWalkway: !c.isFixed,
        hasCordCover: c.isFixed ?? false,
        hasSkirtingTrunking: c.isFixed ?? false,
      })),
    },
    obstacles: {
      present: obstacles.length > 0,
      walkwayClearWidthM: obstacles.length > 0 ? 0.65 : 1.0,
      items: obstacles.map((obs) => ({
        id: obs.id,
        name: obs.name,
        location: `[${obs.position[0]}, ${obs.position[2]}]`,
        obstructsWalkway: true,
        clearanceWidthM: 0.65,
      })),
    },
    grabBars: {
      present: (roomState.grabBarsCount || grabBars.length) > 0,
      count: roomState.grabBarsCount || grabBars.length,
      toiletGrabBarPresent: grabBars.some((g) => g.name.toLowerCase().includes("toilet") || g.position[0] < 0),
      showerGrabBarPresent: grabBars.some((g) => g.name.toLowerCase().includes("shower") || g.position[0] >= 0),
      inspectedSecure: true,
    },
    accessibility: {
      lightSwitchReachableFromBed: true,
      essentialItemsReachableFromBed: true,
      emergencyCallReachable: false,
    },
    sourceType: "3D_SCENE",
  };
}

/**
 * Universal dispatcher to normalize any input format into AssessmentInput.
 */
export function normalizeRoomAssessmentInput(rawInput: any): AssessmentInput {
  if (!rawInput) {
    throw new Error("Dữ liệu đầu vào không được để trống khi thẩm định nguy cơ.");
  }

  // Case 1: Already normalized
  if (rawInput.sourceType && rawInput.dimensions && rawInput.floor && rawInput.lighting) {
    return rawInput as AssessmentInput;
  }

  // Case 2: Survey RoomProfile
  if (rawInput.surveyVersion || rawInput.completenessScore !== undefined || rawInput.surveyId) {
    return normalizeSurveyProfileToAssessmentInput(rawInput as RoomProfile);
  }

  // Case 3: 3D RoomState
  if (Array.isArray(rawInput.objects) && Array.isArray(rawInput.walkingZones)) {
    return normalizeRoomStateToAssessmentInput(rawInput as RoomState);
  }

  // Case 4: Minimal partial object
  const roomType = rawInput.roomType || "BEDROOM";
  return {
    roomId: rawInput.roomId || rawInput.id || "room-default",
    roomName: rawInput.roomName || rawInput.name || (roomType === "BATHROOM" ? "Nhà vệ sinh" : "Phòng ngủ"),
    roomType,
    dimensions: {
      lengthM: rawInput.dimensions?.lengthM || rawInput.length || 4.0,
      widthM: rawInput.dimensions?.widthM || rawInput.width || 3.5,
      heightM: rawInput.dimensions?.heightM || rawInput.height || 2.8,
      source: "SYSTEM_DEFAULT",
    },
    floor: {
      material: rawInput.floorMaterial || (roomType === "BATHROOM" ? "Gạch men" : "Sàn gỗ"),
      isWet: rawInput.isWet ?? (roomType === "BATHROOM"),
      isSlipResistant: rawInput.isSlipResistant ?? false,
      levelDifferenceCm: rawInput.levelDifferenceCm || (roomType === "BATHROOM" ? 2.5 : 0),
      thresholdStepPresent: rawInput.thresholdStepPresent ?? (roomType === "BATHROOM"),
    },
    lighting: {
      daytimeLux: rawInput.lightingLevel || 200,
      nighttimeLux: rawInput.nighttimeLux || 40,
      nightLightPresent: rawInput.nightLightPresent ?? false,
      motionSensorPresent: rawInput.motionSensorPresent ?? false,
      pathLightToBathroom: rawInput.pathLightToBathroom ?? false,
      switchReachableFromEntrance: true,
      switchReachableFromBed: true,
    },
    rugs: {
      present:
        rawInput.rugs !== undefined
          ? rawInput.rugs.present
          : rawInput.rugsPresent !== undefined
          ? rawInput.rugsPresent
          : false,
      items: rawInput.rugs?.items || (rawInput.rugsPresent ? [{
        id: "rug-default",
        name: "Thảm trải sàn",
        location: "Cạnh giường",
        isSecured: false,
        edgesCurled: true,
        inWalkway: true,
      }] : []),
    },
    cables: {
      crossingWalkway:
        rawInput.cables !== undefined
          ? rawInput.cables.crossingWalkway
          : rawInput.cablesCrossing !== undefined
          ? rawInput.cablesCrossing
          : false,
      items: rawInput.cables?.items || (rawInput.cablesCrossing ? [{
        id: "cable-default",
        name: "Dây điện / dây sạc thiết bị",
        location: "Lối đi chính",
        crossesWalkway: true,
        hasCordCover: false,
        hasSkirtingTrunking: false,
      }] : []),
    },
    obstacles: {
      present:
        rawInput.obstacles !== undefined
          ? rawInput.obstacles.present
          : rawInput.obstaclesPresent !== undefined
          ? rawInput.obstaclesPresent
          : false,
      walkwayClearWidthM: rawInput.obstacles?.walkwayClearWidthM || rawInput.walkwayClearWidthM || 0.9,
      items: rawInput.obstacles?.items || [],
    },
    grabBars: {
      present: (rawInput.grabBarsCount || 0) > 0,
      count: rawInput.grabBarsCount || 0,
      toiletGrabBarPresent: (rawInput.grabBarsCount || 0) > 0,
      showerGrabBarPresent: (rawInput.grabBarsCount || 0) > 1,
      inspectedSecure: true,
    },
    accessibility: {
      lightSwitchReachableFromBed: true,
      essentialItemsReachableFromBed: true,
      emergencyCallReachable: false,
    },
    sourceType: "HYBRID",
  };
}
