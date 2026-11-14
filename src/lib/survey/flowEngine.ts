import {
  SurveyQuestion,
  StructuredAnswer,
  RoomType,
  ConditionalRule,
} from "./types";
import { getQuestionBankByRoomType, getQuestionById } from "./questionBank";

export interface SurveyProgressResult {
  totalApplicable: number;
  answeredCount: number;
  progressPercent: number;
  isComplete: boolean;
  unresolvedRequiredCount: number;
  currentQuestion: SurveyQuestion | null;
}

/**
 * Checks whether a question is currently applicable based on existing answers.
 */
export function isQuestionApplicable(
  question: SurveyQuestion,
  answersMap: Record<string, StructuredAnswer>
): boolean {
  if (!question.conditionalRules || question.conditionalRules.length === 0) {
    return true;
  }

  return question.conditionalRules.every((rule) => {
    const parentAnswer = answersMap[rule.dependsOnQuestionId];
    if (!parentAnswer || parentAnswer.value === undefined || parentAnswer.value === null) {
      return false;
    }

    const parentVal = parentAnswer.value;

    switch (rule.operator) {
      case "EQUALS":
        return parentVal === rule.expectedValue;
      case "NOT_EQUALS":
        return parentVal !== rule.expectedValue;
      case "IN":
        return Array.isArray(rule.expectedValue) && rule.expectedValue.includes(parentVal);
      case "NOT_IN":
        return Array.isArray(rule.expectedValue) && !rule.expectedValue.includes(parentVal);
      case "EXISTS":
        return parentVal !== undefined && parentVal !== null;
      default:
        return true;
    }
  });
}

/**
 * Retrieves all currently applicable questions for a room in priority order.
 */
export function getApplicableQuestions(
  roomType: string,
  answersMap: Record<string, StructuredAnswer>
): SurveyQuestion[] {
  const bank = getQuestionBankByRoomType(roomType);
  return bank
    .filter((q) => isQuestionApplicable(q, answersMap))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Gets the next unanswered applicable question.
 */
export function getNextQuestion(
  roomType: string,
  answersMap: Record<string, StructuredAnswer>
): SurveyQuestion | null {
  const applicable = getApplicableQuestions(roomType, answersMap);
  const unanswered = applicable.find((q) => {
    const ans = answersMap[q.questionId];
    return !ans || ans.value === undefined || ans.value === null;
  });

  return unanswered || null;
}

/**
 * Calculates survey progress based strictly on CURRENTLY APPLICABLE questions.
 * Conditional questions that are not applicable are excluded from the denominator.
 */
export function calculateSurveyProgress(
  roomType: string,
  answersMap: Record<string, StructuredAnswer>
): SurveyProgressResult {
  const applicable = getApplicableQuestions(roomType, answersMap);
  const totalApplicable = applicable.length;

  if (totalApplicable === 0) {
    return {
      totalApplicable: 0,
      answeredCount: 0,
      progressPercent: 100,
      isComplete: true,
      unresolvedRequiredCount: 0,
      currentQuestion: null,
    };
  }

  let answeredCount = 0;
  let unresolvedRequiredCount = 0;

  for (const q of applicable) {
    const ans = answersMap[q.questionId];
    const isAnswered = ans !== undefined && ans.value !== undefined && ans.value !== null;

    if (isAnswered) {
      answeredCount++;
    } else if (q.required) {
      unresolvedRequiredCount++;
    }
  }

  const progressPercent = Math.min(100, Math.round((answeredCount / totalApplicable) * 100));
  const nextQ = getNextQuestion(roomType, answersMap);
  const isComplete = nextQ === null && unresolvedRequiredCount === 0;

  return {
    totalApplicable,
    answeredCount,
    progressPercent,
    isComplete,
    unresolvedRequiredCount,
    currentQuestion: nextQ,
  };
}

/**
 * Finds all question IDs in the bank that depend directly on a given parent question.
 */
export function findDirectDependentQuestionIds(
  questionId: string,
  roomType: string
): string[] {
  const bank = getQuestionBankByRoomType(roomType);
  return bank
    .filter((q) =>
      q.conditionalRules?.some((rule) => rule.dependsOnQuestionId === questionId)
    )
    .map((q) => q.questionId);
}

/**
 * Automatically detects and invalidates stale dependent answers when a parent condition changes.
 * E.g., if rugPresent changes from "YES" to "NO", BED_007 (rug secured) becomes invalid.
 */
export function invalidateStaleAnswers(
  roomType: string,
  currentAnswersMap: Record<string, StructuredAnswer>,
  changedQuestionId: string,
  newAnswerValue: any
): {
  updatedAnswersMap: Record<string, StructuredAnswer>;
  invalidatedQuestionIds: string[];
} {
  const updatedAnswersMap = { ...currentAnswersMap };

  // Set or update the changed answer
  const existing = updatedAnswersMap[changedQuestionId];
  const qMeta = getQuestionById(changedQuestionId);
  updatedAnswersMap[changedQuestionId] = {
    questionId: changedQuestionId,
    category: qMeta?.category || "BASIC",
    value: newAnswerValue,
    answerSource: existing?.answerSource || "USER_SELECTED",
    confirmationStatus: existing?.confirmationStatus || "CONFIRMED",
    timestamp: new Date().toISOString(),
  };

  const invalidatedQuestionIds: string[] = [];

  // Check all questions in the bank to see if their applicability changed to false
  const bank = getQuestionBankByRoomType(roomType);
  for (const q of bank) {
    // If the question is not the one we just edited and has an answer recorded
    if (q.questionId !== changedQuestionId && updatedAnswersMap[q.questionId]) {
      const stillApplicable = isQuestionApplicable(q, updatedAnswersMap);
      if (!stillApplicable) {
        delete updatedAnswersMap[q.questionId];
        invalidatedQuestionIds.push(q.questionId);
      }
    }
  }

  return {
    updatedAnswersMap,
    invalidatedQuestionIds,
  };
}

