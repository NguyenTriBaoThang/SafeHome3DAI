import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  evaluateRoomHazardsCanonical,
} from "@/lib/risk/canonicalEngine";
import {
  getRiskThresholdConfig,
  calculateEnvironmentalBarrierScore,
  THRESHOLD_CONFIG_V2026_1,
} from "@/lib/risk/thresholdConfig";
import {
  DEFAULT_CLINICAL_REVIEW_REGISTRY,
  ExpertReviewStatusSchema,
} from "@/lib/risk/clinicalReviewTypes";
import { AssessmentInput } from "@/lib/risk/types";
import {
  FIXTURE_01_BEDROOM_SAFE_MEASURED,
  FIXTURE_09_BATHROOM_SAFE_MEASURED,
} from "./fixtures/goldenRiskFixtures";

describe("Task A04 — Clinical Threshold Review & Expert Validation Workflow", () => {
  describe("1. Risk Rule Matrix CSV & Clinical Registry Audit", () => {
    it("should provide an auditable risk_rule_matrix.csv containing all 8 rules and required clinical metadata", () => {
      const csvPath = path.resolve(process.cwd(), "docs/clinical/risk_rule_matrix.csv");
      expect(fs.existsSync(csvPath)).toBe(true);

      const content = fs.readFileSync(csvPath, "utf-8");
      const lines = content.trim().split("\n");

      // Verify header row
      const header = lines[0];
      expect(header).toContain("rule_id");
      expect(header).toContain("clinical_source");
      expect(header).toContain("threshold_standard");
      expect(header).toContain("expert_review_status");
      expect(header).toContain("last_reviewed");
      expect(header).toContain("biomechanical_mechanism");
      expect(header).toContain("transparent_label_vn");

      // Verify all 8 rules exist
      for (let i = 1; i <= 8; i++) {
        const ruleId = `RISK-00${i}`;
        const match = lines.some((l) => l.startsWith(ruleId));
        expect(match).toBe(true);
      }
    });

    it("should never falsely claim EXPERT_APPROVED when formal clinical review is pending", () => {
      // In Task A04 baseline, all rules must be REFERENCE_ONLY or PROPOSED_INTERNAL
      for (const [ruleId, review] of Object.entries(DEFAULT_CLINICAL_REVIEW_REGISTRY)) {
        expect(review.status).not.toBe("EXPERT_APPROVED");
        expect(["REFERENCE_ONLY", "PROPOSED_INTERNAL", "PENDING_REVIEW"]).toContain(review.status);
        expect(ExpertReviewStatusSchema.safeParse(review.status).success).toBe(true);
      }
    });
  });

  describe("2. Every Rule (RISK-001..008) has >=1 Positive, >=1 Negative, >=1 Unknown Test", () => {
    // -------------------------------------------------------------------------
    // RISK-001: Loose Rug
    // -------------------------------------------------------------------------
    describe("RISK-001: Unsecured Rug", () => {
      it("Positive: detects loose curled rug in bedroom", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          rugs: {
            present: true,
            items: [{ id: "r1", name: "Thảm", location: "Giường", isSecured: false, edgesCurled: true, inWalkway: true }],
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-001");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("HIGH");
      });

      it("Negative: no hazard when rug is fully secured or absent", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          rugs: { present: false, items: [] },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-001")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when rug presence is unknown", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          rugs: { present: null, items: [] },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("rugs.present");
      });
    });

    // -------------------------------------------------------------------------
    // RISK-002: Trailing Cables
    // -------------------------------------------------------------------------
    describe("RISK-002: Trailing Electrical Cables", () => {
      it("Positive: detects loose cable crossing walkway", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          cables: {
            crossingWalkway: true,
            items: [{ id: "c1", name: "Dây sạc", location: "Lối đi", crossesWalkway: true, hasCordCover: false, hasSkirtingTrunking: false }],
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-002");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("HIGH");
      });

      it("Negative: no hazard when cables are protected or absent", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          cables: { crossingWalkway: false, items: [] },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-002")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when cable presence is unknown", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          cables: { crossingWalkway: null, items: [] },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("cables.crossingWalkway");
      });
    });

    // -------------------------------------------------------------------------
    // RISK-003: Walkway Clearance Obstruction
    // -------------------------------------------------------------------------
    describe("RISK-003: Walkway Clearance Obstruction", () => {
      it("Positive: detects narrow walkway width 0.65m (< 0.85m)", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          obstacles: {
            present: true,
            walkwayClearWidthM: 0.65,
            items: [{ id: "o1", name: "Thùng đồ", location: "Lối đi", obstructsWalkway: true, clearanceWidthM: 0.65 }],
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-003");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("HIGH");
      });

      it("Negative: safe clearance width 1.2m", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          obstacles: { present: false, walkwayClearWidthM: 1.2, items: [] },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-003")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when obstacles not surveyed", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          obstacles: { present: null, walkwayClearWidthM: undefined as any, items: [] },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("obstacles.walkwayClearWidthM");
      });
    });

    // -------------------------------------------------------------------------
    // RISK-004: Inadequate Night Lighting
    // -------------------------------------------------------------------------
    describe("RISK-004: Night Lighting", () => {
      it("Positive: detects dark night lighting (25 Lux < 50 Lux) without night light", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          lighting: {
            daytimeLux: 150,
            nighttimeLux: 25,
            nightLightPresent: false,
            motionSensorPresent: false,
            pathLightToBathroom: false,
            switchReachableFromEntrance: true,
            switchReachableFromBed: false,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-004");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("HIGH");
      });

      it("Negative: adequate night lighting (80 Lux with night light)", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          lighting: {
            daytimeLux: 250,
            nighttimeLux: 80,
            nightLightPresent: true,
            motionSensorPresent: true,
            pathLightToBathroom: true,
            switchReachableFromEntrance: true,
            switchReachableFromBed: true,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-004")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when night lighting is unmeasured", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          lighting: {
            daytimeLux: 150,
            nighttimeLux: undefined as any,
            nightLightPresent: undefined as any,
            motionSensorPresent: false,
            pathLightToBathroom: false,
            switchReachableFromEntrance: true,
            switchReachableFromBed: true,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("lighting.nightLightPresent");
      });
    });

    // -------------------------------------------------------------------------
    // RISK-005: Slippery Bathroom Floor
    // -------------------------------------------------------------------------
    describe("RISK-005: Slippery Bathroom Floor Surface", () => {
      it("Positive: detects wet slippery tile without anti-slip mat in bathroom", () => {
        const input: AssessmentInput = {
          ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
          floor: {
            material: "Gạch men bóng",
            isWet: true,
            isSlipResistant: false,
            hasNonSlipMat: false,
            levelDifferenceCm: 0,
            thresholdStepPresent: false,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-005");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("HIGH");
      });

      it("Negative: safe when floor is slip resistant (R10) with anti-slip mat", () => {
        const input = FIXTURE_09_BATHROOM_SAFE_MEASURED;
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-005")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when wet condition is undefined", () => {
        const input: AssessmentInput = {
          ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
          floor: {
            ...FIXTURE_09_BATHROOM_SAFE_MEASURED.floor,
            isWet: undefined as any,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("floor.isSlipResistant");
      });
    });

    // -------------------------------------------------------------------------
    // RISK-006: Missing Bathroom Grab Bars
    // -------------------------------------------------------------------------
    describe("RISK-006: Bathroom Grab Bars", () => {
      it("Positive: detects bathroom lacking grab bars", () => {
        const input: AssessmentInput = {
          ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
          grabBars: {
            present: false,
            count: 0,
            toiletGrabBarPresent: false,
            showerGrabBarPresent: false,
            inspectedSecure: false,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-006");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("HIGH");
      });

      it("Negative: safe when both toilet and shower grab bars exist", () => {
        const input = FIXTURE_09_BATHROOM_SAFE_MEASURED;
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-006")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when grab bars unmeasured", () => {
        const input: AssessmentInput = {
          ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
          grabBars: {
            present: null as any,
            count: undefined as any,
            toiletGrabBarPresent: false,
            showerGrabBarPresent: false,
            inspectedSecure: false,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("grabBars.count");
      });
    });

    // -------------------------------------------------------------------------
    // RISK-007: Threshold Step & Bed Heights
    // -------------------------------------------------------------------------
    describe("RISK-007: Threshold Step & Bed Heights", () => {
      it("Positive: detects high threshold step 4.0cm without ramp", () => {
        const input: AssessmentInput = {
          ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
          floor: {
            ...FIXTURE_09_BATHROOM_SAFE_MEASURED.floor,
            levelDifferenceCm: 4.0,
            thresholdStepPresent: true,
            hasThresholdRamp: false,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-007");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("HIGH"); // >= 3.5cm triggers HIGH
      });

      it("Negative: safe when threshold has ramp or level diff <= 1.5cm", () => {
        const input: AssessmentInput = {
          ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
          floor: {
            ...FIXTURE_09_BATHROOM_SAFE_MEASURED.floor,
            levelDifferenceCm: 0,
            thresholdStepPresent: false,
            hasThresholdRamp: true,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-007")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when threshold height is undefined", () => {
        const input: AssessmentInput = {
          ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
          floor: {
            ...FIXTURE_09_BATHROOM_SAFE_MEASURED.floor,
            levelDifferenceCm: undefined as any,
            thresholdStepPresent: undefined as any,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("floor.levelDifferenceCm");
      });
    });

    // -------------------------------------------------------------------------
    // RISK-008: Bedside Accessibility
    // -------------------------------------------------------------------------
    describe("RISK-008: Bedside Accessibility & Controls", () => {
      it("Positive: detects light switch unreachable from bed", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          accessibility: {
            lightSwitchReachableFromBed: false,
            essentialItemsReachableFromBed: false,
            emergencyCallReachable: false,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        const f = res.findings.find((x) => x.ruleId === "RISK-008");
        expect(f).toBeDefined();
        expect(f?.severity).toBe("MEDIUM");
      });

      it("Negative: safe when switch and items reachable from bed", () => {
        const input = FIXTURE_01_BEDROOM_SAFE_MEASURED;
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.findings.find((x) => x.ruleId === "RISK-008")).toBeUndefined();
      });

      it("Unknown: enters NEEDS_VERIFICATION when accessibility is unmeasured", () => {
        const input: AssessmentInput = {
          ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
          accessibility: {
            lightSwitchReachableFromBed: undefined as any,
            essentialItemsReachableFromBed: undefined as any,
            emergencyCallReachable: false,
          },
        };
        const res = evaluateRoomHazardsCanonical(input);
        expect(res.missingInputs).toContain("accessibility.lightSwitchReachableFromBed");
      });
    });
  });

  describe("3. Adversarial Counter-Examples (Y sinh & Thị giác AI)", () => {
    it("Counter-Example 1: Flat rug with unknown adhesion must NOT assume safe", () => {
      // Rug appears flat (edgesCurled: false), but isSecured is false (no tape / no rubber backing)
      const input: AssessmentInput = {
        ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
        rugs: {
          present: true,
          items: [
            {
              id: "flat-rug-01",
              name: "Thảm nỉ phẳng lì",
              location: "Lối đi",
              isSecured: false, // NOT taped
              edgesCurled: false, // Flat appearance!
              inWalkway: true,
            },
          ],
        },
      };

      const res = evaluateRoomHazardsCanonical(input);
      const rugFinding = res.findings.find((f) => f.ruleId === "RISK-001");
      expect(rugFinding).toBeDefined();
      expect(rugFinding?.severity).toBe("HIGH");
      // Must enforce manual confirmation because backing adhesion cannot be determined visually
      expect(rugFinding?.requiresManualConfirmation).toBe(true);
    });

    it("Counter-Example 2: Floor appears dry in 2D photo but real tile is wet/slippery", () => {
      // 2D AI vision might miss thin water film, but profile registers wetness
      const input: AssessmentInput = {
        ...FIXTURE_09_BATHROOM_SAFE_MEASURED,
        sourceType: "AI_VISION" as any,
        floor: {
          material: "Gạch men bóng",
          isWet: true,
          isSlipResistant: false,
          hasNonSlipMat: false,
          levelDifferenceCm: 0,
          thresholdStepPresent: false,
        },
      };

      const res = evaluateRoomHazardsCanonical(input);
      const slipFinding = res.findings.find((f) => f.ruleId === "RISK-005");
      expect(slipFinding).toBeDefined();
      expect(slipFinding?.certainty).toBe("PROVISIONAL");
      expect(slipFinding?.requiresManualConfirmation).toBe(true);
    });

    it("Counter-Example 3: Unmeasured Lux must NOT silently assume safe 150/200 Lux default", () => {
      const input: AssessmentInput = {
        ...FIXTURE_01_BEDROOM_SAFE_MEASURED,
        lighting: {
          daytimeLux: 150,
          nighttimeLux: undefined as any,
          nightLightPresent: undefined as any,
          motionSensorPresent: false,
          pathLightToBathroom: false,
          switchReachableFromEntrance: true,
          switchReachableFromBed: false,
        },
      };

      const res = evaluateRoomHazardsCanonical(input);
      expect(res.missingInputs).toContain("lighting.nightLightPresent");
      expect(res.heuristicSafetyScore).toBeLessThan(100);
    });
  });

  describe("4. Versioned Threshold Configuration & Explainable Score Breakdown", () => {
    it("should provide typed thresholds with units and clinical citations in config version 2026.1", () => {
      const config = getRiskThresholdConfig("2026.1");
      expect(config.configVersion).toBe("2026.1");
      expect(config.thresholds.nighttimeLuxMinBedroom.value).toBe(50);
      expect(config.thresholds.nighttimeLuxMinBedroom.unit).toBe("lux");
      expect(config.thresholds.walkwayClearWidthMinM.value).toBe(0.85);
      expect(config.thresholds.walkwayClearWidthMinM.unit).toBe("m");
      expect(config.thresholds.thresholdStepMaxCm.value).toBe(1.5);
      expect(config.thresholds.thresholdStepMaxCm.unit).toBe("cm");
      expect(config.thresholds.bedSurfaceHeightMinCm.value).toBe(45);
      expect(config.thresholds.bedSurfaceHeightMaxCm.value).toBe(55);
    });

    it("should calculate transparent environmental barrier score with exact penalty breakdown and disclaimer", () => {
      const result = calculateEnvironmentalBarrierScore({
        highHazardCount: 2, // -30
        mediumHazardCount: 1, // -8
        lowHazardCount: 0,
        needsVerificationCount: 2, // -6
      });

      // Score = 100 - 30 - 8 - 6 = 56
      expect(result.score).toBe(56);
      expect(result.breakdown.highPenaltyTotal).toBe(30);
      expect(result.breakdown.mediumPenaltyTotal).toBe(8);
      expect(result.breakdown.unverifiedPenaltyTotal).toBe(6);
      expect(result.formulaText).toContain("56/100");
      expect(result.transparencyNotice).toContain("KHÔNG cấu thành chẩn đoán y khoa");
    });
  });
});

