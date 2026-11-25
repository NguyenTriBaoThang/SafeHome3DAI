/**
 * ==============================================================================
 * SYNCHRONIZED BEFORE-AFTER SNAPSHOT FIXTURES FOR MEMBER 2 (B09)
 * ==============================================================================
 * Locked API v1 fixtures for baseline, proposed_scenario, verified_post_intervention,
 * and insufficient-data comparison ("chưa thể đánh giá").
 * ==============================================================================
 */

export const B09_BEDROOM_BASELINE_INPUT = {
  roomId: "room-bedroom-b09",
  roomName: "Phòng ngủ mẫu đồng bộ B09",
  roomType: "BEDROOM" as const,
  sourceType: "SURVEY_PROFILE" as const,
  dimensions: { lengthM: 4.2, widthM: 3.6, heightM: 2.8, source: "USER_MEASURED" as const },
  floor: {
    material: "Gỗ",
    isWet: false,
    isSlipResistant: true,
    levelDifferenceCm: 0,
    thresholdStepPresent: false,
  },
  lighting: {
    daytimeLux: 180,
    nighttimeLux: 18,
    nightLightPresent: false,
    motionSensorPresent: false,
    pathLightToBathroom: false,
    switchReachableFromEntrance: true,
    switchReachableFromBed: false,
  },
  rugs: {
    present: true,
    items: [
      {
        id: "obj-rug-01",
        name: "Thảm chân mép giường",
        location: "Lối đi mép giường",
        isSecured: false,
        edgesCurled: true,
        inWalkway: true,
      },
    ],
  },
  cables: {
    crossingWalkway: true,
    items: [
      {
        id: "obj-cable-01",
        name: "Dây điện quạt",
        location: "Cắt ngang lối đi",
        crossesWalkway: true,
        hasCordCover: false,
        hasSkirtingTrunking: false,
      },
    ],
  },
  obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
  grabBars: {
    present: false,
    count: 0,
    toiletGrabBarPresent: false,
    showerGrabBarPresent: false,
    inspectedSecure: false,
  },
  accessibility: {
    lightSwitchReachableFromBed: false,
    essentialItemsReachableFromBed: true,
    emergencyCallReachable: true,
  },
};

export const B09_PROPOSED_SCENARIO_PATCHES = {
  rugs: {
    present: true,
    items: [
      {
        id: "obj-rug-01",
        name: "Thảm chân mép giường (dự kiến dán mép)",
        location: "Cạnh giường",
        isSecured: true,
        edgesCurled: false,
        inWalkway: false,
      },
    ],
  },
  lighting: {
    daytimeLux: 200,
    nighttimeLux: 45,
    nightLightPresent: true,
    motionSensorPresent: true,
    pathLightToBathroom: true,
    switchReachableFromEntrance: true,
    switchReachableFromBed: true,
  },
};

export const B09_VERIFIED_POST_INTERVENTION_INPUT = {
  ...B09_BEDROOM_BASELINE_INPUT,
  rugs: B09_PROPOSED_SCENARIO_PATCHES.rugs,
  lighting: B09_PROPOSED_SCENARIO_PATCHES.lighting,
  cables: { crossingWalkway: false, items: [] },
  accessibility: {
    lightSwitchReachableFromBed: true,
    essentialItemsReachableFromBed: true,
    emergencyCallReachable: true,
  },
};

export const B09_INSUFFICIENT_AFTER_INPUT = {
  ...B09_BEDROOM_BASELINE_INPUT,
  rugs: { present: null, items: [] },
  cables: { crossingWalkway: null, items: [] },
  obstacles: { present: null, walkwayClearWidthM: 0, items: [] },
};

