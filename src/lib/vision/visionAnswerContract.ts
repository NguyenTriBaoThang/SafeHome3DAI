import { getQuestionById } from "../survey/questionBank";

export interface FactValue { fieldPath: string; value: unknown }
export interface SurveyValue { questionId: string; category: string; value: string }
export interface InterpretedAnswer { answer: string; known: boolean; facts: FactValue[]; survey: SurveyValue[] }

export function interpretVisionAnswer(questionId: string, raw: unknown): InterpretedAnswer {
  if (typeof raw !== "string") throw new Error("Câu trả lời phải là chuỗi.");
  const answer = raw.trim().toUpperCase() || "UNKNOWN";
  const known = !["UNKNOWN", "UNLABELED"].includes(answer);
  const result: InterpretedAnswer = { answer: known ? answer : "UNKNOWN", known, facts: [], survey: [] };
  const fact = (fieldPath: string, value: unknown) => { result.facts.push({ fieldPath, value }); };
  const survey = (id: string, value: string) => {
    const question = getQuestionById(id);
    if (!question) throw new Error("Không có câu hỏi khảo sát tương ứng.");
    result.survey.push({ questionId: id, category: question.category, value });
  };
  const bool = (fieldPath: string, id = questionId) => {
    if (known && !["YES", "NO"].includes(answer)) throw new Error("Câu trả lời không hợp lệ.");
    if (known) fact(fieldPath, answer === "YES");
    survey(id, known ? answer : "UNKNOWN");
  };
  if (questionId === "BED_007") {
    const value = answer === "SECURED" ? "YES" : answer === "UNSECURED" ? "NO" : answer;
    if (known && !["YES", "NO"].includes(value)) throw new Error("Câu trả lời cố định thảm không hợp lệ.");
    if (known) fact("rugs.secured", value === "YES");
    survey(questionId, known ? value : "UNKNOWN");
  } else if (questionId === "BATH_005") {
    if (known && !["YES", "NO", "NONE", "BOTH", "TOILET_ONLY", "SHOWER_ONLY"].includes(answer)) throw new Error("Câu trả lời tay vịn không hợp lệ.");
    const present = !["NO", "NONE"].includes(answer);
    if (known) fact("grabBars.present", present);
    survey("BATH_005", known ? present ? "YES" : "NO" : "UNKNOWN");
    if (!known || answer !== "YES") {
      const locations = !known ? null : !present ? [] : answer === "BOTH" ? ["TOILET", "SHOWER"] : [answer === "TOILET_ONLY" ? "TOILET" : "SHOWER"];
      if (locations) {
        fact("grabBars.locations", locations);
        fact("grabBars.count", locations.length);
        fact("grabBars.toiletGrabBarPresent", locations.includes("TOILET"));
        fact("grabBars.showerGrabBarPresent", locations.includes("SHOWER"));
      }
      survey("BATH_006", !locations?.length ? "UNKNOWN" : locations.length === 2 ? "BOTH" : locations[0]);
    }
  } else if (questionId === "BATH_006") {
    if (known && !["TOILET", "SHOWER", "BOTH", "OTHER"].includes(answer)) throw new Error("Vị trí tay vịn không hợp lệ.");
    if (known) {
      const locations = answer === "BOTH" ? ["TOILET", "SHOWER"] : [answer];
      fact("grabBars.locations", locations);
      fact("grabBars.count", answer === "OTHER" ? null : locations.length);
      fact("grabBars.toiletGrabBarPresent", locations.includes("TOILET"));
      fact("grabBars.showerGrabBarPresent", locations.includes("SHOWER"));
    }
    survey(questionId, known ? answer : "UNKNOWN");
  } else if (questionId === "BATH_007") {
    if (known && !["CHECKED", "NOT_CHECKED"].includes(answer)) throw new Error("Câu trả lời kiểm tra tay vịn không hợp lệ.");
    if (known) fact("grabBars.inspected", answer === "CHECKED");
    survey(questionId, known ? answer : "UNKNOWN");
  } else if (questionId === "BATH_003" && ["SLIPPERY_NO_MAT", "HAS_NON_SLIP_MAT", "NON_SLIP_TILE"].includes(answer)) {
    // Legacy combined question never established whether the floor is currently wet.
    fact("floor.hasNonSlipMat", answer === "HAS_NON_SLIP_MAT");
    if (answer !== "HAS_NON_SLIP_MAT") fact("floor.isSlipperyReported", answer === "SLIPPERY_NO_MAT");
    if (answer === "NON_SLIP_TILE") fact("floor.isSlipResistantReported", true);
    survey("BATH_003", "UNKNOWN");
    survey("BATH_004", answer === "HAS_NON_SLIP_MAT" ? "UNKNOWN" : answer === "SLIPPERY_NO_MAT" ? "YES" : "NO");
  } else {
    const fields: Record<string, string> = { BED_006: "rugs.present", BED_008: "electricalCables.onWalkway",
      BED_004: "lighting.adequateAtNight", BED_005: "lighting.nightLightPresent", BED_009: "obstacles.present",
      BED_012: "accessibilityObservations.reachingDifficulty", BATH_003: "floor.isWetReported",
      BATH_004: "floor.isSlipperyReported", BATH_008: "lighting.generalLightingAdequate",
      BATH_009: "obstacles.present", BATH_010: "floor.levelDifferenceReported" };
    if (!fields[questionId]) {
      if (!known) return result;
      throw new Error("Câu hỏi chưa hỗ trợ đồng bộ dữ kiện.");
    }
    bool(fields[questionId]);
    if (questionId === "BED_006" && answer === "NO") fact("rugs.secured", null);
    // Historical bathroom combo could have synchronized either question.
    if (questionId === "BATH_003" && !known) survey("BATH_004", "UNKNOWN");
  }
  return result;
}
