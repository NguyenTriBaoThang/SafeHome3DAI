import { describe, it, expect } from "vitest";
import {
  BedDimensionsProvenanceSchema,
  ProvenanceRecordSchema,
  computeDataQuality,
  PROVENANCE_SOURCE_HIERARCHY,
  createMeasured,
  createUserConfirmed,
  createVisionEstimated,
  createSimulated,
  createUnknown,
} from "@/lib/provenance/measurementProvenance";
import {
  CLINICALLY_SAFE_BED,
  UNSAFE_LOW_BED,
  LIGHTING_PROVENANCE_FIXTURE,
  FLOOR_SLIP_PROVENANCE_FIXTURE,
  LEGACY_UNMIGRATED_ROOM_STATE,
} from "./fixtures/measurementProvenanceFixtures";
import { migrateRoomStateToProvenance } from "../scripts/migrations/backfill_measurement_provenance";

describe("Task A02 — Measurement Provenance & Lineage Engine", () => {
  describe("1. Bed Dimensions Distinction: bedSurfaceHeightCm vs totalBedHeightCm", () => {
    it("should strictly validate both bedSurfaceHeightCm and totalBedHeightCm under BedDimensionsProvenanceSchema", () => {
      const parsedSafeBed = BedDimensionsProvenanceSchema.safeParse(CLINICALLY_SAFE_BED);
      expect(parsedSafeBed.success).toBe(true);

      if (parsedSafeBed.success) {
        expect(parsedSafeBed.data.bedSurfaceHeightCm.value).toBe(48);
        expect(parsedSafeBed.data.bedSurfaceHeightCm.unit).toBe("cm");
        expect(parsedSafeBed.data.bedSurfaceHeightCm.sourceType).toBe("measured");

        expect(parsedSafeBed.data.totalBedHeightCm.value).toBe(70);
        expect(parsedSafeBed.data.totalBedHeightCm.unit).toBe("cm");
        expect(parsedSafeBed.data.totalBedHeightCm.sourceType).toBe("measured");
      }
    });

    it("should correctly identify unsafe low bed mattress height (36 cm) vs headboard height (75 cm)", () => {
      const parsedUnsafeBed = BedDimensionsProvenanceSchema.safeParse(UNSAFE_LOW_BED);
      expect(parsedUnsafeBed.success).toBe(true);

      const surfaceHeight = UNSAFE_LOW_BED.bedSurfaceHeightCm.value as number;
      const headboardHeight = UNSAFE_LOW_BED.totalBedHeightCm.value as number;

      // Clinical threshold (CDC STEADI / AGS-BGS guidelines): 45cm <= safe height <= 55cm
      const isClinicallySafeSurface = surfaceHeight >= 45 && surfaceHeight <= 55;
      expect(isClinicallySafeSurface).toBe(false); // 36 cm is too low!

      // Conflation trap: If an algorithm mistakenly evaluates headboard height (75cm), it misses the danger!
      expect(headboardHeight).toBe(75);
      expect(surfaceHeight).not.toBe(headboardHeight);
    });

    it("should reject bed dimensions when unit is not 'cm'", () => {
      const invalidBed = {
        ...CLINICALLY_SAFE_BED,
        bedSurfaceHeightCm: {
          ...CLINICALLY_SAFE_BED.bedSurfaceHeightCm,
          unit: "m", // invalid: schema requires 'cm'
        },
      };

      const result = BedDimensionsProvenanceSchema.safeParse(invalidBed);
      expect(result.success).toBe(false);
    });
  });

  describe("2. Physical Lux vs Three.js Scene Intensity Distinction", () => {
    it("should distinguish physical illuminance in Lux from Three.js shader intensity multiplier", () => {
      const { physicalNightLux, threeJsRenderIntensity, unmeasuredClosetLux } =
        LIGHTING_PROVENANCE_FIXTURE;

      // Physical lux from calibrated device
      expect(physicalNightLux.unit).toBe("lux");
      expect(physicalNightLux.sourceType).toBe("measured");
      expect(physicalNightLux.value).toBe(35);
      expect(physicalNightLux.uncertainty).toBe(2.0);

      // Three.js renderer intensity multiplier
      expect(threeJsRenderIntensity.unit).toBe("ratio");
      expect(threeJsRenderIntensity.sourceType).toBe("simulated");
      expect(threeJsRenderIntensity.value).toBe(1.5);

      // Unmeasured room
      expect(unmeasuredClosetLux.unit).toBe("lux");
      expect(unmeasuredClosetLux.sourceType).toBe("unknown");
      expect(unmeasuredClosetLux.value).toBeNull();

      // Ensure 3D intensity is never falsely treated as physical Lux
      expect(threeJsRenderIntensity.unit).not.toBe(physicalNightLux.unit);
    });
  });

  describe("3. Fail-Safe Unknowns: Missing Measurements Must Not Assume Safe Defaults", () => {
    it("should never treat unknown slip resistance as safe (isSlipResistant === true)", () => {
      const { unassessedBathroomTile, verifiedAntiSlipFloor } =
        FLOOR_SLIP_PROVENANCE_FIXTURE;

      expect(unassessedBathroomTile.isSlipResistant.sourceType).toBe("unknown");
      expect(unassessedBathroomTile.isSlipResistant.value).toBeNull();

      // Safety check: A naive boolean cast `Boolean(unassessedBathroomTile.isSlipResistant.value)` is false
      // But clinical safety rule: Unknown cannot be confirmed safe or verified
      const isConfirmedSlipResistant =
        unassessedBathroomTile.isSlipResistant.sourceType === "measured" &&
        unassessedBathroomTile.isSlipResistant.value === true;
      expect(isConfirmedSlipResistant).toBe(false);

      // Verified floor
      expect(verifiedAntiSlipFloor.isSlipResistant.sourceType).toBe("measured");
      expect(verifiedAntiSlipFloor.isSlipResistant.value).toBe(true);
      expect(verifiedAntiSlipFloor.isSlipResistant.evidenceId).toBe("lab-test-cert-2026");
    });
  });

  describe("4. Data Quality Aggregation & Trust Score Engine", () => {
    it("should accurately calculate quality metrics, counts, trust score, and flag missing critical inputs", () => {
      const records = [
        {
          fieldName: "bedSurfaceHeightCm",
          record: CLINICALLY_SAFE_BED.bedSurfaceHeightCm,
          isCritical: true,
        },
        {
          fieldName: "totalBedHeightCm",
          record: CLINICALLY_SAFE_BED.totalBedHeightCm,
          isCritical: false,
        },
        {
          fieldName: "nighttimeLux",
          record: createUnknown("lux", "Resident has not taken night lux photo/reading"),
          isCritical: true,
        },
        {
          fieldName: "walkwayClearWidthM",
          record: createVisionEstimated(0.85, "m", 0.78, "ai_vision_depth_heuristic"),
          isCritical: true,
        },
        {
          fieldName: "floorFrictionMu",
          record: createSimulated(0.4, "ratio", "scenario_01"),
          isCritical: false,
        },
      ];

      const quality = computeDataQuality(records);

      expect(quality.totalMeasurements).toBe(5);
      expect(quality.measuredCount).toBe(2);
      expect(quality.unknownCount).toBe(1);
      expect(quality.visionEstimatedCount).toBe(1);
      expect(quality.simulatedCount).toBe(1);
      expect(quality.userConfirmedCount).toBe(0);

      // Missing critical input must explicitly report 'nighttimeLux'
      expect(quality.missingCriticalInputs).toContain("nighttimeLux");
      expect(quality.missingCriticalInputs).not.toContain("bedSurfaceHeightCm");

      // Trust score should reflect weighted proportion
      expect(quality.trustScore).toBeGreaterThanOrEqual(0);
      expect(quality.trustScore).toBeLessThanOrEqual(100);
      // Measured (2 * 1.0) + Vision (1 * 0.4) + Sim (1 * 0.2) = 2.6 / 5 = 0.52 => 52%
      expect(quality.trustScore).toBe(52);
    });

    it("should enforce clinical hierarchy ranking across source types", () => {
      expect(PROVENANCE_SOURCE_HIERARCHY.measured.level).toBe(1);
      expect(PROVENANCE_SOURCE_HIERARCHY.user_confirmed.level).toBe(2);
      expect(PROVENANCE_SOURCE_HIERARCHY.vision_estimated.level).toBe(3);
      expect(PROVENANCE_SOURCE_HIERARCHY.simulated.level).toBe(4);
      expect(PROVENANCE_SOURCE_HIERARCHY.unknown.level).toBe(5);

      expect(PROVENANCE_SOURCE_HIERARCHY.simulated.allowedClaims).toContain("Cannot claim physical reduction");
      expect(PROVENANCE_SOURCE_HIERARCHY.unknown.allowedClaims).toContain("cannot assume safe");
    });
  });

  describe("5. Migration & Backfill Engine (migrateRoomStateToProvenance)", () => {
    it("should backfill unverified legacy data with isLegacyAssumed: true and simulated source type", () => {
      const { migrated, provenanceAudit } = migrateRoomStateToProvenance(
        LEGACY_UNMIGRATED_ROOM_STATE,
        false
      );

      expect(migrated.hasLegacyAssumptions).toBe(true);
      expect(provenanceAudit.lightingLevel.isLegacyAssumed).toBe(true);
      expect(provenanceAudit.lightingLevel.sourceType).toBe("simulated");
      expect(provenanceAudit.lightingLevel.value).toBe(150);

      // Verify walkwayClearWidthM is legacy assumed and simulated
      expect(provenanceAudit.walkwayClearWidthM.isLegacyAssumed).toBe(true);
      expect(provenanceAudit.walkwayClearWidthM.sourceType).toBe("simulated");

      // Verify that unverified data was NEVER elevated to "measured"
      expect(provenanceAudit.lightingLevel.sourceType).not.toBe("measured");
      expect(provenanceAudit.isSlipResistant.sourceType).not.toBe("measured");
    });

    it("should assign unknown provenance when legacy room properties are completely missing", () => {
      const emptyLegacyRoom = { id: "empty-room-999" };
      const { provenanceAudit } = migrateRoomStateToProvenance(emptyLegacyRoom, true);

      expect(provenanceAudit.lightingLevel.sourceType).toBe("unknown");
      expect(provenanceAudit.lightingLevel.value).toBeNull();
      expect(provenanceAudit.walkwayClearWidthM.sourceType).toBe("unknown");
      expect(provenanceAudit.isSlipResistant.sourceType).toBe("unknown");
    });
  });
});

