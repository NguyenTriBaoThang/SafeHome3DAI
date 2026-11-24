/**
 * ==============================================================================
 * GOLDEN RISK FIXTURES (TASK A03)
 * ==============================================================================
 * 22 comprehensive fixtures covering safe, unsafe, and unknown conditions across
 * Bedroom, Bathroom, Living Room, and Hallway.
 * Covers Physical Measured, User Confirmed, AI Vision Estimated, and 3D Simulated sources.
 * ==============================================================================
 */

import { AssessmentInput } from "@/lib/risk/types";

// 1. Fully Measured Safe Bedroom
export const FIXTURE_01_BEDROOM_SAFE_MEASURED: AssessmentInput = {
  roomId: "room_bed_safe_01",
  roomName: "Phòng ngủ an toàn mẫu",
  roomType: "BEDROOM",
  sourceType: "SURVEY_PROFILE",
  dimensions: { lengthM: 5.0, widthM: 4.2, heightM: 2.8, source: "USER_MEASURED" },
  floor: {
    material: "Sàn gỗ chống trượt",
    isWet: false,
    isSlipResistant: true,
    levelDifferenceCm: 0,
    thresholdStepPresent: false,
  },
  lighting: {
    daytimeLux: 250,
    nighttimeLux: 80,
    nightLightPresent: true,
    motionSensorPresent: true,
    pathLightToBathroom: true,
    switchReachableFromEntrance: true,
    switchReachableFromBed: true,
  },
  rugs: { present: false, items: [] },
  cables: { crossingWalkway: false, items: [] },
  obstacles: { present: false, walkwayClearWidthM: 1.2, items: [] },
  grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
  accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: true },
};

// 2. Bedroom with Unsecured Rug on Walkway (RISK-001)
export const FIXTURE_02_BEDROOM_UNSECURED_RUG: AssessmentInput = {
  ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
  roomId: "room_bed_rug_02",
  rugs: {
    present: true,
    items: [
      {
        id: "rug-02",
        name: "Thảm len chân giường",
        location: "Lối đi cạnh giường",
        isSecured: false,
        edgesCurled: true,
        inWalkway: true,
      },
    ],
  },
};

// 3. Bedroom with Trailing Cable (RISK-002)
export const FIXTURE_03_BEDROOM_TRAILING_CABLE: AssessmentInput = {
  ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
  roomId: "room_bed_cable_03",
  cables: {
    crossingWalkway: true,
    items: [
      {
        id: "cable-03",
        name: "Dây sạc điện thoại & quạt",
        location: "Vắt ngang lối đi vào toilet",
        crossesWalkway: true,
        hasCordCover: false,
        hasSkirtingTrunking: false,
      },
    ],
  },
};

// 4. Bedroom with Narrow Walkway Obstacle (RISK-003)
export const FIXTURE_04_BEDROOM_NARROW_WALKWAY: AssessmentInput = {
  ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
  roomId: "room_bed_obstacle_04",
  obstacles: {
    present: true,
    walkwayClearWidthM: 0.65,
    items: [
      {
        id: "obs-04",
        name: "Ghế đôn gỗ và giỏ quần áo",
        location: "Lối đi chính",
        obstructsWalkway: true,
        clearanceWidthM: 0.65,
      },
    ],
  },
};

// 5. Bedroom with Dark Night Lighting < 50 Lux (RISK-004)
export const FIXTURE_05_BEDROOM_DARK_NIGHT: AssessmentInput = {
  ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
  roomId: "room_bed_dark_05",
  lighting: {
    daytimeLux: 180,
    nighttimeLux: 15,
    nightLightPresent: false,
    motionSensorPresent: false,
    pathLightToBathroom: false,
    switchReachableFromEntrance: true,
    switchReachableFromBed: false,
  },
};

// 6. Bedroom with Unreachable Switch & Controls (RISK-008)
export const FIXTURE_06_BEDROOM_UNREACHABLE_SWITCH: AssessmentInput = {
  ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
  roomId: "room_bed_accessibility_06",
  accessibility: {
    lightSwitchReachableFromBed: false,
    essentialItemsReachableFromBed: false,
    emergencyCallReachable: false,
  },
};

