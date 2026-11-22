import { describe, expect, it } from "vitest";
import { buildRoomProfile } from "@/lib/survey/profileBuilder";
import { evaluateConfirmedVisionProfile } from "@/lib/vision/confirmedRiskAssessment";
import type { RoomType, StructuredAnswer } from "@/lib/survey/types";
import { stripExifMetadata } from "@/lib/vision/imagePreprocessor";

function profile(room: RoomType, answers: Record<string, string>) {
  return buildRoomProfile("fixture", "room", room, "Fixture", Object.fromEntries(Object.entries(answers).map(([questionId, value]) =>
    [questionId, { questionId, value, category: "BASIC", confirmationStatus: "CONFIRMED", answerSource: "USER_SELECTED" } as StructuredAnswer])));
}
describe("Unknown and confirmed survey evidence", () => {
  it("does not invent a step height from a yes/no report", () => {
    const value = profile("BATHROOM", { BATH_010: "YES" });
    expect(value.floor.levelDifferenceCm).toBeNull();
    expect(evaluateConfirmedVisionProfile(value).ruleEvaluations.find(r => r.ruleId === "RISK-007")?.state).toBe("NEEDS_VERIFICATION");
  });
  it("keeps missing height unknown when the question was not answered", () => {
    expect(profile("BATHROOM", {}).floor.levelDifferenceCm).toBeNull();
  });
  it.each([["BEDROOM", "BED_009"], ["BATHROOM", "BATH_009"]] as const)("keeps a confirmed negative obstacle answer in %s", (room, question) => {
    const value = profile(room, { [question]: "NO" });
    expect(value.obstacles.present).toBe(false);
    // No width measurement was supplied, even with a negative obstacle report.
    expect(evaluateConfirmedVisionProfile(value).ruleEvaluations.find(r => r.ruleId === "RISK-003")?.state).toBe("NEEDS_VERIFICATION");
  });
  it("does not store UNKNOWN as a physical grab-bar location", () => {
    const value = profile("BATHROOM", { BATH_005: "YES", BATH_006: "UNKNOWN" });
    expect(value.grabBars.locations).toEqual([]);
    expect(evaluateConfirmedVisionProfile(value).ruleEvaluations.find(r => r.ruleId === "RISK-006")?.state).toBe("NEEDS_VERIFICATION");
  });
});

describe("JPEG metadata before serving inference", () => {
  it("removes all APP1 headers including a second metadata segment", () => {
    const segment = Buffer.from([255, 225, 0, 8, 69, 120, 105, 102, 0, 0]);
    const image = Buffer.concat([Buffer.from([255, 216]), segment, segment, Buffer.from([255, 217])]);
    expect(stripExifMetadata(image)).toEqual(Buffer.from([255, 216, 255, 217]));
  });
  it("does not parse compressed scan bytes as metadata", () => {
    const image = Buffer.from([255, 216, 255, 218, 0, 2, 255, 225, 1, 2, 3]);
    expect(stripExifMetadata(image)).toEqual(image);
  });
  it("rejects malformed JPEG metadata rather than forwarding it", () => {
    expect(() => stripExifMetadata(Buffer.from([255, 216, 255, 225, 255, 255]))).toThrow();
  });
});
