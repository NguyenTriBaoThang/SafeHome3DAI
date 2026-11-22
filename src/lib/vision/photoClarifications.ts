import type { VisionClarificationQuestion } from "./types";
import { getQuestionBankByRoomType } from "../survey/questionBank";

/** Use the canonical question bank rather than assigning different meanings to survey IDs. */
export function createPhotoClarifications(roomId: string, roomType = "BEDROOM"): VisionClarificationQuestion[] {
  const ids = new Set(roomType === "BATHROOM" ? ["BATH_003", "BATH_004", "BATH_005", "BATH_006", "BATH_007", "BATH_008", "BATH_009", "BATH_010"]
    : ["BED_004", "BED_005", "BED_006", "BED_007", "BED_008", "BED_009", "BED_012"]);
  return getQuestionBankByRoomType(roomType).filter(q => ids.has(q.questionId)).map(q => ({
    id: `clarify_${crypto.randomUUID()}`, roomId, surveyQuestionId: q.questionId, questionText: q.questionText,
    helpText: q.helpText, options: (q.options || []).map(o => ({ value: o.value, label: o.label })),
    status: "PENDING", createdAt: new Date().toISOString(),
  }));
}
