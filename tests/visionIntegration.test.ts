import { describe, it, expect } from "vitest";
import { runVisionAnalysis } from "@/lib/vision/visionProvider";
import { mapClarificationToRoomFacts } from "@/lib/vision/clarificationEngine";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { createSceneDraftFromVision } from "@/lib/vision/sceneDraftAdapter";

describe("SafeHome Vision Intelligence — Integration Tests", () => {
  it("executes Scenario A: Bedroom Photo -> Rug Detection -> Clarification -> RISK-001 High Hazard", async () => {
    const roomId = "test-bedroom-integration";

    // 1. Run AI Vision Analysis on Bedroom photo
    const analysis = await runVisionAnalysis("img-bedroom-1", roomId, {
      roomType: "BEDROOM",
      viewpoint: "ENTRANCE",
    });

    expect(analysis.detections.length).toBeGreaterThan(0);
    const rugDetection = analysis.detections.find((d) => d.category === "rug");
    expect(rugDetection).toBeDefined();

    // 2. User confirms the rug exists (BED_006 = YES)
    const factRugPresent = mapClarificationToRoomFacts(roomId, "BED_006", "YES", rugDetection!.id);
    expect(factRugPresent[0].confirmedValue).toBe(true);

    // 3. User answers rug is UNSECURED (BED_007 = UNSECURED)
    const factRugSecured = mapClarificationToRoomFacts(roomId, "BED_007", "UNSECURED", rugDetection!.id);
    expect(factRugSecured[0].confirmedValue).toBe(false);

    // 4. Synthesize into room profile input for Risk Assessment
    const roomInput = {
      roomId,
      roomName: "Phòng ngủ",
      roomType: "BEDROOM",
      rugs: {
        present: true,
        items: [
          {
            id: rugDetection!.id,
            name: "Thảm trải sàn",
            location: "Cạnh giường ngủ",
            isSecured: false,
            edgesCurled: true,
            inWalkway: true,
          },
        ],
      },
      cables: { crossingWalkway: false, items: [] },
      obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
      lighting: { daytimeLux: 200, nighttimeLux: 100, nightLightPresent: true, pathLightToBathroom: true },
      floor: { material: "Gỗ", isWet: false, isSlipResistant: true },
      grabBars: { present: false, count: 0 },
      accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true },
    };

    // 5. Run Risk Assessment Engine
    const snapshot = evaluateRoomHazards(roomInput);
    expect(snapshot.detectedCount).toBeGreaterThanOrEqual(1);

    const rugFinding = snapshot.findings.find((f) => f.ruleId === "RISK-001");
    expect(rugFinding).toBeDefined();
    expect(rugFinding?.severityCategory).toBe("HIGH");
    expect(rugFinding?.evidence.rationale).toContain("Người cao tuổi");

    // 6. Generate 3D Scene Draft
    const sceneDraft = await createSceneDraftFromVision(roomId);
    expect(sceneDraft.roomId).toBe(roomId);
    expect(sceneDraft.detectedObjects.length).toBeGreaterThan(0);
    expect(sceneDraft.detectedObjects[0].isEstimate).toBe(true);
  });

  it("executes Scenario B: Bathroom Photo -> Wet Surface & Grab Bar Clarification -> RISK-005 & RISK-006", async () => {
    const roomId = "test-bathroom-integration";

    // 1. Run AI Vision Analysis on Bathroom photo
    const analysis = await runVisionAnalysis("img-bath-1", roomId, {
      roomType: "BATHROOM",
      viewpoint: "ENTRANCE",
    });

    expect(analysis.detections.length).toBeGreaterThan(0);
    expect(analysis.observations.some((o) => o.observationType === "GRAB_BAR_UNCERTAIN")).toBe(true);

    // 2. User clarifies: No grab bars installed (BATH_005 = NONE)
    const grabFacts = mapClarificationToRoomFacts(roomId, "BATH_005", "NONE", "obs-grab");
    expect(grabFacts.find((f) => f.fieldPath === "grabBars.count")?.confirmedValue).toBe(0);

    // 3. User clarifies: Floor is slippery without mat (BATH_003 = SLIPPERY_NO_MAT)
    const floorFacts = mapClarificationToRoomFacts(roomId, "BATH_003", "SLIPPERY_NO_MAT", "obs-floor");
    expect(floorFacts.find((f) => f.fieldPath === "floor.isSlipperyReported")?.confirmedValue).toBe(true);

    // 4. Run Risk Engine on confirmed bathroom facts
    const bathInput = {
      roomId,
      roomName: "Nhà vệ sinh tầng 1",
      roomType: "BATHROOM",
      floor: {
        material: "Gạch men",
        isWet: true,
        isSlipResistant: false,
        hasNonSlipMat: false,
        levelDifferenceCm: 2.0,
      },
      grabBars: {
        present: false,
        count: 0,
        toiletGrabBarPresent: false,
        showerGrabBarPresent: false,
      },
    };

    const snapshot = evaluateRoomHazards(bathInput);
    const slipFinding = snapshot.findings.find((f) => f.ruleId === "RISK-005");
    const grabFinding = snapshot.findings.find((f) => f.ruleId === "RISK-006");

    expect(slipFinding).toBeDefined();
    expect(slipFinding?.severityCategory).toBe("HIGH");
    expect(grabFinding).toBeDefined();
    expect(grabFinding?.severityCategory).toBe("HIGH");
  });
});