// 7. Bedroom with Multiple Co-existing Hazards (RISK-001, 002, 004)
export const FIXTURE_07_BEDROOM_MULTIPLE_HAZARDS: AssessmentInput = {
  ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
  roomId: "room_bed_multi_07",
  rugs: FIXTURE_02_BEDROOM_UNSECURED_RUG.rugs,
  cables: FIXTURE_03_BEDROOM_TRAILING_CABLE.cables,
  lighting: FIXTURE_05_BEDROOM_DARK_NIGHT.lighting,
};

// 8. Bedroom with Unknown Rugs and Cables (NEEDS_VERIFICATION)
export const FIXTURE_08_BEDROOM_UNKNOWN_RUG_AND_CABLE: AssessmentInput = {
  ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
  roomId: "room_bed_unknown_08",
  rugs: { present: null, items: [] },
  cables: { crossingWalkway: null, items: [] },
};

// 9. Fully Measured Safe Bathroom
export const FIXTURE_09_BATHROOM_SAFE_MEASURED: AssessmentInput = {
  roomId: "room_bath_safe_09",
  roomName: "Nhà vệ sinh đạt chuẩn an toàn",
  roomType: "BATHROOM",
  sourceType: "SURVEY_PROFILE",
  dimensions: { lengthM: 2.8, widthM: 2.2, heightM: 2.6, source: "USER_MEASURED" },
  floor: {
    material: "Gạch nhám R10",
    isWet: true,
    isSlipResistant: true,
    hasNonSlipMat: true,
    levelDifferenceCm: 0,
    thresholdStepPresent: false,
    hasThresholdRamp: true,
  },
  lighting: {
    daytimeLux: 200,
    nighttimeLux: 100,
    nightLightPresent: true,
    motionSensorPresent: true,
    pathLightToBathroom: true,
    switchReachableFromEntrance: true,
    switchReachableFromBed: true,
  },
  rugs: { present: false, items: [] },
  cables: { crossingWalkway: false, items: [] },
  obstacles: { present: false, walkwayClearWidthM: 0.95, items: [] },
  grabBars: {
    present: true,
    count: 2,
    toiletGrabBarPresent: true,
    showerGrabBarPresent: true,
    inspectedSecure: true,
  },
  accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: true },
};

// 10. Bathroom with Wet Slippery Tile (RISK-005)
export const FIXTURE_10_BATHROOM_WET_SLIPPERY_TILE: AssessmentInput = {
  ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
  roomId: "room_bath_slip_10",
  floor: {
    material: "Gạch men bóng tráng gương",
    isWet: true,
    isSlipResistant: false,
    hasNonSlipMat: false,
    levelDifferenceCm: 0,
    thresholdStepPresent: false,
  },
};

// 11. Bathroom Missing All Grab Bars (RISK-006)
export const FIXTURE_11_BATHROOM_NO_GRAB_BARS: AssessmentInput = {
  ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
  roomId: "room_bath_nograb_11",
  grabBars: {
    present: false,
    count: 0,
    toiletGrabBarPresent: false,
    showerGrabBarPresent: false,
    inspectedSecure: false,
  },
};

// 12. Bathroom with High Threshold Step > 1.5cm (RISK-007)
export const FIXTURE_12_BATHROOM_HIGH_THRESHOLD: AssessmentInput = {
  ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
  roomId: "room_bath_threshold_12",
  floor: {
    ...FIXTURE_09_BATHROOM_SAFE_MEASURED.floor,
    levelDifferenceCm: 4.5,
    thresholdStepPresent: true,
    hasThresholdRamp: false,
  },
};

// 13. Severe Bathroom with Wet Tile and No Grab Bars (RISK-005, 006)
export const FIXTURE_13_BATHROOM_WET_AND_NO_GRAB_BARS: AssessmentInput = {
  ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
  roomId: "room_bath_severe_13",
  floor: FIXTURE_10_BATHROOM_WET_SLIPPERY_TILE.floor,
  grabBars: FIXTURE_11_BATHROOM_NO_GRAB_BARS.grabBars,
};

