import { prisma } from "@/lib/database/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { buildRoomProfile } from "@/lib/survey/profileBuilder";
import { interpretVisionAnswer, type SurveyValue } from "./visionAnswerContract";
import { evaluateConfirmedVisionProfile } from "./confirmedRiskAssessment";

/** Also called inside answer transactions so an unknown edit cannot leave stale survey facts. */
export async function syncVisionAnswersInTransaction(tx: Prisma.TransactionClient, roomId: string) {
  const room = await tx.surveyRoom.findUnique({ where: { id: roomId } });
  if (!room) return { success: true, updatedProfile: null, count: 0 };
  const questions = await tx.visionClarification.findMany({ where: { roomId, status: "ANSWERED" }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }] });
  const candidates = new Map<string, SurveyValue & { at: Date }>();
  for (const question of questions) {
    if (!question.userResponse) continue;
    let answer;
    try { answer = interpretVisionAnswer(question.surveyQuestionId, question.userResponse); }
    catch { answer = interpretVisionAnswer(question.surveyQuestionId, "UNKNOWN"); }
    for (const value of answer.survey) candidates.set(value.questionId, { ...value, at: question.updatedAt });
  }
  // Changing a parent never revives an older child answer automatically.
  for (const [parent, children] of [["BED_006", ["BED_007"]], ["BATH_005", ["BATH_006", "BATH_007"]]] as const) {
    const source = candidates.get(parent);
    if (!source) continue;
    for (const id of children) {
      const child = candidates.get(id);
      if (child && (source.value !== "YES" || child.at < source.at)) candidates.set(id, { ...child, value: "UNKNOWN", at: source.at });
    }
  }
  const existing = await tx.surveyAnswer.findMany({ where: { roomId } });
  let count = 0;
  for (const value of candidates.values()) {
    const previous = existing.find(item => item.questionId === value.questionId);
    // Preserve newer independent survey answers, including explicitly unknown answers.
    if (previous && previous.answerSource !== "VISION_SUGGESTED" && previous.updatedAt >= value.at) continue;
    // Do not overwrite the user's independent answer with absence of vision evidence.
    if (value.value === "UNKNOWN" && previous && previous.answerSource !== "VISION_SUGGESTED") continue;
    const data = { category: value.category, value: JSON.stringify(value.value), answerSource: "VISION_SUGGESTED",
      confirmationStatus: value.value === "UNKNOWN" ? "UNKNOWN" : "CONFIRMED" };
    await tx.surveyAnswer.upsert({ where: { roomId_questionId: { roomId, questionId: value.questionId } },
      create: { roomId, questionId: value.questionId, ...data }, update: data });
    count++;
  }
  const allAnswers = await tx.surveyAnswer.findMany({ where: { roomId } });
  const answersMap: Record<string, any> = {};
  for (const answer of allAnswers) {
    let value: unknown = "UNKNOWN";
    if (answer.confirmationStatus === "CONFIRMED") {
      try { value = JSON.parse(answer.value); } catch { /* Invalid persisted values remain unknown. */ }
    }
    answersMap[answer.questionId] = { ...answer, value, timestamp: answer.updatedAt.toISOString() };
  }
  const updatedProfile = buildRoomProfile(room.surveyId, roomId, room.roomType as any, room.name, answersMap);
  const data = { profileJson: JSON.stringify(updatedProfile), completenessScore: updatedProfile.completenessScore };
  await tx.surveyRoomProfile.upsert({ where: { roomId }, create: { roomId, version: "1.0.0", ...data }, update: data });
  await tx.visionAuditEvent.create({ data: { roomId, actionType: "FACTS_SYNCED_TO_SURVEY",
    newValue: JSON.stringify({ syncedAnswersCount: count }), actorId: "USER" } });
  return { success: true, updatedProfile, count };
}

export async function syncConfirmedVisionFactsToSurvey(roomId: string, database: PrismaClient = prisma) {
  try { return await database.$transaction(tx => syncVisionAnswersInTransaction(tx, roomId), { timeout: 15000 }); }
  catch { return { success: false, updatedProfile: null, count: 0 }; }
}

export async function triggerRiskAssessmentFromVision(roomId: string, database: PrismaClient = prisma) {
  const result = await syncConfirmedVisionFactsToSurvey(roomId, database);
  if (!result.success) throw new Error("Không thể đồng bộ hồ sơ. Chưa thể đánh giá lại.");
  if (!result.updatedProfile) throw new Error("Phòng chưa có hồ sơ khảo sát. Hãy tạo hoặc chọn phòng khảo sát trước.");
  return evaluateConfirmedVisionProfile(result.updatedProfile);
}
