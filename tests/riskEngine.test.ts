import { describe, it, expect } from "vitest";
import {
  ruleLooseRug,
  ruleCableCrossing,
  rulePoorLighting,
  ruleWetFloor,
  ruleMissingGrabBars,
  ruleObstacleRoute,
  ruleDangerousObject,
  runEnvironmentalAssessment,
  calculateSafetyScore,
  pointToSegmentDistance,
} from "../src/features/risk-engine/rules";
import { MOCK_BEDROOM_ROOM, MOCK_BATHROOM_ROOM } from "../src/data/mockRooms";
import { RoomState } from "../src/types";

describe("Risk Engine - Spatial Calculations & Detection Rules", () => {
  it("should accurately compute 2D point-to-segment distance", () => {
    // Segment from (0, 0) to (4, 0)
    // Point at (2, 3) -> perpendicular distance is 3
    const dist1 = pointToSegmentDistance(2, 3, 0, 0, 4, 0);
    expect(dist1).toBeCloseTo(3.0, 2);

    // Point beyond end at (5, 0) -> distance to (4, 0) is 1
    const dist2 = pointToSegmentDistance(5, 0, 0, 0, 4, 0);
    expect(dist2).toBeCloseTo(1.0, 2);
  });

  it("RULE_RUG_01: should detect loose rug placed in or near walking path", () => {
    const findings = ruleLooseRug.evaluate(MOCK_BEDROOM_ROOM);
    expect(findings.length).toBeGreaterThan(0);
    const rugFinding = findings.find((f) => f.hazardType === "LOOSE_RUG");
    expect(rugFinding).toBeDefined();
    expect(rugFinding?.severityCategory).toBe("HIGH");
    expect(rugFinding?.detectionRuleId).toBe("RULE_RUG_01");
  });

  it("RULE_RUG_01: should resolve rug hazard when rug is fixed with anti-slip backing", () => {
    const fixedRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      objects: MOCK_BEDROOM_ROOM.objects.map((obj) =>
        obj.category === "RUG" ? { ...obj, isLoose: false, isFixed: true } : obj
      ),
    };
    const findings = ruleLooseRug.evaluate(fixedRoom);
    expect(findings.length).toBe(0);
  });

  it("RULE_CABLE_02: should detect electrical cable crossing walking route", () => {
    const findings = ruleCableCrossing.evaluate(MOCK_BEDROOM_ROOM);
    const cableFinding = findings.find((f) => f.hazardType === "CABLE_CROSSING");
    expect(cableFinding).toBeDefined();
    expect(cableFinding?.severityCategory).toBe("HIGH");
  });

  it("RULE_CABLE_02: should resolve cable hazard when cable is fixed/routed along wall", () => {
    const fixedRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      objects: MOCK_BEDROOM_ROOM.objects.map((obj) =>
        obj.category === "CABLE"
          ? { ...obj, isFixed: true, position: [2.0, 0.02, 1.3] }
          : obj
      ),
    };
    const findings = ruleCableCrossing.evaluate(fixedRoom);
    expect(findings.length).toBe(0);
  });

  it("RULE_LIGHT_03: should detect inadequate lighting level in night mode", () => {
    const dimRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      lightingLevel: 45, // Lux (night time)
    };
    const findings = rulePoorLighting.evaluate(dimRoom);
    expect(findings.length).toBe(1);
    expect(findings[0].hazardType).toBe("POOR_LIGHTING");

    // When lighting is increased to 200 Lux, hazard should be resolved
    const brightRoom: RoomState = { ...dimRoom, lightingLevel: 200 };
    expect(rulePoorLighting.evaluate(brightRoom).length).toBe(0);
  });

  it("RULE_BATH_WET_04: should detect wet bathroom floor without anti-slip solution", () => {
    const findings = ruleWetFloor.evaluate(MOCK_BATHROOM_ROOM);
    expect(findings.length).toBe(1);
    expect(findings[0].hazardType).toBe("WET_FLOOR");

    // When treated with anti-slip coating
    const treatedRoom: RoomState = { ...MOCK_BATHROOM_ROOM, isSlipResistant: true };
    expect(ruleWetFloor.evaluate(treatedRoom).length).toBe(0);
  });

  it("RULE_BATH_GRAB_05: should detect missing grab bars in bathroom scenario", () => {
    const findings = ruleMissingGrabBars.evaluate(MOCK_BATHROOM_ROOM);
    expect(findings.length).toBe(1);
    expect(findings[0].hazardType).toBe("MISSING_GRAB_BAR");

    // When 2 grab bars are installed
    const equippedRoom: RoomState = { ...MOCK_BATHROOM_ROOM, grabBarsCount: 2 };
    expect(ruleMissingGrabBars.evaluate(equippedRoom).length).toBe(0);
  });

  it("RULE_PATH_OBST_06: should detect obstacle placed inside walking corridor", () => {
    const findings = ruleObstacleRoute.evaluate(MOCK_BEDROOM_ROOM);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("should introduce new hazard when moving an obstacle directly into walking corridor", () => {
    // Take a room without walkway obstacles and move a table right into the doorway route
    const modifiedRoom: RoomState = {
      ...MOCK_BEDROOM_ROOM,
      objects: MOCK_BEDROOM_ROOM.objects.map((obj) =>
        obj.modelType === "coffee_table"
          ? {
              ...obj,
              position: [1.2, 0.25, 1.2], // Direct intersection with zone-bed-to-door [0.6, 0.4] -> [1.8, 2.2]
              isWalkwayObstacle: true,
            }
          : obj
      ),
    };
    const findings = ruleObstacleRoute.evaluate(modifiedRoom);
    expect(findings.some((f) => f.targetObjectId === "obj-table-01")).toBe(true);
  });

  it("calculateSafetyScore: should calculate explainable heuristic index", () => {
    const bedroomFindings = runEnvironmentalAssessment(MOCK_BEDROOM_ROOM);
    const score = calculateSafetyScore(bedroomFindings);
    expect(score).toBeGreaterThanOrEqual(10);
    expect(score).toBeLessThanOrEqual(100);

    // If no hazards, score should be 100
    expect(calculateSafetyScore([])).toBe(100);
  });
});