// 14. Bathroom with Unknown Slip Resistance (NEEDS_VERIFICATION)
export const FIXTURE_14_BATHROOM_UNKNOWN_FLOOR_SLIP: AssessmentInput = {
  ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
  roomId: "room_bath_unknown_14",
  floor: {
    material: "Gạch men cũ",
    isWet: true,
    isSlipResistant: false, // unverified
    hasNonSlipMat: false,
    levelDifferenceCm: 0,
    thresholdStepPresent: false,
  },
};

// 15. Safe Living Room
export const FIXTURE_15_LIVING_ROOM_SAFE: AssessmentInput = {
  roomId: "room_living_safe_15",
  roomName: "Phòng khách an toàn",
  roomType: "LIVING_ROOM",
  sourceType: "SURVEY_PROFILE",
  dimensions: { lengthM: 6.5, widthM: 4.8, heightM: 3.0, source: "USER_MEASURED" },
  floor: { material: "Gỗ sồi", isWet: false, isSlipResistant: true, levelDifferenceCm: 0, thresholdStepPresent: false },
  lighting: { daytimeLux: 350, nighttimeLux: 120, nightLightPresent: true, motionSensorPresent: false, pathLightToBathroom: true, switchReachableFromEntrance: true, switchReachableFromBed: true },
  rugs: { present: false, items: [] },
  cables: { crossingWalkway: false, items: [] },
  obstacles: { present: false, walkwayClearWidthM: 1.5, items: [] },
  grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
  accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: true },
};

// 16. Living Room with Clutter Obstacles (RISK-003)
export const FIXTURE_16_LIVING_ROOM_CLUTTER_OBSTACLES: AssessmentInput = {
  ...FIXTURE_15_LIVING_ROOM_SAFE,
  roomId: "room_living_clutter_16",
  obstacles: {
    present: true,
    walkwayClearWidthM: 0.60,
    items: [
      { id: "obs-16", name: "Đôn gỗ và thùng đồ chơi", location: "Lối đi từ sofa ra ban công", obstructsWalkway: true, clearanceWidthM: 0.6 },
    ],
  },
};

// 17. Living Room with TV Cables (RISK-002)
export const FIXTURE_17_LIVING_ROOM_TV_CORDS: AssessmentInput = {
  ...FIXTURE_15_LIVING_ROOM_SAFE,
  roomId: "room_living_cords_17",
  cables: {
    crossingWalkway: true,
    items: [
      { id: "cbl-17", name: "Dây nguồn TV và loa", location: "Băng qua lối đi chính", crossesWalkway: true, hasCordCover: false, hasSkirtingTrunking: false },
    ],
  },
};

// 18. Safe Hallway
export const FIXTURE_18_HALLWAY_SAFE: AssessmentInput = {
  roomId: "room_hall_safe_18",
  roomName: "Hành lang an toàn",
  roomType: "HALLWAY",
  sourceType: "SURVEY_PROFILE",
  dimensions: { lengthM: 7.0, widthM: 1.4, heightM: 2.8, source: "USER_MEASURED" },
  floor: { material: "Gạch chống trượt", isWet: false, isSlipResistant: true, levelDifferenceCm: 0, thresholdStepPresent: false },
  lighting: { daytimeLux: 180, nighttimeLux: 90, nightLightPresent: true, motionSensorPresent: true, pathLightToBathroom: true, switchReachableFromEntrance: true, switchReachableFromBed: true },
  rugs: { present: false, items: [] },
  cables: { crossingWalkway: false, items: [] },
  obstacles: { present: false, walkwayClearWidthM: 1.4, items: [] },
  grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
  accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: true },
};

