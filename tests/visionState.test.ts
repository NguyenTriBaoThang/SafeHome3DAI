import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { saveClarificationAnswer } from "@/lib/vision/clarificationEngine";
import { syncConfirmedVisionFactsToSurvey, triggerRiskAssessmentFromVision } from "@/lib/vision/surveySyncAdapter";
import { interpretVisionAnswer } from "@/lib/vision/visionAnswerContract";
import { createPhotoClarifications } from "@/lib/vision/photoClarifications";
import { hydrateVisionAnalysis, persistVisionAnalysis } from "@/lib/vision/visionPersistence";
import type { ProviderAnalysisResult } from "@/lib/vision/visionProvider";

let db: PrismaClient, directory: string;
const files: string[] = [];
const scratch = path.resolve(".scratch");
beforeAll(async () => {
  fs.mkdirSync(scratch, { recursive: true });
  directory = fs.mkdtempSync(path.join(scratch, "vision-state-"));
  // Prisma 5's Windows schema engine needs an existing SQLite file at an absolute URL.
  fs.writeFileSync(path.join(directory, "fixture.db"), "", { flag: "wx" });
  const url = `file:${path.join(directory, "fixture.db").replace(/\\/g, "/")}`;
  execFileSync(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "db", "push", "--skip-generate", "--schema", path.resolve("prisma/schema.prisma")],
    { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe", timeout: 45000, windowsHide: true });
  db = new PrismaClient({ datasources: { db: { url } } });
}, 60000);
afterAll(async () => {
  await db?.$disconnect();
  for (const name of files) if (fs.existsSync(name)) fs.unlinkSync(name);
  if (directory && path.dirname(directory) === scratch && path.basename(directory).startsWith("vision-state-")) fs.rmSync(directory, { recursive: true, force: true });
});

async function room(type = "BATHROOM") {
  const id = crypto.randomUUID();
  await db.surveyRoom.create({ data: { id, roomType: type, name: `Fixture ${type}`, survey: { create: { name: "Isolated fixture" } } } });
  return id;
}
async function question(roomId: string, surveyQuestionId: string, values?: string[]) {
  const prototype = createPhotoClarifications(roomId, surveyQuestionId.startsWith("BED") ? "BEDROOM" : "BATHROOM")
    .find(q => q.surveyQuestionId === surveyQuestionId)!;
  return db.visionClarification.create({ data: { id: crypto.randomUUID(), roomId, surveyQuestionId,
    questionText: prototype.questionText, optionsJson: JSON.stringify(values?.map(value => ({ value })) || prototype.options) } });
}
const answer = async (id: string, value: string) => {
  const result = await saveClarificationAnswer(id, value, db);
  expect(result.success, result.error).toBe(true);
  return result;
};
const profile = async (roomId: string) => JSON.parse((await db.surveyRoomProfile.findUniqueOrThrow({ where: { roomId } })).profileJson);

describe("Stateful vision answers on a new isolated SQLite database", () => {
  it("retracts a confirmed answer, canonical survey value and finding when changed to unknown", async () => {
    const id = await room(), q = await question(id, "BATH_005");
    await answer(q.id, "NO");
    expect((await triggerRiskAssessmentFromVision(id, db)).ruleEvaluations.find(r => r.ruleId === "RISK-006")?.state).toBe("DETECTED");
    await answer(q.id, "UNKNOWN");
    const fact = await db.visionRoomFact.findUniqueOrThrow({ where: { roomId_fieldPath: { roomId: id, fieldPath: "grabBars.present" } } });
    expect(fact.confirmedValue).toBeNull(); expect(fact.verificationStatus).toBe("PENDING_REVIEW");
    expect((await profile(id)).grabBars.present).toBeNull();
    expect((await triggerRiskAssessmentFromVision(id, db)).ruleEvaluations.find(r => r.ruleId === "RISK-006")?.state).toBe("NEEDS_VERIFICATION");
    const saved = await db.surveyAnswer.findUniqueOrThrow({ where: { roomId_questionId: { roomId: id, questionId: "BATH_005" } } });
    expect(JSON.parse(saved.value)).toBe("UNKNOWN"); expect(saved.confirmationStatus).toBe("UNKNOWN");
  });
  it.each(["TOILET_ONLY", "SHOWER_ONLY"])("preserves legacy single-location answer %s instead of inventing BOTH", async value => {
    const id = await room(), q = await question(id, "BATH_005", ["BOTH", "TOILET_ONLY", "SHOWER_ONLY", "NONE", "UNKNOWN"]);
    await answer(q.id, value);
    expect((await profile(id)).grabBars.locations).toEqual([value === "TOILET_ONLY" ? "TOILET" : "SHOWER"]);
    const assessment = await triggerRiskAssessmentFromVision(id, db);
    expect(assessment.ruleEvaluations.find(r => r.ruleId === "RISK-006")?.state).toBe("DETECTED");
    expect(assessment.safetyScore).toBeNull();
  });
  it("round-trips canonical presence, locations and inspection, then retracts their parent", async () => {
    const id = await room();
    const present = await question(id, "BATH_005"), locations = await question(id, "BATH_006"), inspection = await question(id, "BATH_007");
    await answer(present.id, "YES"); await answer(locations.id, "BOTH");
    expect((await triggerRiskAssessmentFromVision(id, db)).ruleEvaluations.find(r => r.ruleId === "RISK-006")?.state).toBe("NEEDS_VERIFICATION");
    await answer(inspection.id, "CHECKED");
    expect((await triggerRiskAssessmentFromVision(id, db)).ruleEvaluations.find(r => r.ruleId === "RISK-006")?.state).toBe("NOT_DETECTED");
    await answer(present.id, "UNKNOWN");
    expect((await triggerRiskAssessmentFromVision(id, db)).ruleEvaluations.find(r => r.ruleId === "RISK-006")?.state).toBe("NEEDS_VERIFICATION");
  });
  it("does not revive old child answers after a parent changes from no to yes", async () => {
    const id = await room();
    const present = await question(id, "BATH_005"), locations = await question(id, "BATH_006");
    await answer(present.id, "YES"); await answer(locations.id, "BOTH");
    await db.visionClarification.update({ where: { id: locations.id }, data: { updatedAt: new Date(0) } });
    await answer(present.id, "NO"); await answer(present.id, "YES");
    expect((await profile(id)).grabBars.locations).not.toContain("TOILET");
  });
  it("preserves a newer independent survey answer and a different room", async () => {
    const a = await room(), b = await room();
    const qa = await question(a, "BATH_005"), qb = await question(b, "BATH_005");
    await answer(qa.id, "NO"); await answer(qb.id, "NO");
    await db.surveyAnswer.update({ where: { roomId_questionId: { roomId: a, questionId: "BATH_005" } },
      data: { value: JSON.stringify("YES"), answerSource: "USER_SELECTED", confirmationStatus: "CONFIRMED", updatedAt: new Date(Date.now() + 10000) } });
    await answer(qa.id, "UNKNOWN");
    expect((await profile(a)).grabBars.present).toBe(true);
    expect((await profile(b)).grabBars.present).toBe(false);
  });
  it("does not retract a fact whose evidence was replaced by another answer", async () => {
    const id = await room();
    const old = await question(id, "BATH_005"), current = await question(id, "BATH_005");
    await answer(old.id, "NO"); await answer(current.id, "YES"); await answer(old.id, "UNKNOWN");
    const fact = await db.visionRoomFact.findUniqueOrThrow({ where: { roomId_fieldPath: { roomId: id, fieldPath: "grabBars.present" } } });
    expect(fact.evidenceReference).toBe(current.id); expect(fact.verificationStatus).toBe("CONFIRMED");
  });
  it("rejects invalid choices without partially changing stored answers or facts", async () => {
    const id = await room(), q = await question(id, "BATH_005");
    await answer(q.id, "NO");
    const failed = await saveClarificationAnswer(q.id, "unexpected", db);
    expect(failed.success).toBe(false);
    expect((await db.visionClarification.findUniqueOrThrow({ where: { id: q.id } })).userResponse).toBe("NO");
    expect((await profile(id)).grabBars.present).toBe(false);
  });
  it("treats malformed historical answers as unknown without blocking valid corrections", async () => {
    const id = await room(), current = await question(id, "BATH_005");
    await db.visionClarification.create({ data: { roomId: id, surveyQuestionId: "BATH_003", questionText: "Legacy fixture",
      optionsJson: "[]", status: "ANSWERED", userResponse: "INVALID_LEGACY_ENUM" } });
    await answer(current.id, "NO");
    expect((await profile(id)).floor.isWetReported).toBeNull();
    expect((await profile(id)).grabBars.present).toBe(false);
  });
  it("maps unsecured rugs to canonical NO, preserving the profile's false value", async () => {
    const id = await room("BEDROOM"), present = await question(id, "BED_006"), secured = await question(id, "BED_007", ["SECURED", "UNSECURED", "UNKNOWN"]);
    await answer(present.id, "YES"); await answer(secured.id, "UNSECURED");
    expect((await profile(id)).rugs.secured).toBe(false);
    expect(JSON.parse((await db.surveyAnswer.findUniqueOrThrow({ where: { roomId_questionId: { roomId: id, questionId: "BED_007" } } })).value)).toBe("NO");
  });
  it("does not turn a mat into a claim about wetness or friction", async () => {
    const id = await room(), q = await question(id, "BATH_003", ["SLIPPERY_NO_MAT", "HAS_NON_SLIP_MAT", "UNKNOWN"]);
    await answer(q.id, "SLIPPERY_NO_MAT"); await answer(q.id, "HAS_NON_SLIP_MAT");
    const saved = await profile(id);
    expect(saved.floor.isWetReported).toBeNull(); expect(saved.floor.isSlipperyReported).toBeNull();
    expect((await triggerRiskAssessmentFromVision(id, db)).ruleEvaluations.find(r => r.ruleId === "RISK-005")?.state).toBe("NEEDS_VERIFICATION");
  });
  it("fails reassessment when the room does not exist instead of evaluating default bedroom data", async () => {
    await expect(triggerRiskAssessmentFromVision("missing", db)).rejects.toThrow();
  });
  it("retains null legacy labels as unknown, not negative survey answers", () => {
    expect(interpretVisionAnswer("BED_007", "unknown").survey[0].value).toBe("UNKNOWN");
    expect(() => interpretVisionAnswer("BATH_005", "bad-choice")).toThrow();
  });
  it("persists image, boxes, questions and provider provenance together, then hydrates them", async () => {
    const roomId = crypto.randomUUID(), imageId = crypto.randomUUID(), analysisId = crypto.randomUUID(), now = new Date().toISOString();
    const result: ProviderAnalysisResult = { id: analysisId, roomId, imageId, modelId: "fixture-model", modelVersion: "structured-serving-v1",
      analysisStatus: "COMPLETED", startedAt: now, completedAt: now, detections: [{ id: crypto.randomUUID(), analysisId, imageId,
        category: "bed", originalLabel: "Bed fixture", confidence: .8, bbox: { xMin: .1, yMin: .2, xMax: .8, yMax: .9 },
        source: "VISION_LANGUAGE_MODEL", verificationStatus: "PENDING_REVIEW", createdAt: now, updatedAt: now }], observations: [],
      clarifications: createPhotoClarifications(roomId, "BEDROOM"), provider: "gemini", risk_supported: false,
      providerMetadata: { recipeId: "fixture", recipeSha256: "a".repeat(64), referenceConfigId: "reference", modelVersion: "fixture-model", latencyMs: 1, objectThreshold: .5 } };
    const photo = Buffer.from([255, 216, 255, 224, 0, 2, 255, 217]);
    const file = await persistVisionAnalysis(result, photo, "Private fixture", "BEDROOM", "ENTRANCE", db);
    files.push(path.join(process.cwd(), "public/uploads/vision", file.filename));
    const saved = await db.visionAnalysis.findUniqueOrThrow({ where: { id: analysisId }, include: { detections: true, observations: { include: { clarifications: true } } } });
    const hydrated = hydrateVisionAnalysis(saved);
    expect(hydrated.detections[0].bbox).toEqual(result.detections[0].bbox);
    expect(hydrated.clarifications).toHaveLength(result.clarifications.length);
    expect(hydrated.providerMetadata.recipeId).toBe("fixture");
    expect(hydrated.observations).toEqual([]);
    expect((await db.surveyRoom.findUniqueOrThrow({ where: { id: roomId } })).roomType).toBe("BEDROOM");
  });
});
