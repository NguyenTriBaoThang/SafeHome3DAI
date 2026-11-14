import { describe, it, expect } from "vitest";
import { ALL_VERSIONED_RULES, getRuleById } from "@/lib/risk/riskRuleRegistry";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { normalizeRoomAssessmentInput } from "@/lib/risk/inputAdapter";
import { explainPriorityDecision, PRIORITY_POLICIES } from "@/lib/risk/priorityEngine";
import { explainHazardFinding } from "@/lib/risk/explanationEngine";
import { compareAssessments } from "@/lib/risk/comparisonEngine";
import { AssessmentInput, AssessmentSnapshot } from "@/lib/risk/types";

describe("SafeHome Risk Intelligence — Unit Tests", () => {
  it("should have all 8 versioned rules registered with unique IDs", () => {
    expect(ALL_VERSIONED_RULES.length).toBe(8);
    const ruleIds = ALL_VERSIONED_RULES.map((r) => r.id);
    expect(new Set(ruleIds).size).toBe(8);
    expect(ruleIds).toContain("RISK-001");
    expect(ruleIds).toContain("RISK-002");
    expect(ruleIds).toContain("RISK-003");
    expect(ruleIds).toContain("RISK-004");
    expect(ruleIds).toContain("RISK-005");
    expect(ruleIds).toContain("RISK-006");
    expect(ruleIds).toContain("RISK-007");
    expect(ruleIds).toContain("RISK-008");
  });

  describe("Rule RISK-001: Unsecured Rug", () => {
    const rule = getRuleById("RISK-001")!;

    it("evaluates to NOT_DETECTED when no rugs are present", () => {
      const input: AssessmentInput = {
        roomId: "room-1",
        roomName: "Phòng ngủ",
        roomType: "BEDROOM",
        dimensions: { lengthM: 4, widthM: 3.5, heightM: 2.8, source: "SYSTEM_DEFAULT" },
        floor: { material: "Gỗ", isWet: false, isSlipResistant: true, levelDifferenceCm: 0, thresholdStepPresent: false },
        lighting: { daytimeLux: 200, nighttimeLux: 100, nightLightPresent: true, motionSensorPresent: false, pathLightToBathroom: true, switchReachableFromEntrance: true, switchReachableFromBed: true },
        rugs: { present: false, items: [] },
        cables: { crossingWalkway: false, items: [] },
        obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
        grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
        accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: false },
        sourceType: "SURVEY_PROFILE",
      };

      const result = rule.evaluate(input);
      expect(result.state).toBe("NOT_DETECTED");
      expect(result.finding).toBeNull();
    });

    it("evaluates to DETECTED with HIGH priority when unsecured rug is in walkway", () => {
      const input: AssessmentInput = {
        roomId: "room-1",
        roomName: "Phòng ngủ",
        roomType: "BEDROOM",
        dimensions: { lengthM: 4, widthM: 3.5, heightM: 2.8, source: "SYSTEM_DEFAULT" },
        floor: { material: "Gỗ", isWet: false, isSlipResistant: true, levelDifferenceCm: 0, thresholdStepPresent: false },
        lighting: { daytimeLux: 200, nighttimeLux: 100, nightLightPresent: true, motionSensorPresent: false, pathLightToBathroom: true, switchReachableFromEntrance: true, switchReachableFromBed: true },
        rugs: {
          present: true,
          items: [
            {
              id: "rug-1",
              name: "Thảm len nhỏ",
              location: "Cạnh giường ngủ",
              isSecured: false,
              edgesCurled: true,
              inWalkway: true,
            },
          ],
        },
        cables: { crossingWalkway: false, items: [] },
        obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
        grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
        accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: false },
        sourceType: "SURVEY_PROFILE",
      };

      const result = rule.evaluate(input);
      expect(result.state).toBe("DETECTED");
      expect(result.priority).toBe("HIGH");
      expect(result.finding).not.toBeNull();
      expect(result.finding?.title).toContain("Thảm len nhỏ");
      expect(result.recommendation?.actionCategory).toBe("SECURE_RUG");
    });

    it("evaluates to NEEDS_VERIFICATION when rugs present is null", () => {
      const input = normalizeRoomAssessmentInput({
        roomId: "room-1",
        roomType: "BEDROOM",
        rugs: { present: null, items: [] },
      });
      const result = rule.evaluate(input);
      expect(result.state).toBe("NEEDS_VERIFICATION");
      expect(result.priority).toBe("UNKNOWN");
    });
  });

  describe("Rule RISK-002: Electrical Cable on Walkway", () => {
    const rule = getRuleById("RISK-002")!;

    it("evaluates to DETECTED (HIGH) when cable crosses walkway without cover", () => {
      const input = normalizeRoomAssessmentInput({
        roomId: "room-1",
        roomType: "LIVING_ROOM",
        cablesCrossing: true,
      });
      const result = rule.evaluate(input);
      expect(result.state).toBe("DETECTED");
      expect(result.priority).toBe("HIGH");
      expect(result.recommendation?.actionCategory).toBe("REROUTE_CABLE");
    });
  });

  describe("Rule RISK-005 & RISK-006: Bathroom Rules and NOT_APPLICABLE state", () => {
    const ruleBathSlip = getRuleById("RISK-005")!;
    const ruleGrabBar = getRuleById("RISK-006")!;

    it("returns NOT_APPLICABLE for RISK-005 and RISK-006 in BEDROOM", () => {
      const input = normalizeRoomAssessmentInput({
        roomId: "room-bedroom",
        roomType: "BEDROOM",
      });

      const resSlip = ruleBathSlip.evaluate(input);
      const resGrab = ruleGrabBar.evaluate(input);

      expect(resSlip.state).toBe("NOT_APPLICABLE");
      expect(resGrab.state).toBe("NOT_APPLICABLE");
    });

    it("returns DETECTED (HIGH) in BATHROOM when floor is wet without anti-slip and 0 grab bars", () => {
      const input = normalizeRoomAssessmentInput({
        roomId: "room-bath",
        roomType: "BATHROOM",
        isWet: true,
        isSlipResistant: false,
        grabBarsCount: 0,
      });

      const resSlip = ruleBathSlip.evaluate(input);
      const resGrab = ruleGrabBar.evaluate(input);

      expect(resSlip.state).toBe("DETECTED");
      expect(resSlip.priority).toBe("HIGH");
      expect(resGrab.state).toBe("DETECTED");
      expect(resGrab.priority).toBe("HIGH");
    });
  });

  describe("Priority Engine & Policy", () => {
    it("provides transparent rationales for all priorities", () => {
      expect(PRIORITY_POLICIES.HIGH.priority).toBe("HIGH");
      expect(PRIORITY_POLICIES.HIGH.criteria.length).toBeGreaterThan(3);

      const highExp = explainPriorityDecision("RISK-005", "DETECTED", "HIGH");
      expect(highExp).toContain("gãy xương chậu");

      const unknownExp = explainPriorityDecision("RISK-001", "NEEDS_VERIFICATION", "UNKNOWN");
      expect(unknownExp).toContain("bổ sung thông tin");
    });
  });

  describe("AI RAG Explanation Engine", () => {
    it("generates structured explanation with clinical rationale and verified citations", () => {
      const rule = getRuleById("RISK-001")!;
      const input = normalizeRoomAssessmentInput({
        roomId: "room-1",
        roomType: "BEDROOM",
        rugs: {
          present: true,
          items: [{ id: "r1", name: "Thảm chân", location: "Cạnh giường", isSecured: false, edgesCurled: true, inWalkway: true }],
        },
      });

      const res = rule.evaluate(input);
      expect(res.finding).not.toBeNull();

      const explanation = explainHazardFinding(res.finding!);
      expect(explanation.clinicalRationale).toContain("người cao tuổi");
      expect(explanation.citations.length).toBeGreaterThan(0);
      expect(explanation.citations[0].organization).toBeDefined();
      expect(explanation.actionableGuidance.length).toBeGreaterThan(1);
    });
  });

  describe("Before/After Assessment Comparison", () => {
    it("classifies findings into RESOLVED_IN_MODEL when interventions are applied", () => {
      const beforeSnapshot = evaluateRoomHazards({
        roomId: "room-test",
        roomType: "BATHROOM",
        isWet: true,
        isSlipResistant: false,
        grabBarsCount: 0,
      });

      const afterSnapshot = evaluateRoomHazards({
        roomId: "room-test",
        roomType: "BATHROOM",
        isWet: false,
        isSlipResistant: true,
        grabBarsCount: 2,
        hasNonSlipMat: true,
      });

      const comp = compareAssessments(beforeSnapshot, afterSnapshot);
      expect(comp.scoreDelta).toBeGreaterThan(0);
      expect(comp.summary.resolvedCount).toBeGreaterThanOrEqual(1);

      const resolvedItems = comp.evaluationsComparison.filter(
        (e) => e.comparisonCategory === "RESOLVED_IN_MODEL"
      );
      expect(resolvedItems.length).toBeGreaterThan(0);
    });
  });
});

