import { describe, it, expect } from "vitest";
import { INITIAL_ROOMS, MOCK_BEDROOM_ROOM } from "../src/data/mockRooms";
import { runEnvironmentalAssessment, calculateSafetyScore } from "../src/features/risk-engine/rules";
import { retrieveKnowledgePassages, processRAGQuery } from "../src/lib/rag/engine";
import { RoomState } from "../src/types";

describe("Integration Test Suite: SafeHome 3D AI End-to-End Workflow", () => {
  it("Scenario Step 1: Initial room loading & Baseline assessment", () => {
    const rooms = INITIAL_ROOMS;
    expect(rooms.length).toBeGreaterThanOrEqual(2);

    const bedroom = rooms.find((r) => r.roomType === "BEDROOM")!;
    expect(bedroom).toBeDefined();

    // Baseline findings
    const baselineFindings = runEnvironmentalAssessment(bedroom);
    expect(baselineFindings.length).toBeGreaterThanOrEqual(3);

    // Baseline safety score
    const baselineScore = calculateSafetyScore(baselineFindings);
    expect(baselineScore).toBeLessThan(70); // initial hazardous environment
  });

  it("Scenario Step 2: Interactive Modification (Fix Rug + Fix Cable + Add Bright Light)", () => {
    const bedroom = JSON.parse(JSON.stringify(MOCK_BEDROOM_ROOM)) as RoomState;

    // Apply 3 modifications
    // 1. Fix loose rug
    bedroom.objects = bedroom.objects.map((obj) =>
      obj.category === "RUG" ? { ...obj, isLoose: false, isFixed: true } : obj
    );
    // 2. Route cable along wall
    bedroom.objects = bedroom.objects.map((obj) =>
      obj.category === "CABLE" ? { ...obj, isFixed: true, position: [2.0, 0.02, 1.3] } : obj
    );
    // 3. Upgrade lighting to 220 Lux
    bedroom.lightingLevel = 220;

    // Re-run assessment
    const modifiedFindings = runEnvironmentalAssessment(bedroom);

    // Rug, Cable, and Poor Lighting hazards must be resolved
    const hasRugHazard = modifiedFindings.some((f) => f.hazardType === "LOOSE_RUG");
    const hasCableHazard = modifiedFindings.some((f) => f.hazardType === "CABLE_CROSSING");
    const hasLightHazard = modifiedFindings.some((f) => f.hazardType === "POOR_LIGHTING");

    expect(hasRugHazard).toBe(false);
    expect(hasCableHazard).toBe(false);
    expect(hasLightHazard).toBe(false);

    // Score improvement
    const newScore = calculateSafetyScore(modifiedFindings);
    const baselineScore = calculateSafetyScore(runEnvironmentalAssessment(MOCK_BEDROOM_ROOM));
    expect(newScore).toBeGreaterThan(baselineScore);
  });

  it("Scenario Step 3: RAG Assistant provides grounded citations for bedroom findings", async () => {
    const passages = retrieveKnowledgePassages("chiếu sáng đèn ngủ phòng tắm", 3);
    expect(passages.length).toBeGreaterThan(0);

    const answer = await processRAGQuery("Người già nên dùng đèn ngủ loại nào?", {
      room: MOCK_BEDROOM_ROOM,
      hazards: runEnvironmentalAssessment(MOCK_BEDROOM_ROOM),
    });

    expect(answer.content).toContain("WHO");
    expect(answer.isFallback).toBe(true);
  });
});

