import { describe, it, expect } from "vitest";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { generateAssessmentReport } from "@/lib/risk/assessmentManager";
import { RoomProfile } from "@/lib/survey/types";
import { INITIAL_ROOMS } from "@/data/mockRooms";

describe("SafeHome Risk Intelligence — Integration Tests", () => {
  it("evaluates a completed Survey RoomProfile end-to-end", () => {
    const surveyProfile: RoomProfile = {
      id: "profile-1",
      surveyId: "survey-1",
      roomId: "room-bedroom-1",
      roomType: "BEDROOM",
      roomName: "Phòng ngủ chính",
      status: "COMPLETED",
      surveyVersion: "1.0.0",
      dimensions: {
        lengthM: 4.5,
        widthM: 3.8,
        heightM: 2.8,
        measurementSource: "USER_ESTIMATED",
        measurementConfidenceType: "MEASURED",
      },
      floor: {
        material: "Gỗ tự nhiên",
        isWetReported: false,
        isSlipperyReported: false,
        levelDifferenceReported: false,
        levelDifferenceCm: 0,
      },
      lighting: {
        adequateAtNight: false,
        nightLightPresent: false,
        generalLightingAdequate: true,
        sourceQuestionIds: ["BED_004"],
      },
      rugs: {
        present: true,
        secured: false,
        locations: ["Cạnh giường"],
        sourceQuestionIds: ["BED_006"],
      },
      electricalCables: {
        onWalkway: true,
        sourceQuestionIds: ["BED_008"],
      },
      obstacles: {
        present: true,
        types: ["GHE", "HOP_DO"],
        descriptions: "Ghế gỗ nhỏ và hộp carton",
        sourceQuestionIds: ["BED_009"],
      },
      grabBars: {
        present: false,
        locations: [],
        inspected: false,
        sourceQuestionIds: [],
      },
      accessibilityObservations: {
        bedMobilityDifficulty: false,
        bathMobilityDifficulty: false,
        reachingDifficulty: true,
      },
      reportedConcerns: ["Thảm hay trượt", "Tối khó đi vệ sinh"],
      completenessScore: 100,
      updatedAt: new Date().toISOString(),
    };

    const snapshot = evaluateRoomHazards(surveyProfile);

    expect(snapshot.roomType).toBe("BEDROOM");
    expect(snapshot.totalRulesEvaluated).toBe(8);
    expect(snapshot.detectedCount).toBeGreaterThanOrEqual(3);
    expect(snapshot.highPriorityCount).toBeGreaterThanOrEqual(1);

    // Verify findings structure
    const detectedRules = snapshot.findings.map((f) => f.ruleId);
    expect(detectedRules).toContain("RISK-001"); // Unsecured rug
    expect(detectedRules).toContain("RISK-002"); // Cable crossing
    expect(detectedRules).toContain("RISK-004"); // Inadequate nighttime lighting

    // Check report generation
    const report = generateAssessmentReport(snapshot);
    expect(report.meta.engineVersion).toContain("SafeHome Risk Intelligence");
    expect(report.summary.detectedHazards).toBe(snapshot.detectedCount);
    expect(report.curatedSources.length).toBeGreaterThanOrEqual(3);
    expect(report.meta.disclaimer).toContain("không đưa ra chẩn đoán y khoa");
  });

  it("evaluates a 3D Digital Twin RoomState end-to-end", () => {
    const bedroom3D = INITIAL_ROOMS[0]; // bedroom from mockRooms
    expect(bedroom3D).toBeDefined();

    const snapshot = evaluateRoomHazards(bedroom3D);
    expect(snapshot.roomName).toContain("Phòng ngủ");
    expect(snapshot.totalRulesEvaluated).toBe(8);
    expect(snapshot.safetyScore).toBeGreaterThanOrEqual(10);
    expect(snapshot.safetyScore).toBeLessThanOrEqual(100);

    // Each detected finding must have traceable evidence
    for (const finding of snapshot.findings) {
      expect(finding.evidence.measuredValue).toBeDefined();
      expect(finding.evidence.threshold).toBeDefined();
      expect(finding.evidence.rationale).toBeDefined();
      expect(finding.referenceIds.length).toBeGreaterThan(0);
    }
  });

  it("correctly handles bathroom 3D room state with wet floor and grab bars", () => {
    const bathroom3D = INITIAL_ROOMS[1]; // bathroom from mockRooms
    expect(bathroom3D).toBeDefined();

    const snapshot = evaluateRoomHazards(bathroom3D);
    expect(snapshot.roomType).toBe("BATHROOM");

    // Bathroom rules should NOT be NOT_APPLICABLE
    const bathSlipEv = snapshot.ruleEvaluations.find((e) => e.ruleId === "RISK-005");
    const grabBarEv = snapshot.ruleEvaluations.find((e) => e.ruleId === "RISK-006");

    expect(bathSlipEv?.state).not.toBe("NOT_APPLICABLE");
    expect(grabBarEv?.state).not.toBe("NOT_APPLICABLE");
  });
});
