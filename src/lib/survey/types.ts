import { z } from "zod";

export type RoomType = "BEDROOM" | "BATHROOM" | "LIVING_ROOM" | "KITCHEN";

export type AnswerType =
  | "YES_NO"
  | "SINGLE_CHOICE"
  | "MULTI_CHOICE"
  | "DIMENSIONS"
  | "NUMBER"
  | "TEXT";

export type AnswerSource =
  | "USER_SELECTED"
  | "USER_FREE_TEXT"
  | "USER_ESTIMATED"
  | "NLP_EXTRACTED"
  | "VISION_SUGGESTED"
  | "IMPORTED_MEASUREMENT";

export type ConfirmationStatus =
  | "CONFIRMED"
  | "PENDING_CONFIRMATION"
  | "UNKNOWN";

export type QuestionCategory =
  | "BASIC"
  | "LIGHTING"
  | "FLOOR"
  | "CABLE"
  | "OBSTACLE"
  | "GRAB_BAR"
  | "ACCESSIBILITY"
  | "ADDITIONAL";

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
  isUnknown?: boolean;
}

export type ConditionalOperator =
  | "EQUALS"
  | "NOT_EQUALS"
  | "IN"
  | "NOT_IN"
  | "EXISTS";

export interface ConditionalRule {
  dependsOnQuestionId: string;
  operator: ConditionalOperator;
  expectedValue: any;
}

export interface ValidationRule {
  min?: number;
  max?: number;
  required?: boolean;
  pattern?: string;
  message?: string;
}

export interface SurveyQuestion {
  questionId: string;
  roomType: RoomType;
  category: QuestionCategory;
  questionText: string;
  helpText?: string;
  answerType: AnswerType;
  options?: QuestionOption[];
  conditionalRules?: ConditionalRule[];
  validationRules?: ValidationRule;
  required: boolean;
  priority: number;
  sourceReferenceIds?: string[];
  version: string;
}

export interface StructuredAnswer {
  questionId: string;
  category: string;
  value: any;
  answerSource: AnswerSource;
  confirmationStatus: ConfirmationStatus;
  timestamp?: string;
}

export interface DimensionValue {
  lengthM: number | null;
  widthM: number | null;
  heightM?: number | null;
  isUnknown?: boolean;
}

export type FindingPriority =
  | "CAN_UU_TIEN_KIEM_TRA"
  | "NEN_XEM_XET_CAI_THIEN"
  | "CAN_THEM_THONG_TIN";

export interface SurveyFindingItem {
  ruleId: string;
  title: string;
  category: string;
  priority: FindingPriority;
  priorityLabel: string;
  observedEvidence: string;
  explanation: string;
  suggestedAction: string;
  supportingSourceIds: string[];
}

export interface RoomProfile {
  id: string;
  surveyId: string;
  roomId: string;
  roomType: RoomType;
  roomName: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "NEEDS_CONFIRMATION" | "COMPLETED";
  surveyVersion: string;
  dimensions: {
    lengthM: number | null;
    widthM: number | null;
    heightM: number | null;
    measurementSource: AnswerSource;
    measurementConfidenceType: "ESTIMATED" | "MEASURED" | "DEMO_DEFAULT" | "UNKNOWN";
  };
  floor: {
    material: string;
    isWetReported: boolean | null;
    isSlipperyReported: boolean | null;
    levelDifferenceReported: boolean | null;
    levelDifferenceCm: number | null;
  };
  lighting: {
    adequateAtNight: boolean | null;
    nightLightPresent: boolean | null;
    generalLightingAdequate: boolean | null;
    sourceQuestionIds: string[];
  };
  rugs: {
    present: boolean | null;
    secured: boolean | null;
    locations: string[];
    sourceQuestionIds: string[];
  };
  electricalCables: {
    onWalkway: boolean | null;
    sourceQuestionIds: string[];
  };
  obstacles: {
    present: boolean | null;
    types: string[];
    descriptions: string;
    sourceQuestionIds: string[];
  };
  grabBars: {
    present: boolean | null;
    locations: string[];
    inspected: boolean | null;
    sourceQuestionIds: string[];
  };
  accessibilityObservations: {
    bedMobilityDifficulty: boolean | null;
    bathMobilityDifficulty: boolean | null;
    reachingDifficulty: boolean | null;
  };
  reportedConcerns: string[];
  completenessScore: number; // 0 - 100%
  updatedAt: string;
}

export interface SceneDraftObject {
  id: string;
  modelType: string;
  name: string;
  category: string;
  suggestedPosition: [number, number, number];
  suggestedDimensions: [number, number, number];
  isHazardSource?: boolean;
  requiresPlacementConfirmation: boolean;
}

export interface SceneDraft {
  roomId: string;
  roomType: string;
  roomName: string;
  approximateDimensions: {
    length: number;
    width: number;
    height: number;
    isDemoFallback: boolean;
  };
  objects: SceneDraftObject[];
  environmentalProperties: {
    lightingLux: number;
    floorMaterial: string;
    isWet: boolean;
    isSlippery: boolean;
  };
  objectPlacementStatus: "DRAFT_AUTO_GENERATED" | "USER_CONFIRMED";
  unresolvedMeasurements: string[];
  dataProvenance: Record<string, AnswerSource>;
}

export interface NLPInterpretationProposal {
  questionId: string;
  extractedValue: any;
  confidenceScore: number;
  clarificationMessage?: string;
  needsUserConfirmation: boolean;
  rationale: string;
}

