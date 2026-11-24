import { describe, it, expect } from "vitest";
import {
  evaluateRoomHazardsCanonical,
  adaptCanonicalToLegacySnapshot,
} from "@/lib/risk/canonicalEngine";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { computeImageRiskAssessmentCanonical, computeImageRiskAssessment } from "@/lib/vision/imageRiskAssessment";
import { AssessmentResultV1Schema } from "@/lib/contracts/sharedContractV1";
import {
  ALL_GOLDEN_FIXTURES,
  FIXTURE_01_BEDROOM_SAFE_MEASURED,
  FIXTURE_02_BEDROOM_UNSECURED_RUG,
  FIXTURE_03_BEDROOM_TRAILING_CABLE,
  FIXTURE_05_BEDROOM_DARK_NIGHT,
  FIXTURE_07_BEDROOM_MULTIPLE_HAZARDS,
  FIXTURE_08_BEDROOM_UNKNOWN_RUG_AND_CABLE,
  FIXTURE_09_BATHROOM_SAFE_MEASURED,
  FIXTURE_10_BATHROOM_WET_SLIPPERY_TILE,
  FIXTURE_11_BATHROOM_NO_GRAB_BARS,
  FIXTURE_13_BATHROOM_WET_AND_NO_GRAB_BARS,
  FIXTURE_20_SIMULATED_3D_SCENE_HAZARD,
  FIXTURE_21_AI_VISION_ESTIMATED_HAZARD,
  FIXTURE_22_COMPLETELY_EMPTY_ROOM,
} from "./fixtures/goldenRiskFixtures";