// 19. Hallway with Unsecured Runner Rug (RISK-001)
export const FIXTURE_19_HALLWAY_UNSECURED_RUNNER: AssessmentInput = {
  ...FIXTURE_18_HALLWAY_SAFE,
  roomId: "room_hall_runner_19",
  rugs: {
    present: true,
    items: [
      { id: "rug-19", name: "Thảm dệt dài hành lang", location: "Hành lang giữa", isSecured: false, edgesCurled: true, inWalkway: true },
    ],
  },
};

// 20. 3D Simulated Scene Hazard (sourceType: "3D_SCENE")
export const FIXTURE_20_SIMULATED_3D_SCENE_HAZARD: AssessmentInput = {
  ...FIXTURE_02_BEDROOM_UNSECURED_RUG,
  roomId: "room_sim_3d_20",
  sourceType: "3D_SCENE",
};

// 21. AI Vision Estimated Hazard (sourceType: "AI_VISION")
export const FIXTURE_21_AI_VISION_ESTIMATED_HAZARD: AssessmentInput = {
  ...FIXTURE_02_BEDROOM_UNSECURED_RUG,
  roomId: "room_vision_est_21",
  sourceType: "AI_VISION" as any,
};

// 22. Minimal Room with Empty/Default Inputs
export const FIXTURE_22_COMPLETELY_EMPTY_ROOM: AssessmentInput = {
  roomId: "room_empty_22",
  roomName: "Phòng trống chưa khảo sát",
  roomType: "BEDROOM",
  sourceType: "SURVEY_PROFILE",
  dimensions: { lengthM: 4.0, widthM: 3.5, heightM: 2.8, source: "SYSTEM_DEFAULT" },
  floor: { material: "Gạch men", isWet: false, isSlipResistant: false, levelDifferenceCm: 0, thresholdStepPresent: false },
  lighting: { daytimeLux: 150, nighttimeLux: 50, nightLightPresent: false, motionSensorPresent: false, pathLightToBathroom: false, switchReachableFromEntrance: true, switchReachableFromBed: false },
  rugs: { present: null, items: [] },
  cables: { crossingWalkway: null, items: [] },
  obstacles: { present: null, walkwayClearWidthM: 1.0, items: [] },
  grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
  accessibility: { lightSwitchReachableFromBed: false, essentialItemsReachableFromBed: false, emergencyCallReachable: false },
};

export const ALL_GOLDEN_FIXTURES: AssessmentInput[] = [
  FIXTURE_01_BEDROOM_SAFE_MEASURED,
  FIXTURE_02_BEDROOM_UNSECURED_RUG,
  FIXTURE_03_BEDROOM_TRAILING_CABLE,
  FIXTURE_04_BEDROOM_NARROW_WALKWAY,
  FIXTURE_05_BEDROOM_DARK_NIGHT,
  FIXTURE_06_BEDROOM_UNREACHABLE_SWITCH,
  FIXTURE_07_BEDROOM_MULTIPLE_HAZARDS,
  FIXTURE_08_BEDROOM_UNKNOWN_RUG_AND_CABLE,
  FIXTURE_09_BATHROOM_SAFE_MEASURED,
  FIXTURE_10_BATHROOM_WET_SLIPPERY_TILE,
  FIXTURE_11_BATHROOM_NO_GRAB_BARS,
  FIXTURE_12_BATHROOM_HIGH_THRESHOLD,
  FIXTURE_13_BATHROOM_WET_AND_NO_GRAB_BARS,
  FIXTURE_14_BATHROOM_UNKNOWN_FLOOR_SLIP,
  FIXTURE_15_LIVING_ROOM_SAFE,
  FIXTURE_16_LIVING_ROOM_CLUTTER_OBSTACLES,
  FIXTURE_17_LIVING_ROOM_TV_CORDS,
  FIXTURE_18_HALLWAY_SAFE,
  FIXTURE_19_HALLWAY_UNSECURED_RUNNER,
  FIXTURE_20_SIMULATED_3D_SCENE_HAZARD,
  FIXTURE_21_AI_VISION_ESTIMATED_HAZARD,
  FIXTURE_22_COMPLETELY_EMPTY_ROOM,
];

