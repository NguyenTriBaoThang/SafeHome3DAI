import {
  AssessmentSnapshot,
  BeforeAfterComparisonResult,
  FindingComparisonItem,
  ComparisonCategory,
} from "./types";
import { ALL_VERSIONED_RULES } from "./riskRuleRegistry";

/**
 * Compares two assessment snapshots (Before vs After intervention)
 * and classifies every rule finding into immutable comparison categories.
 */
export function compareAssessments(
  before: AssessmentSnapshot,
  after: AssessmentSnapshot
): BeforeAfterComparisonResult {
  const evaluationsComparison: FindingComparisonItem[] = [];

  let resolvedCount = 0;
  let newCount = 0;
  let persistentCount = 0;
  let changedPriorityCount = 0;
  let needsVerificationCount = 0;

  for (const rule of ALL_VERSIONED_RULES) {
    const beforeEv = before.ruleEvaluations.find((e) => e.ruleId === rule.id);
    const afterEv = after.ruleEvaluations.find((e) => e.ruleId === rule.id);

    const beforeState = beforeEv?.state || "NOT_APPLICABLE";
    const afterState = afterEv?.state || "NOT_APPLICABLE";
    const beforePriority = beforeEv?.priority || "UNKNOWN";
    const afterPriority = afterEv?.priority || "UNKNOWN";

    let category: ComparisonCategory = "PERSISTENT";
    let explanation = "";

    if (beforeState === "DETECTED" && afterState === "NOT_DETECTED") {
      category = "RESOLVED_IN_MODEL";
      resolvedCount++;
      explanation = `Nguy cơ "${rule.name}" đã được giải quyết triệt để sau khi điều chỉnh thiết kế / can thiệp.`;
    } else if (beforeState !== "DETECTED" && afterState === "DETECTED") {
      category = "NEW";
      newCount++;
      explanation = `Phát sinh mối nguy mới "${rule.name}" sau khi sắp xếp lại không gian.`;
    } else if (beforeState === "DETECTED" && afterState === "DETECTED") {
      if (beforePriority !== afterPriority) {
        category = "CHANGED_PRIORITY";
        changedPriorityCount++;
        explanation = `Mối nguy vẫn tồn tại nhưng mức ưu tiên đã thay đổi từ [${beforePriority}] sang [${afterPriority}].`;
      } else {
        category = "PERSISTENT";
        persistentCount++;
        explanation = `Mối nguy "${rule.name}" vẫn còn tồn tại chưa được can thiệp khắc phục.`;
      }
    } else if (afterState === "NEEDS_VERIFICATION") {
      category = "NEEDS_VERIFICATION";
      needsVerificationCount++;
      explanation = `Yếu tố "${rule.name}" cần được kiểm tra thực địa hoặc thu thập thêm thông tin.`;
    } else {
      category = "RESOLVED_IN_MODEL";
      explanation = "Trạng thái an toàn được duy trì ổn định.";
    }

    evaluationsComparison.push({
      ruleId: rule.id,
      ruleName: rule.name,
      beforeState,
      afterState,
      beforePriority,
      afterPriority,
      comparisonCategory: category,
      explanation,
      findingTitle: beforeEv?.finding?.title || afterEv?.finding?.title || rule.name,
    });
  }

  const scoreDelta = after.safetyScore - before.safetyScore;
  const highPriorityReduction = Math.max(0, before.highPriorityCount - after.highPriorityCount);

  return {
    id: `compare-${before.id}-vs-${after.id}`,
    beforeSnapshotId: before.id,
    afterSnapshotId: after.id,
    roomName: after.roomName || before.roomName,
    beforeScore: before.safetyScore,
    afterScore: after.safetyScore,
    scoreDelta,
    summary: {
      totalBeforeDetected: before.detectedCount,
      totalAfterDetected: after.detectedCount,
      highPriorityReduction,
      resolvedCount,
      newCount,
      persistentCount,
      changedPriorityCount,
      needsVerificationCount,
    },
    evaluationsComparison,
    generatedAt: new Date().toISOString(),
  };
}

