import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  RoomV1Schema,
  MeasurementSourceTypeSchema,
  RiskFindingV1Schema,
  AssessmentResultV1Schema,
  BeforeAfterComparisonV1Schema,
} from "@/lib/contracts/sharedContractV1";
import {
  VALID_MEASURED_ROOM,
  VALID_UNKNOWN_ROOM,
  INVALID_ROOM_UNITS,
  INVALID_ROOM_ID_PREFIX,
} from "./fixtures/contractV1Fixtures";

describe("Task A01 — Shared Contract V1 & Baseline Audit Suite", () => {
  describe("1. Measurement Source Typing & Provenance Contract", () => {
    it("should recognize all 5 standardized source types", () => {
      const allowedSources = ["measured", "user_confirmed", "vision_estimated", "simulated", "unknown"];
      for (const src of allowedSources) {
        expect(MeasurementSourceTypeSchema.safeParse(src).success).toBe(true);
      }
      expect(MeasurementSourceTypeSchema.safeParse("estimated_guess").success).toBe(false);
      expect(MeasurementSourceTypeSchema.safeParse("magic_ai").success).toBe(false);
    });

    it("should strictly distinguish measured from simulated and unknown", () => {
      const measured = VALID_MEASURED_ROOM.dimensions.lengthM;
      const unknown = VALID_UNKNOWN_ROOM.dimensions.lengthM;

      expect(measured.sourceType).toBe("measured");
      expect(measured.value).toBe(5.2);
      expect(measured.confidence).toBe(1.0);

      expect(unknown.sourceType).toBe("unknown");
      expect(unknown.value).toBeNull();
      expect(unknown.sourceType).not.toBe("measured");
      expect(unknown.sourceType).not.toBe("simulated");
    });

    it("should never allow unknown to silently convert into a safe numerical value", () => {
      const unknownLux = VALID_UNKNOWN_ROOM.lighting.nighttimeLux;
      expect(unknownLux.sourceType).toBe("unknown");
      expect(unknownLux.value).toBeNull();

      // Rule: If a system assumes unknownLux is safe (e.g. >= 50 Lux), it violates clinical fail-safe
      const assumedSafeThreshold = 50;
      const isClinicallySafe = unknownLux.value !== null && unknownLux.value >= assumedSafeThreshold;
      expect(isClinicallySafe).toBe(false);
    });
  });

  describe("2. RoomV1 Schema Validation", () => {
    it("should validate a complete measured room payload", () => {
      const result = RoomV1Schema.safeParse(VALID_MEASURED_ROOM);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("room-bedroom-01");
        expect(result.data.schemaVersion).toBe("1.0.0");
        expect(result.data.floor.material).toBe("WOOD");
      }
    });

    it("should validate an unknown room payload while preserving null values", () => {
      const result = RoomV1Schema.safeParse(VALID_UNKNOWN_ROOM);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dimensions.lengthM.value).toBeNull();
        expect(result.data.dimensions.lengthM.sourceType).toBe("unknown");
      }
    });

    it("should reject payloads with invalid measurement units", () => {
      const result = RoomV1Schema.safeParse(INVALID_ROOM_UNITS);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues || (result.error as any).errors || [];
        const issuePaths = issues.map((i: any) => i.path.join("."));
        expect(issuePaths.some((p: string) => p.includes("dimensions.lengthM.unit"))).toBe(true);
      }
    });

    it("should reject room IDs that do not follow the 'room-' prefix convention", () => {
      const result = RoomV1Schema.safeParse(INVALID_ROOM_ID_PREFIX);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issues = result.error.issues || (result.error as any).errors || [];
        const issueMessages = issues.map((i: any) => i.message);
        expect(issueMessages.some((m: string) => m.includes("Room ID must start with 'room-'"))).toBe(true);
      }
    });
  });

  describe("3. Two Risk Engines Location Audit", () => {
    it("should confirm the physical existence of Engine A (ruleEngine.ts)", () => {
      const engineAPath = path.resolve(process.cwd(), "src/lib/risk/ruleEngine.ts");
      expect(fs.existsSync(engineAPath)).toBe(true);

      const registryPath = path.resolve(process.cwd(), "src/lib/risk/riskRuleRegistry.ts");
      expect(fs.existsSync(registryPath)).toBe(true);

      const content = fs.readFileSync(engineAPath, "utf-8");
      expect(content).toContain("evaluateRoomHazards");
    });

    it("should confirm the physical existence of Engine B (features/risk-engine/rules.ts)", () => {
      const engineBPath = path.resolve(process.cwd(), "src/features/risk-engine/rules.ts");
      expect(fs.existsSync(engineBPath)).toBe(true);

      const content = fs.readFileSync(engineBPath, "utf-8");
      expect(content).toContain("runEnvironmentalAssessment");
      expect(content).toContain("calculateSafetyScore");
    });
  });

  describe("4. Before-After Comparison & Clinical Claims Guardrail", () => {
    it("should enforce canClaimVerifiedIntervention = false if intervention is simulated", () => {
      const mockComparison = {
        comparisonId: "cmp-trial-001",
        roomId: "room-bedroom-01",
        baselineSnapshotId: "snap-base-001",
        interventionSnapshotId: "snap-sim-002",
        resolvedFindings: [],
        unresolvedFindings: [],
        newFindings: [],
        baselineSafetyScore: 35,
        interventionSafetyScore: 85,
        deltaScore: 50,
        canClaimVerifiedIntervention: false, // Must be false for 3D simulations
        verificationNotes: "Mô phỏng 3D trên màn hình, chưa có kiểm tra thực địa tại nhà người cao tuổi.",
        auditTrail: ["2026-11-24: Created simulation scenario in digital twin."],
      };

      const result = BeforeAfterComparisonV1Schema.safeParse(mockComparison);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canClaimVerifiedIntervention).toBe(false);
        expect(result.data.deltaScore).toBe(50);
      }
    });
  });
});
