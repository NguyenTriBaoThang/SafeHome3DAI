import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createHomeSurvey,
  getSurveyById,
  saveRoomAnswer,
  getRoomSurveyState,
  completeRoomSurvey,
  exportSurveyData,
  deleteSurvey,
} from "../src/lib/survey/surveyManager";

describe("SafeHome AI Guided Survey — Integration Tests (E2E Scenarios)", () => {
  let testSurveyId: string;
  let bedroomRoomId: string;
  let bathroomRoomId: string;

  beforeAll(async () => {
    // 1. Create a fresh test survey with Bedroom & Bathroom
    const survey = await createHomeSurvey({
      name: "Khảo sát kiểm thử tích hợp E2E",
      targetResident: "Cụ bà 80 tuổi, sử dụng gậy chống",
      roomTypes: ["BEDROOM", "BATHROOM"],
      consentGiven: true,
    });

    testSurveyId = survey.id;
    const bed = survey.rooms.find((r) => r.roomType === "BEDROOM");
    const bath = survey.rooms.find((r) => r.roomType === "BATHROOM");

    bedroomRoomId = bed!.id;
    bathroomRoomId = bath!.id;
  });

  afterAll(async () => {
    if (testSurveyId) {
      try {
        await deleteSurvey(testSurveyId);
      } catch {
        // ignore
      }
    }
  });

  it("Scenario 1: Survey creation and room initialization", async () => {
    const survey = await getSurveyById(testSurveyId);
    expect(survey).toBeDefined();
    expect(survey?.name).toBe("Khảo sát kiểm thử tích hợp E2E");
    expect(survey?.rooms.length).toBe(2);
    expect(bedroomRoomId).toBeDefined();
    expect(bathroomRoomId).toBeDefined();
  });

  it("Scenario 2: E2E Bedroom Survey — answering, autosave, findings, and answer editing", async () => {
    // Step A: Dimensions
    await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_001",
      value: { lengthM: 4.5, widthM: 3.8, isUnknown: false },
      answerSource: "USER_ESTIMATED",
    });

    // Step B: Elder usage & Window
    await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_002",
      value: "YES",
    });
    await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_003",
      value: "YES",
    });

    // Step C: Lighting
    await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_004",
      value: "NO", // Poor night light
    });
    await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_005",
      value: "NO", // No bedside lamp
    });

    // Step D: Rug
    await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_006",
      value: "YES", // Has rug
    });
    await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_007",
      value: "NO", // Rug NOT secured
    });

    // Step E: Cable
    const cableResult = await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_008",
      value: "YES", // Cable on walkway
    });

    // Check findings triggered so far
    expect(cableResult.findings.some((f) => f.ruleId === "RULE_BED_001")).toBe(true); // Unsecured rug
    expect(cableResult.findings.some((f) => f.ruleId === "RULE_BED_002")).toBe(true); // Cable on walkway
    expect(cableResult.findings.some((f) => f.ruleId === "RULE_BED_004")).toBe(true); // Poor light

    // Step F: Edit answer — User changes BED_006 to "NO" (No rug)
    const editResult = await saveRoomAnswer({
      roomId: bedroomRoomId,
      questionId: "BED_006",
      value: "NO",
    });

    // Verify that BED_007 was invalidated and deleted
    expect(editResult.invalidatedQuestionIds).toContain("BED_007");
    expect(editResult.answersMap["BED_007"]).toBeUndefined();
    // Verify that RULE_BED_001 is no longer triggered
    expect(editResult.findings.some((f) => f.ruleId === "RULE_BED_001")).toBe(false);

    // Verify profile state
    expect(editResult.profile.rugs.present).toBe(false);
    expect(editResult.profile.rugs.secured).toBe(null);
  });

  it("Scenario 3: E2E Bathroom Survey — wet floor, missing grab bars, entrance obstacle", async () => {
    // Wet & Slippery
    await saveRoomAnswer({
      roomId: bathroomRoomId,
      questionId: "BATH_003",
      value: "YES", // Wet
    });
    await saveRoomAnswer({
      roomId: bathroomRoomId,
      questionId: "BATH_004",
      value: "YES", // Slippery
    });

    // Missing grab bars
    await saveRoomAnswer({
      roomId: bathroomRoomId,
      questionId: "BATH_005",
      value: "NO", // No grab bar
    });

    // Entrance step
    const bathState = await saveRoomAnswer({
      roomId: bathroomRoomId,
      questionId: "BATH_010",
      value: "YES", // Entrance step
    });

    // Check bathroom findings
    expect(bathState.findings.some((f) => f.ruleId === "RULE_BATH_001")).toBe(true); // Wet/slippery
    expect(bathState.findings.some((f) => f.ruleId === "RULE_BATH_002")).toBe(true); // Missing grab bar
    expect(bathState.findings.some((f) => f.ruleId === "RULE_BATH_004")).toBe(true); // Entrance step
  });

  it("Scenario 4: Export structured survey data", async () => {
    const exported = await exportSurveyData(testSurveyId);

    expect(exported.surveyId).toBe(testSurveyId);
    expect(exported.rooms.length).toBe(2);
    expect(exported.totalFindings).toBeGreaterThanOrEqual(4);

    const bedRoomExport = exported.rooms.find((r) => r.roomType === "BEDROOM");
    expect(bedRoomExport).toBeDefined();
    expect(bedRoomExport?.profile).toBeDefined();
    expect(bedRoomExport?.answers.length).toBeGreaterThan(0);
  });
});

