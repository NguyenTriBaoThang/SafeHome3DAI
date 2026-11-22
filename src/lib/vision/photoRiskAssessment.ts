import { ALL_VERSIONED_RULES } from "../risk/riskRuleRegistry";
import type { RiskFinding } from "../risk/types";

export interface PhotoRiskAssessment {
  roomName: string;
  safetyScore: null;
  detectedCount: number;
  needsVerificationCount: number;
  findings: RiskFinding[];
  ruleEvaluations: Array<{ ruleId: string; state: "NEEDS_VERIFICATION" | "NOT_APPLICABLE" }>;
}

/** An uncalibrated photo supplies no confirmed clinical input or physical measurements. */
export function createUnverifiedPhotoAssessment(roomType: "BEDROOM" | "BATHROOM", caption?: string): PhotoRiskAssessment {
  const ruleEvaluations = ALL_VERSIONED_RULES.map(rule => ({ ruleId: rule.id,
    state: rule.applicableRoomTypes.includes(roomType) ? "NEEDS_VERIFICATION" as const : "NOT_APPLICABLE" as const }));
  return { roomName: caption || (roomType === "BEDROOM" ? "Phòng ngủ" : "Nhà vệ sinh"), safetyScore: null,
    detectedCount: 0, findings: [], needsVerificationCount: ruleEvaluations.filter(r => r.state === "NEEDS_VERIFICATION").length,
    ruleEvaluations };
}
