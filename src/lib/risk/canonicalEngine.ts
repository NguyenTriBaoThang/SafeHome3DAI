import crypto from "crypto";
import { z } from "zod";
import {
  AssessmentResultV1,
  AssessmentResultV1Schema,
  RiskFindingV1,
  RiskFindingV1Schema,
  RiskSeverity,
  RiskCertainty,
  MeasurementSourceType,
} from "@/lib/contracts/sharedContractV1";
import {
  AssessmentInput,
  RuleEvaluationResult,
  RuleEvaluationState,
  FindingPriority,
  AssessmentSnapshot,
  RiskFinding,
} from "./types";
import { ALL_VERSIONED_RULES } from "./riskRuleRegistry";
import { normalizeRoomAssessmentInput } from "./inputAdapter";
import {
  ProvenanceRecord,
  computeDataQuality,
} from "@/lib/provenance/measurementProvenance";

/**
 * ==============================================================================
 * SAFEHOME 3D AI — CANONICAL DETERMINISTIC RISK ENGINE (TASK A03)
 * ==============================================================================
 * Single Source of Truth for all fall hazard evaluations across SafeHome 3D AI:
 * - 100% Deterministic: Same room input produces identical findings, severity,
 *   scores, and IDs.
 * - Strict Separation of Severity (Hazard impact), Certainty (Data lineage),
 *   and Priority (Intervention urgency).
 * - Enforces manual_confirmation_required for unverified or provisional inputs.
 * - Stable, predictable finding IDs: `finding-riskXXX-{roomId}`.
 * - Transparent Rule Traceability: Full input -> condition -> output audit trail.
 * ==============================================================================
 */

export interface RuleTraceStep {
  ruleId: string;
  ruleName: string;
  version: string;
  state: RuleEvaluationState;
  priority: FindingPriority;
  priorityRationale: string;
  evidence: {
    measuredValue: string;
    threshold: string;
    rationale: string;
    sourceFields: string[];
    missingFields?: string[];
  };
  supportingSources: string[];
}

export interface CanonicalEngineOptions {
  assessmentId?: string;
  scenarioId?: string | null;
  isBaseline?: boolean;
  deterministicTimestamp?: string;
  provenanceMap?: Record<string, ProvenanceRecord<any>>;
}

export interface CanonicalAssessmentResult extends AssessmentResultV1 {
  ruleTrace: RuleTraceStep[];
  ruleEvaluations: RuleEvaluationResult[];
  clinicalDisclaimer: string;
}

/**
 * Deterministic hash generator for predictable assessment IDs.
 */
function generateInputHash(input: AssessmentInput): string {
  const normalizedStr = JSON.stringify({
    roomId: input.roomId,
    roomType: input.roomType,
    floor: input.floor,
    lighting: input.lighting,
    rugs: input.rugs,
    cables: input.cables,
    obstacles: input.obstacles,
    grabBars: input.grabBars,
    accessibility: input.accessibility,
  });
  return crypto.createHash("sha256").update(normalizedStr).digest("hex").slice(0, 8);
}

/**
 * Maps legacy FindingPriority or custom severity to RiskSeverity ("LOW" | "MEDIUM" | "HIGH").
 */
function mapToRiskSeverity(priority: FindingPriority): RiskSeverity {
  switch (priority) {
    case "HIGH":
      return "HIGH";
    case "MEDIUM":
      return "MEDIUM";
    case "LOW":
    case "UNKNOWN":
    default:
      return "LOW";
  }
}

/**
 * Evaluates certainty based on data provenance.
 */
function determineFindingCertainty(
  sourceType: string | undefined,
  provenanceList: Array<{ sourceType: MeasurementSourceType }>
): RiskCertainty {
  if (sourceType === "3D_SCENE" || sourceType === "simulated") {
    return "HYPOTHETICAL";
  }
  if (sourceType === "AI_VISION" || sourceType === "VISION" || sourceType === "vision_estimated") {
    return "PROVISIONAL";
  }

  // Check individual field provenances if available
  const hasSimulated = provenanceList.some((p) => p.sourceType === "simulated");
  if (hasSimulated) return "HYPOTHETICAL";

  const hasVisionOrUnknown = provenanceList.some(
    (p) => p.sourceType === "vision_estimated" || p.sourceType === "unknown"
  );
  if (hasVisionOrUnknown) return "PROVISIONAL";

  return "CONFIRMED";
}

/**
 * PURE CANONICAL RISK ENGINE
 * Evaluates all versioned environmental hazard rules on a room input.
 */
