import {
  AssessmentInput,
  AssessmentSnapshot,
  RuleEvaluationResult,
  RiskFinding,
  RiskRecommendation,
} from "./types";
import { ALL_VERSIONED_RULES } from "./riskRuleRegistry";
import { normalizeRoomAssessmentInput } from "./inputAdapter";

/**
 * Runs the deterministic Risk Rule Engine on a room input.
 * Evaluates all 8 versioned environmental hazard rules.
 */
export function evaluateRoomHazards(rawInput: any): AssessmentSnapshot {
  const input: AssessmentInput = normalizeRoomAssessmentInput(rawInput);
  const evaluations: RuleEvaluationResult[] = [];
  const findings: RiskFinding[] = [];
  const recommendations: RiskRecommendation[] = [];

  for (const rule of ALL_VERSIONED_RULES) {
    const result = rule.evaluate(input);
    evaluations.push(result);

    if (result.finding && result.state === "DETECTED") {
      findings.push(result.finding);
    }
    if (result.recommendation && result.state === "DETECTED") {
      recommendations.push(result.recommendation);
    }
  }

  // Count metrics
  let highPriorityCount = 0;
  let mediumPriorityCount = 0;
  let lowPriorityCount = 0;
  let needsVerificationCount = 0;
  let detectedCount = 0;

  for (const ev of evaluations) {
    if (ev.state === "DETECTED") {
      detectedCount++;
      if (ev.priority === "HIGH") highPriorityCount++;
      else if (ev.priority === "MEDIUM") mediumPriorityCount++;
      else if (ev.priority === "LOW") lowPriorityCount++;
    } else if (ev.state === "NEEDS_VERIFICATION") {
      needsVerificationCount++;
    }
  }

  // Calculate heuristic safety score (0-100)
  // High penalty: 15pts, Medium: 8pts, Low: 4pts, NeedsVerification: 3pts
  let calculatedScore = 100;
  calculatedScore -= highPriorityCount * 15;
  calculatedScore -= mediumPriorityCount * 8;
  calculatedScore -= lowPriorityCount * 4;
  calculatedScore -= needsVerificationCount * 3;

  const safetyScore = Math.max(10, Math.min(100, Math.round(calculatedScore)));

  const snapshotId = `snapshot-${input.roomId}-${Date.now()}`;

  return {
    id: snapshotId,
    roomId: input.roomId,
    roomName: input.roomName,
    roomType: input.roomType,
    snapshotType: "BASELINE",
    createdAt: new Date().toISOString(),
    safetyScore,
    totalRulesEvaluated: ALL_VERSIONED_RULES.length,
    detectedCount,
    needsVerificationCount,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    ruleEvaluations: evaluations,
    findings,
    recommendations,
    input,
  };
}

