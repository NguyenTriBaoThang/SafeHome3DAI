import { prisma } from "@/lib/database/prisma";
import type { PrismaClient } from "@prisma/client";
import type { VisionRoomFact } from "./types";
import { interpretVisionAnswer } from "./visionAnswerContract";
import { syncVisionAnswersInTransaction } from "./surveySyncAdapter";

export function mapClarificationToRoomFacts(roomId: string, questionId: string, answer: string, evidenceReference: string): VisionRoomFact[] {
  const interpreted = interpretVisionAnswer(questionId, answer);
  return interpreted.facts.map(f => ({ fieldPath: f.fieldPath, proposedValue: f.value, confirmedValue: f.value,
    source: "USER_CONFIRMED_VISION", verificationStatus: f.value === null ? "PENDING_REVIEW" : "CONFIRMED",
    evidenceReference, updatedAt: new Date().toISOString() }));
}

/** Answer, derived facts and canonical profile change atomically, including retractions. */
export async function saveClarificationAnswer(id: string, raw: string, database: PrismaClient = prisma): Promise<{ success: boolean; facts: VisionRoomFact[]; error?: string }> {
  try {
    return await database.$transaction(async tx => {
      const question = await tx.visionClarification.findUnique({ where: { id } });
      if (!question) throw new Error("Không tìm thấy câu hỏi xác nhận.");
      const interpreted = interpretVisionAnswer(question.surveyQuestionId, raw);
      const options = JSON.parse(question.optionsJson);
      if (!Array.isArray(options) || (interpreted.known && !options.some(o => o.value === raw.trim().toUpperCase()))) {
        throw new Error("Câu trả lời không có trong lựa chọn của câu hỏi.");
      }
      await tx.visionClarification.update({ where: { id }, data: { status: "ANSWERED", userResponse: interpreted.answer } });
      // Withdraw only facts owned by this answer; do not erase a different user's evidence.
      await tx.visionRoomFact.updateMany({ where: { roomId: question.roomId, evidenceReference: id },
        data: { confirmedValue: null, verificationStatus: "PENDING_REVIEW" } });
      const facts = mapClarificationToRoomFacts(question.roomId, question.surveyQuestionId, interpreted.answer, id);
      for (const fact of facts) {
        const data = { proposedValue: JSON.stringify(fact.proposedValue), confirmedValue: JSON.stringify(fact.confirmedValue),
          evidenceReference: id, verificationStatus: fact.verificationStatus };
        await tx.visionRoomFact.upsert({ where: { roomId_fieldPath: { roomId: question.roomId, fieldPath: fact.fieldPath } },
          create: { roomId: question.roomId, fieldPath: fact.fieldPath, ...data }, update: data });
      }
      await syncVisionAnswersInTransaction(tx, question.roomId);
      await tx.visionAuditEvent.create({ data: { roomId: question.roomId, actionType: "CLARIFICATION_ANSWERED", objectId: id,
        oldValue: question.userResponse, newValue: interpreted.answer, actorId: "USER" } });
      return { success: true, facts };
    }, { timeout: 15000 });
  } catch (error) {
    return { success: false, facts: [], error: error instanceof Error ? error.message : "Không lưu được câu trả lời." };
  }
}