export function evaluateRoomHazardsCanonical(
  rawInput: any,
  options?: CanonicalEngineOptions
): CanonicalAssessmentResult {
  const input: AssessmentInput = normalizeRoomAssessmentInput(rawInput);
  const evaluations: RuleEvaluationResult[] = [];
  const canonicalFindings: RiskFindingV1[] = [];
  const ruleTrace: RuleTraceStep[] = [];
  const missingInputsSet = new Set<string>();

  const stableHash = generateInputHash(input);
  const sanitizedRoomId = input.roomId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const assessmentId =
    options?.assessmentId || `asmt-${sanitizedRoomId}-${stableHash}`;
  const createdAt =
    options?.deterministicTimestamp ||
    (typeof rawInput?.createdAt === "string" ? rawInput.createdAt : "2026-11-24T00:00:00.000Z");

  // Track data quality records
  const qualityRecords: Array<{ fieldName: string; record: ProvenanceRecord<any>; isCritical?: boolean }> = [];

  // Evaluate all versioned rules in canonical registry
  for (const rule of ALL_VERSIONED_RULES) {
    const result = rule.evaluate(input);
    evaluations.push(result);

    // Build transparent rule trace step
    const traceStep: RuleTraceStep = {
      ruleId: result.ruleId,
      ruleName: result.ruleName,
      version: result.version,
      state: result.state,
      priority: result.priority,
      priorityRationale: result.priorityRationale,
      evidence: {
        measuredValue: result.evidence.measuredValue,
        threshold: result.evidence.threshold,
        rationale: result.evidence.rationale,
        sourceFields: result.evidence.sourceFields,
        missingFields: result.evidence.missingFields,
      },
      supportingSources: result.supportingSourceIds,
    };
    ruleTrace.push(traceStep);

    // Collect missing inputs
    if (result.evidence.missingFields && result.evidence.missingFields.length > 0) {
      for (const field of result.evidence.missingFields) {
        missingInputsSet.add(field);
      }
    }

    // Process detected findings
    if (result.state === "DETECTED" && result.finding) {
      const ruleNum = result.ruleId.replace(/[^0-9]/g, "");
      const findingId = `finding-risk${ruleNum}-${sanitizedRoomId}`;

      // Extract field provenances
      const inputProvenance: Array<{
        field: string;
        sourceType: MeasurementSourceType;
        value: any;
      }> = [];

      for (const field of result.evidence.sourceFields) {
        let fieldSource: MeasurementSourceType = "user_confirmed";
        if (input.sourceType === "3D_SCENE") fieldSource = "simulated";
        else if ((input as any).sourceType === "AI_VISION") fieldSource = "vision_estimated";

        if (options?.provenanceMap && options.provenanceMap[field]) {
          fieldSource = options.provenanceMap[field].sourceType;
        }

        inputProvenance.push({
          field,
          sourceType: fieldSource,
          value: result.evidence.measuredValue,
        });
      }

      const certainty = determineFindingCertainty((input as any).sourceType, inputProvenance);
      const severity = mapToRiskSeverity(result.priority);

      // Clinical rule: If certainty is not confirmed, or if hazard requires tactile/physical validation
      // (such as rug backing adhesion, floor slip resistance, or physical lux), flag manual confirmation required.
      const requiresManualConfirmation =
        certainty !== "CONFIRMED" ||
        ["RISK-001", "RISK-004", "RISK-005"].includes(result.ruleId);

      const recSteps = result.recommendation?.practicalSteps
        ? result.recommendation.practicalSteps
        : [result.finding.recommendationText || "Xem xét điều chỉnh môi trường theo tiêu chuẩn CDC STEADI."];

      const canonicalFinding: RiskFindingV1 = {
        id: findingId,
        ruleId: result.ruleId,
        title: result.finding.title,
        description: result.finding.description,
        severity,
        certainty,
        requiresManualConfirmation,
        targetObjectId: result.finding.targetObjectId || null,
        targetZone: result.finding.evidence.measuredValue.includes("Vị trí:")
          ? result.finding.evidence.measuredValue.split("Vị trí:")[1]?.split(",")[0]?.trim() || null
          : null,
        inputProvenance,
        recommendation: {
          title: result.recommendation?.title || `Khuyến nghị khắc phục ${result.finding.title}`,
          steps: recSteps,
          estimatedCost: result.recommendation?.estimatedCost || null,
          referenceIds: result.supportingSourceIds,
        },
        status: "ACTIVE",
      };

      canonicalFindings.push(canonicalFinding);
    }
  }

  // Count metrics for heuristic score
  let highPriorityCount = 0;
  let mediumPriorityCount = 0;
  let lowPriorityCount = 0;
  let needsVerificationCount = 0;

  for (const ev of evaluations) {
    if (ev.state === "DETECTED") {
      if (ev.priority === "HIGH") highPriorityCount++;
      else if (ev.priority === "MEDIUM") mediumPriorityCount++;
      else if (ev.priority === "LOW") lowPriorityCount++;
    } else if (ev.state === "NEEDS_VERIFICATION") {
      needsVerificationCount++;
    }
  }

  // Calculate environmental barrier compliance score (0-100)
  // Penalties: High = 15pts, Medium = 8pts, Low = 4pts, NeedsVerification = 3pts
  let calculatedScore = 100;
  calculatedScore -= highPriorityCount * 15;
  calculatedScore -= mediumPriorityCount * 8;
  calculatedScore -= lowPriorityCount * 4;
  calculatedScore -= needsVerificationCount * 3;

  const heuristicSafetyScore = Math.max(10, Math.min(100, Math.round(calculatedScore)));

  // Populate data quality metrics
  let measuredCount = 0;
  let userConfirmedCount = 0;
  let visionEstimatedCount = 0;
  let simulatedCount = 0;
  let unknownCount = needsVerificationCount;

  if (options?.provenanceMap) {
    for (const [key, record] of Object.entries(options.provenanceMap)) {
      qualityRecords.push({ fieldName: key, record });
    }
    const computedQuality = computeDataQuality(qualityRecords);
    measuredCount = computedQuality.measuredCount;
    userConfirmedCount = computedQuality.userConfirmedCount;
    visionEstimatedCount = computedQuality.visionEstimatedCount;
    simulatedCount = computedQuality.simulatedCount;
    unknownCount = computedQuality.unknownCount;
  } else {
    // Derive from input.sourceType
    if (input.sourceType === "3D_SCENE") {
      simulatedCount = 8 - unknownCount;
    } else if ((input as any).sourceType === "AI_VISION") {
      visionEstimatedCount = 8 - unknownCount;
    } else {
      userConfirmedCount = 8 - unknownCount;
    }
  }

  const missingInputs = Array.from(missingInputsSet).sort();

  // Sort findings deterministically by ruleId
  canonicalFindings.sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  const result: CanonicalAssessmentResult = {
    assessmentId,
    roomId: input.roomId,
    scenarioId: options?.scenarioId ?? null,
    isBaseline: options?.isBaseline ?? true,
    findings: canonicalFindings,
    heuristicSafetyScore,
    missingInputs,
    dataQuality: {
      measuredCount,
      userConfirmedCount,
      visionEstimatedCount,
      simulatedCount,
      unknownCount,
    },
    ruleVersion: "2026.1",
    createdAt,
    ruleTrace,
    ruleEvaluations: evaluations,
    clinicalDisclaimer:
      "Chỉ số an toàn môi trường vật lý (0-100) theo hướng dẫn CDC STEADI / WHO 2021. Không cấu thành chẩn đoán y khoa hoặc dự báo xác suất té ngã lâm sàng của cá nhân.",
  };

  // Validate output against Shared Contract V1
  AssessmentResultV1Schema.parse(result);

  return result;
}

