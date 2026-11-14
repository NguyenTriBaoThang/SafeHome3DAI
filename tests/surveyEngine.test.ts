import { describe, it, expect } from "vitest";
import {
  isQuestionApplicable,
  getApplicableQuestions,
  getNextQuestion,
  calculateSurveyProgress,
  invalidateStaleAnswers,
} from "../src/lib/survey/flowEngine";
import { getQuestionById, BEDROOM_QUESTIONS, BATHROOM_QUESTIONS } from "../src/lib/survey/questionBank";
import { screenRoomHazards } from "../src/lib/survey/screeningEngine";
import { buildRoomProfile } from "../src/lib/survey/profileBuilder";
import { interpretVietnameseAnswer } from "../src/lib/survey/nlpInterpreter";
import { convertRoomProfileToSceneDraft } from "../src/lib/survey/sceneDraftAdapter";
import { StructuredAnswer } from "../src/lib/survey/types";

describe("SafeHome AI Guided Survey — Unit Tests (Flow, Screening & NLP)", () => {
  it("Test 1: Bedroom initial question sequencing should start with BED_001", () => {
    const emptyAnswers: Record<string, StructuredAnswer> = {};
    const nextQ = getNextQuestion("BEDROOM", emptyAnswers);

    expect(nextQ).not.toBeNull();
    expect(nextQ?.questionId).toBe("BED_001");
    expect(nextQ?.roomType).toBe("BEDROOM");
  });

  it("Test 2: Bathroom initial question sequencing should start with BATH_001", () => {
    const emptyAnswers: Record<string, StructuredAnswer> = {};
    const nextQ = getNextQuestion("BATHROOM", emptyAnswers);

    expect(nextQ).not.toBeNull();
    expect(nextQ?.questionId).toBe("BATH_001");
    expect(nextQ?.roomType).toBe("BATHROOM");
  });

  it("Test 3: Conditional question eligibility — BED_007 (rug secured) should be inapplicable when no rug", () => {
    const qBed007 = getQuestionById("BED_007")!;
    expect(qBed007).toBeDefined();

    // Case A: BED_006 not answered yet
    const answersNoBed006: Record<string, StructuredAnswer> = {};
    expect(isQuestionApplicable(qBed007, answersNoBed006)).toBe(false);

    // Case B: BED_006 answered "NO" (Không có thảm)
    const answersWithNoRug: Record<string, StructuredAnswer> = {
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };
    expect(isQuestionApplicable(qBed007, answersWithNoRug)).toBe(false);

    // Case C: BED_006 answered "YES" (Có thảm)
    const answersWithRug: Record<string, StructuredAnswer> = {
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };
    expect(isQuestionApplicable(qBed007, answersWithRug)).toBe(true);
  });

  it("Test 4: Progress calculation — denominator excludes inapplicable questions", () => {
    // When BED_006 = "NO", BED_007 is inapplicable, so totalApplicable is reduced
    const answersNoRug: Record<string, StructuredAnswer> = {
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };

    const progressNoRug = calculateSurveyProgress("BEDROOM", answersNoRug);

    // When BED_006 = "YES", BED_007 becomes applicable
    const answersWithRug: Record<string, StructuredAnswer> = {
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };

    const progressWithRug = calculateSurveyProgress("BEDROOM", answersWithRug);

    // Denominator when rug is present should be strictly greater than when rug is absent
    expect(progressWithRug.totalApplicable).toBeGreaterThan(progressNoRug.totalApplicable);
  });

  it("Test 5: Invalidate stale dependent answers when parent answer changes", () => {
    // Initially user says YES to rug (BED_006) and NO to secured (BED_007)
    const initialAnswers: Record<string, StructuredAnswer> = {
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_007: {
        questionId: "BED_007",
        category: "FLOOR",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };

    // User edits BED_006 to "NO" (No rug)
    const { updatedAnswersMap, invalidatedQuestionIds } = invalidateStaleAnswers(
      "BEDROOM",
      initialAnswers,
      "BED_006",
      "NO"
    );

    expect(updatedAnswersMap["BED_006"].value).toBe("NO");
    expect(invalidatedQuestionIds).toContain("BED_007");
    expect(updatedAnswersMap["BED_007"]).toBeUndefined();
  });

  it("Test 6: Screening Rule Execution — detects unsecured rug & poor night light", () => {
    const answers: Record<string, StructuredAnswer> = {
      BED_004: {
        questionId: "BED_004",
        category: "LIGHTING",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_007: {
        questionId: "BED_007",
        category: "FLOOR",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_008: {
        questionId: "BED_008",
        category: "CABLE",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };

    const findings = screenRoomHazards("BEDROOM", answers);
    expect(findings.length).toBeGreaterThanOrEqual(3);

    const rugFinding = findings.find((f) => f.ruleId === "RULE_BED_001");
    expect(rugFinding).toBeDefined();
    expect(rugFinding?.priority).toBe("CAN_UU_TIEN_KIEM_TRA");
    expect(rugFinding?.supportingSourceIds).toContain("SRC_WHO_2021");

    const cableFinding = findings.find((f) => f.ruleId === "RULE_BED_002");
    expect(cableFinding).toBeDefined();
    expect(cableFinding?.priority).toBe("CAN_UU_TIEN_KIEM_TRA");

    const lightFinding = findings.find((f) => f.ruleId === "RULE_BED_004");
    expect(lightFinding).toBeDefined();
  });

  it("Test 7: Canonical RoomProfile Builder produces strongly validated profile", () => {
    const answers: Record<string, StructuredAnswer> = {
      BED_001: {
        questionId: "BED_001",
        category: "BASIC",
        value: { lengthM: 4.2, widthM: 3.6, isUnknown: false },
        answerSource: "USER_ESTIMATED",
        confirmationStatus: "CONFIRMED",
      },
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_007: {
        questionId: "BED_007",
        category: "FLOOR",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_008: {
        questionId: "BED_008",
        category: "CABLE",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };

    const profile = buildRoomProfile("survey-01", "room-01", "BEDROOM", "Phòng ngủ bà", answers);

    expect(profile.roomId).toBe("room-01");
    expect(profile.dimensions.lengthM).toBe(4.2);
    expect(profile.dimensions.widthM).toBe(3.6);
    expect(profile.dimensions.measurementSource).toBe("USER_ESTIMATED");
    expect(profile.rugs.present).toBe(true);
    expect(profile.rugs.secured).toBe(false);
    expect(profile.electricalCables.onWalkway).toBe(false);
    expect(profile.reportedConcerns).toContain("Thảm chưa cố định chắc chắn");
  });

  it("Test 8: Vietnamese NLP parsing for Dimensions, Rugs and Uncertainty", () => {
    const qBed001 = getQuestionById("BED_001")!;
    const propDim = interpretVietnameseAnswer(qBed001, "Dài khoảng 4m rộng 3 mét");
    expect(propDim.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(propDim.extractedValue.lengthM).toBe(4);
    expect(propDim.extractedValue.widthM).toBe(3);

    const qBed006 = getQuestionById("BED_006")!;
    const propRug = interpretVietnameseAnswer(qBed006, "Có thảm trải sàn ở cạnh giường");
    expect(propRug.extractedValue).toBe("YES");

    const propNoRug = interpretVietnameseAnswer(qBed006, "Nhà tôi không có dùng thảm");
    expect(propNoRug.extractedValue).toBe("NO");

    const propUnknown = interpretVietnameseAnswer(qBed006, "Tôi chưa rõ, để hỏi lại ông");
    expect(propUnknown.extractedValue).toBe("UNKNOWN");
  });

  it("Test 9: 3D Scene Draft Adapter synthesizes draft objects without fabricating fake measurements", () => {
    const answers: Record<string, StructuredAnswer> = {
      BED_006: {
        questionId: "BED_006",
        category: "FLOOR",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_007: {
        questionId: "BED_007",
        category: "FLOOR",
        value: "NO",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
      BED_008: {
        questionId: "BED_008",
        category: "CABLE",
        value: "YES",
        answerSource: "USER_SELECTED",
        confirmationStatus: "CONFIRMED",
      },
    };

    const profile = buildRoomProfile("survey-01", "room-01", "BEDROOM", "Phòng ngủ", answers);
    const sceneDraft = convertRoomProfileToSceneDraft(profile);

    expect(sceneDraft.roomId).toBe("room-01");
    expect(sceneDraft.objects.some((o) => o.modelType === "bed")).toBe(true);
    expect(sceneDraft.objects.some((o) => o.modelType === "rug")).toBe(true);
    expect(sceneDraft.objects.some((o) => o.modelType === "cable")).toBe(true);
    expect(sceneDraft.approximateDimensions.isDemoFallback).toBe(true);
    expect(sceneDraft.unresolvedMeasurements).toContain("Kích thước phòng (Dài x Rộng)");
  });
});

