import {
  createMeasured,
  createUserConfirmed,
  createVisionEstimated,
  createSimulated,
  createUnknown,
  createLegacyAssumed,
  BedDimensionsProvenance,
} from "@/lib/provenance/measurementProvenance";

/**
 * Fixture: Clinically safe elderly bed with measured heights.
 * - bedSurfaceHeightCm: 48 cm (Within CDC STEADI recommended 45-55cm)
 * - totalBedHeightCm: 70 cm (Structural headboard height)
 */
export const CLINICALLY_SAFE_BED: BedDimensionsProvenance = {
  bedSurfaceHeightCm: createMeasured(
    48,
    "cm",
    "calibrated_wooden_rule",
    "kts_hoang",
    0.5,
    "survey-bed-height-001"
  ),
  totalBedHeightCm: createMeasured(
    70,
    "cm",
    "tape_measure",
    "kts_hoang",
    1.0,
    "survey-bed-height-001"
  ),
  lengthCm: createMeasured(200, "cm", "laser_measure", "kts_hoang"),
  widthCm: createMeasured(160, "cm", "laser_measure", "kts_hoang"),
};

/**
 * Fixture: Unsafe low mattress height (36 cm) causing difficulty standing up,
 * while total headboard height is 75 cm.
 */
export const UNSAFE_LOW_BED: BedDimensionsProvenance = {
  bedSurfaceHeightCm: createMeasured(
    36,
    "cm",
    "tape_measure",
    "caregiver_lan",
    1.0,
    "survey-bed-height-002"
  ),
  totalBedHeightCm: createMeasured(
    75,
    "cm",
    "tape_measure",
    "caregiver_lan",
    1.0,
    "survey-bed-height-002"
  ),
  lengthCm: createMeasured(200, "cm", "tape_measure", "caregiver_lan"),
  widthCm: createMeasured(140, "cm", "tape_measure", "caregiver_lan"),
};

/**
 * Fixture: Lighting comparison demonstrating physical Lux vs Three.js scene intensity.
 */
export const LIGHTING_PROVENANCE_FIXTURE = {
  // Real physical night lighting measured by calibrated meter: 35 Lux (Dim, potential hazard)
  physicalNightLux: createMeasured(
    35,
    "lux",
    "testo_luxmeter_540",
    "kts_hoang",
    2.0,
    "lux-audit-night-01"
  ),
  // Three.js renderer light intensity: 1.5 (Arbitrary shader unit, NOT physical Lux!)
  threeJsRenderIntensity: createSimulated(
    1.5,
    "ratio",
    "scenario-dollhouse-01",
    "threejs_point_light_intensity"
  ),
  // Unmeasured daytime lux in unvisited storage closet
  unmeasuredClosetLux: createUnknown(
    "lux",
    "Room locked during survey; lux meter could not be placed."
  ),
};

/**
 * Fixture: Slip resistance proving unknown != non-slippery.
 */
export const FLOOR_SLIP_PROVENANCE_FIXTURE = {
  // Case A: Bathroom floor with unknown slip coefficient
  unassessedBathroomTile: {
    material: "CERAMIC_TILE",
    isSlipResistant: createUnknown<boolean>(
      "boolean",
      "No Pendulum Test or resident interview conducted yet."
    ),
    isWet: createMeasured(true, "boolean", "visual_inspection", "kts_hoang"),
  },
  // Case B: Verified slip-resistant vinyl floor with R10 rating
  verifiedAntiSlipFloor: {
    material: "NON_SLIP_VINYL",
    isSlipResistant: createMeasured(
      true,
      "boolean",
      "pendulum_test_value_ptv_36_plus",
      "specialist_minh",
      undefined,
      "lab-test-cert-2026"
    ),
    isWet: createMeasured(false, "boolean", "tactile_inspection", "specialist_minh"),
  },
};

/**
 * Fixture: Legacy unmigrated room data needing backfill.
 */
export const LEGACY_UNMIGRATED_ROOM_STATE = {
  id: "legacy-room-001",
  name: "Phòng ngủ cũ chưa có nhãn",
  lightingLevel: 150, // Untyped number
  walkwayClearWidthM: 0.8, // Untyped number
  isSlipResistant: true, // Untyped boolean
};