/**
 * Adapter converting CanonicalAssessmentResult to legacy AssessmentSnapshot.
 * Guarantees zero regression for existing UI components and pages.
 */
export function adaptCanonicalToLegacySnapshot(
  canonical: CanonicalAssessmentResult,
  rawInput: any
): AssessmentSnapshot {
  const legacyFindings: RiskFinding[] = canonical.findings.map((f) => ({
    id: f.id,
    ruleId: f.ruleId,
    title: f.title,
    hazardType: f.ruleId,
    description: f.description,
    severityCategory: f.severity as FindingPriority,
    evidence: {
      measuredValue: f.inputProvenance[0]?.value || "Đã phân tích hiện trường",
      threshold: "Chuẩn kiến trúc an toàn CDC STEADI",
      rationale: f.description,
      sourceFields: f.inputProvenance.map((p) => p.field),
    },
    recommendationText: f.recommendation.steps.join("; "),
    targetObjectId: f.targetObjectId || undefined,
    status: f.status === "ACTIVE" ? "ACTIVE" : "RESOLVED",
    referenceIds: f.recommendation.referenceIds,
    traceabilityTrail: [],
  }));

  const detectedCount = canonical.findings.length;
  const highPriorityCount = canonical.findings.filter((f) => f.severity === "HIGH").length;
  const mediumPriorityCount = canonical.findings.filter((f) => f.severity === "MEDIUM").length;
  const lowPriorityCount = canonical.findings.filter((f) => f.severity === "LOW").length;
  const needsVerificationCount = canonical.missingInputs.length;

  return {
    id: canonical.assessmentId.replace(/^asmt-/, "snapshot-"),
    roomId: canonical.roomId,
    roomName: rawInput?.roomName || "Không gian khảo sát",
    roomType: rawInput?.roomType || "BEDROOM",
    snapshotType: canonical.isBaseline ? "BASELINE" : "INTERVENTION",
    createdAt: canonical.createdAt,
    safetyScore: canonical.heuristicSafetyScore,
    totalRulesEvaluated: canonical.ruleEvaluations.length,
    detectedCount,
    needsVerificationCount,
    highPriorityCount,
    mediumPriorityCount,
    lowPriorityCount,
    ruleEvaluations: canonical.ruleEvaluations,
    findings: legacyFindings,
    recommendations: canonical.ruleEvaluations
      .filter((ev) => ev.state === "DETECTED" && ev.recommendation)
      .map((ev) => ev.recommendation!),
    input: normalizeRoomAssessmentInput(rawInput),
  };
}