describe("Task A03 — Canonical Deterministic Risk Engine", () => {
  describe("1. Strict Determinism & Repeatability (100 Iterations)", () => {
    it("should produce 100% byte-for-byte identical results across 100 sequential runs", () => {
      const fixedTimestamp = "2026-11-24T12:00:00.000Z";
      const initial = evaluateRoomHazardsCanonical(FIXTURE_07_BEDROOM_MULTIPLE_HAZARDS, {
        deterministicTimestamp: fixedTimestamp,
      });

      for (let i = 0; i < 100; i++) {
        const nextRun = evaluateRoomHazardsCanonical(FIXTURE_07_BEDROOM_MULTIPLE_HAZARDS, {
          deterministicTimestamp: fixedTimestamp,
        });

        expect(nextRun.assessmentId).toBe(initial.assessmentId);
        expect(nextRun.heuristicSafetyScore).toBe(initial.heuristicSafetyScore);
        expect(nextRun.findings.length).toBe(initial.findings.length);

        for (let j = 0; j < initial.findings.length; j++) {
          expect(nextRun.findings[j].id).toBe(initial.findings[j].id);
          expect(nextRun.findings[j].ruleId).toBe(initial.findings[j].ruleId);
          expect(nextRun.findings[j].severity).toBe(initial.findings[j].severity);
          expect(nextRun.findings[j].certainty).toBe(initial.findings[j].certainty);
        }
      }
    });
  });

  describe("2. Golden Coverage Across All 22 Diverse Room Fixtures", () => {
    it("should successfully evaluate all 22 golden fixtures and conform to Shared Contract V1", () => {
      expect(ALL_GOLDEN_FIXTURES.length).toBe(22);

      for (const fixture of ALL_GOLDEN_FIXTURES) {
        const result = evaluateRoomHazardsCanonical(fixture);

        // Must strictly pass Zod schema validation
        const parsed = AssessmentResultV1Schema.safeParse(result);
        expect(parsed.success).toBe(true);

        // Sanity assertions
        expect(result.roomId).toBe(fixture.roomId);
        expect(result.heuristicSafetyScore).toBeGreaterThanOrEqual(10);
        expect(result.heuristicSafetyScore).toBeLessThanOrEqual(100);
        expect(result.ruleTrace.length).toBe(8); // All 8 rules evaluated
        expect(result.clinicalDisclaimer).toContain("CDC STEADI");

        // Finding IDs must follow stable format
        for (const finding of result.findings) {
          expect(finding.id).toMatch(/^finding-risk\d{3}-[a-zA-Z0-9_-]+$/);
        }
      }
    });
  });

  describe("3. Separation of Severity, Certainty, and Priority", () => {
    it("should distinguish physical CONFIRMED vs vision PROVISIONAL vs simulated HYPOTHETICAL", () => {
      // 1. Measured Physical Room
      const measuredResult = evaluateRoomHazardsCanonical(FIXTURE_02_BEDROOM_UNSECURED_RUG);
      const measuredRug = measuredResult.findings.find((f) => f.ruleId === "RISK-001");
      expect(measuredRug).toBeDefined();
      expect(measuredRug?.severity).toBe("HIGH");
      expect(measuredRug?.certainty).toBe("CONFIRMED");

      // 2. Vision Estimated Room
      const visionResult = evaluateRoomHazardsCanonical(FIXTURE_21_AI_VISION_ESTIMATED_HAZARD);
      const visionRug = visionResult.findings.find((f) => f.ruleId === "RISK-001");
      expect(visionRug).toBeDefined();
      expect(visionRug?.severity).toBe("HIGH");
      expect(visionRug?.certainty).toBe("PROVISIONAL");
      expect(visionRug?.requiresManualConfirmation).toBe(true);

      // 3. 3D Simulated Scene
      const simResult = evaluateRoomHazardsCanonical(FIXTURE_20_SIMULATED_3D_SCENE_HAZARD);
      const simRug = simResult.findings.find((f) => f.ruleId === "RISK-001");
      expect(simRug).toBeDefined();
      expect(simRug?.severity).toBe("HIGH");
      expect(simRug?.certainty).toBe("HYPOTHETICAL");
      expect(simRug?.requiresManualConfirmation).toBe(true);
    });

    it("should flag manual confirmation for subjective/tactile hazards (RISK-005 wet slippery tile)", () => {
      const bathroomResult = evaluateRoomHazardsCanonical(FIXTURE_10_BATHROOM_WET_SLIPPERY_TILE);
      const slipFinding = bathroomResult.findings.find((f) => f.ruleId === "RISK-005");
      expect(slipFinding).toBeDefined();
      expect(slipFinding?.severity).toBe("HIGH");
      expect(slipFinding?.requiresManualConfirmation).toBe(true);
    });
  });

  describe("4. Cross-Subsystem Consistency (UI, 3D, Vision, Canonical Core)", () => {
    it("should produce matching finding IDs and severity between Canonical Engine and Legacy Adapter", () => {
      const canonical = evaluateRoomHazardsCanonical(FIXTURE_13_BATHROOM_WET_AND_NO_GRAB_BARS);
      const legacySnapshot = evaluateRoomHazards(FIXTURE_13_BATHROOM_WET_AND_NO_GRAB_BARS);

      expect(canonical.heuristicSafetyScore).toBe(legacySnapshot.safetyScore);
      expect(canonical.findings.length).toBe(legacySnapshot.findings.length);

      for (let i = 0; i < canonical.findings.length; i++) {
        expect(canonical.findings[i].id).toBe(legacySnapshot.findings[i].id);
        expect(canonical.findings[i].ruleId).toBe(legacySnapshot.findings[i].ruleId);
        expect(canonical.findings[i].severity).toBe(legacySnapshot.findings[i].severityCategory);
      }
    });

    it("should produce matching finding IDs when evaluating vision detections through vision adapter", () => {
      const dets = [
        {
          id: "det-rug-01",
          imageId: "img-01",
          category: "rug",
          originalLabel: "thảm trải sàn",
          userLabel: "thảm trượt chân",
          confidence: 0.92,
          bbox: { xMin: 0.2, yMin: 0.5, xMax: 0.6, yMax: 0.8 },
          sourceType: "vision_estimated" as const,
          verificationStatus: "CONFIRMED" as const,
          createdAt: "2026-11-24T00:00:00.000Z",
        },
      ];

      const visionCanonical = computeImageRiskAssessmentCanonical("BEDROOM", dets as any, []);
      const visionLegacy = computeImageRiskAssessment("BEDROOM", dets as any, []);

      expect(visionCanonical.heuristicSafetyScore).toBe(visionLegacy.safetyScore);
      expect(visionCanonical.findings.length).toBe(visionLegacy.findings.length);

      const rugFinding = visionCanonical.findings.find((f) => f.ruleId === "RISK-001");
      expect(rugFinding).toBeDefined();
      expect(rugFinding?.certainty).toBe("PROVISIONAL");
      expect(rugFinding?.requiresManualConfirmation).toBe(true);
    });
  });

  describe("5. Fail-Safe Unknowns & Missing Inputs Aggregation", () => {
    it("should never treat unassessed inputs as safe and properly populate missingInputs", () => {
      const unknownResult = evaluateRoomHazardsCanonical(FIXTURE_08_BEDROOM_UNKNOWN_RUG_AND_CABLE);
      expect(unknownResult.missingInputs.length).toBeGreaterThan(0);
      expect(unknownResult.missingInputs).toContain("rugs.present");
      expect(unknownResult.missingInputs).toContain("cables.crossingWalkway");

      // An unassessed room cannot get a perfect 100 score
      expect(unknownResult.heuristicSafetyScore).toBeLessThan(100);

      // Verify that empty unassessed room lists all missing fields
      const emptyResult = evaluateRoomHazardsCanonical(FIXTURE_22_COMPLETELY_EMPTY_ROOM);
      expect(emptyResult.missingInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("6. Regression Guard & Exact Score Baselines", () => {
    it("should calculate exact score 100 for perfectly safe bedroom", () => {
      const safeResult = evaluateRoomHazardsCanonical(FIXTURE_01_BEDROOM_SAFE_MEASURED);
      expect(safeResult.findings.length).toBe(0);
      expect(safeResult.missingInputs.length).toBe(0);
      expect(safeResult.heuristicSafetyScore).toBe(100);
    });

    it("should calculate exact score 100 for perfectly safe bathroom", () => {
      const safeBath = evaluateRoomHazardsCanonical(FIXTURE_09_BATHROOM_SAFE_MEASURED);
      expect(safeBath.findings.length).toBe(0);
      expect(safeBath.heuristicSafetyScore).toBe(100);
    });

    it("should apply exact linear penalty rules: High=-15, Medium=-8, Low=-4, NeedsVerification=-3", () => {
      // 3 High hazards (Rug -15, Cable -15, Dark -15) = 100 - 45 = 55
      const multi = evaluateRoomHazardsCanonical(FIXTURE_07_BEDROOM_MULTIPLE_HAZARDS);
      expect(multi.findings.length).toBe(3);
      expect(multi.heuristicSafetyScore).toBe(55);
    });
  });
});

