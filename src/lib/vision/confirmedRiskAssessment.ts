import crypto from "crypto";
import { ALL_VERSIONED_RULES } from "../risk/riskRuleRegistry";
import type { AssessmentInput, RuleEvaluationResult } from "../risk/types";
import type { RoomProfile } from "../survey/types";
import {
  evaluateRoomHazardsCanonical,
  CanonicalAssessmentResult,
} from "../risk/canonicalEngine";

/**
 * Evaluates confirmed vision profile using the Canonical Risk Engine (Task A03).
 * Returns standardized AssessmentResultV1.
 */
export function evaluateConfirmedVisionProfileCanonical(
  profile: RoomProfile
): CanonicalAssessmentResult {
  return evaluateRoomHazardsCanonical(profile, {
    assessmentId: `asmt-confirmed-${profile.roomId.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
    isBaseline: true,
  });
}

/**
 * Use original rules only when their inputs are known; never send default measurements.
 * Backward-compatible function returning raw rule evaluation results.
 */
export function evaluateConfirmedVisionProfile(profile: RoomProfile) {
  const input = {
    roomId: profile.roomId,
    roomName: profile.roomName,
    roomType: profile.roomType,
    floor: {},
    lighting: {},
    rugs: { present: null, items: [] },
    cables: { crossingWalkway: null, items: [] },
    obstacles: { present: null, items: [] },
    grabBars: {},
    accessibility: {},
  } as unknown as AssessmentInput;

  const ready = new Set<string>();
  if (profile.rugs.present === false) {
    input.rugs.present = false;
    ready.add("RISK-001");
  }
  // Presence alone does not establish fixation, location or protection of a cable.
  if (profile.electricalCables.onWalkway === false) {
    input.cables.crossingWalkway = false;
    ready.add("RISK-002");
  }
  if (profile.obstacles.present === false) {
    input.obstacles.present = false;
    // No width was measured, so RISK-003 remains unknown.
  }
  if (profile.floor.isWetReported !== null && profile.floor.isSlipperyReported !== null) {
    input.floor.isWet = profile.floor.isWetReported;
    input.floor.isSlipResistant = !profile.floor.isSlipperyReported;
    // A non-slippery report permits the existing rule; a wet/slippery floor still needs mat information.
    if (profile.floor.isSlipperyReported === false) ready.add("RISK-005");
  }
  if (profile.grabBars.present === false) {
    input.grabBars = {
      present: false,
      count: 0,
      toiletGrabBarPresent: false,
      showerGrabBarPresent: false,
      inspectedSecure: false,
    };
    ready.add("RISK-006");
  } else if (
    profile.grabBars.present === true &&
    profile.grabBars.locations.some((loc) => ["TOILET", "SHOWER"].includes(loc))
  ) {
    const toilet = profile.grabBars.locations.includes("TOILET");
    const shower = profile.grabBars.locations.includes("SHOWER");
    input.grabBars = {
      present: true,
      count: Number(toilet) + Number(shower),
      toiletGrabBarPresent: toilet,
      showerGrabBarPresent: shower,
      inspectedSecure: profile.grabBars.inspected === true,
    };
    if (!toilet || !shower || profile.grabBars.inspected === true) ready.add("RISK-006");
  }
  if (profile.floor.levelDifferenceReported === false) {
    input.floor.thresholdStepPresent = false;
    input.floor.levelDifferenceCm = 0;
    ready.add("RISK-007");
  }

  const ruleEvaluations: RuleEvaluationResult[] = ALL_VERSIONED_RULES.map((rule) => {
    if (!rule.applicableRoomTypes.includes(profile.roomType)) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        version: rule.version,
        state: "NOT_APPLICABLE",
        priority: "LOW",
        priorityRationale: "Không áp dụng cho loại phòng này theo registry.",
        evidence: {
          measuredValue: "Không áp dụng",
          threshold: "Theo loại phòng",
          rationale: "Applicability từ registry.",
          sourceFields: ["roomType"],
        },
        finding: null,
        recommendation: null,
        supportingSourceIds: [],
      };
    }
    if (ready.has(rule.id)) return rule.evaluate(input);
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      version: rule.version,
      state: "NEEDS_VERIFICATION",
      priority: "UNKNOWN",
      priorityRationale: "Chưa đủ thông tin xác nhận hoặc số đo để áp dụng quy tắc.",
      evidence: {
        measuredValue: "Chưa xác nhận đầy đủ",
        threshold: "Giữ nguyên ngưỡng trong registry",
        rationale: "Không thay thông tin còn thiếu bằng số đo hoặc điều kiện mặc định.",
        sourceFields: [],
        missingFields: ["confirmed_field_evidence"],
      },
      finding: null,
      recommendation: null,
      supportingSourceIds: [],
    };
  });

  const findings = ruleEvaluations.flatMap((r) =>
    r.state === "DETECTED" && r.finding ? [r.finding] : []
  );

  const stableHash = crypto
    .createHash("sha256")
    .update(profile.roomId + ((profile as any).version || "1.0.0"))
    .digest("hex")
    .slice(0, 8);

  return {
    id: `vision-confirmed-${profile.roomId}-${stableHash}`,
    roomId: profile.roomId,
    roomName: profile.roomName,
    roomType: profile.roomType,
    snapshotType: "BASELINE",
    createdAt: new Date().toISOString(),
    safetyScore: null,
    totalRulesEvaluated: ruleEvaluations.length,
    detectedCount: findings.length,
    needsVerificationCount: ruleEvaluations.filter((r) => r.state === "NEEDS_VERIFICATION").length,
    highPriorityCount: findings.filter((f) => f.severityCategory === "HIGH").length,
    mediumPriorityCount: findings.filter((f) => f.severityCategory === "MEDIUM").length,
    lowPriorityCount: findings.filter((f) => f.severityCategory === "LOW").length,
    findings,
    ruleEvaluations,
    recommendations: ruleEvaluations.flatMap((r) => (r.recommendation ? [r.recommendation] : [])),
  };
}
