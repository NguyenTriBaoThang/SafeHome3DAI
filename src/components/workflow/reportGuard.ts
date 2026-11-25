/**
 * Chốt chặn ngôn từ cho báo cáo Before–After (B09). Ba trạng thái luôn tách riêng; từ ngữ "an toàn"
 * chỉ được phép khi snapshot VERIFIED_POST_INTERVENTION có số đo lối đi + độ rọi là measured/user_confirmed
 * và API xác nhận VERIFIED_IMPROVEMENT. Mô phỏng KHÔNG BAO GIỜ đủ để dùng từ này.
 */
import type { ComparisonLite, DiffCategory, SnapshotLite } from "./snapshotClient";

export const WALKWAY_FIELD = "obstacles.walkwayClearWidthM";
export const LUX_FIELD = "lighting.nighttimeLux";
const TRUSTED = new Set(["measured", "user_confirmed"]);

export const CHANGE_LABEL: Record<DiffCategory, string> = {
  RESOLVED: "giảm",
  INCREASED: "tăng",
  NEW: "mới",
  NEEDS_VERIFICATION: "chưa biết",
  UNCHANGED: "không đổi",
};

const SAFE_CLAIM = /(đã an toàn|hoàn toàn an toàn|an toàn tuyệt đối|không còn (?:nguy cơ|mối nguy)|hết (?:nguy cơ|mối nguy)|phòng an toàn|\bis safe\b)/gi;

/** Thay các cụm khẳng định an toàn bằng cách nói trung lập, trừ khi được phép. */
export function sanitizeClaim(text: string, allowed: boolean): string {
  return allowed ? text : text.replace(SAFE_CLAIM, "chưa thể kết luận an toàn");
}

const trusted = (snap: SnapshotLite | null | undefined, field: string) =>
  TRUSTED.has(snap?.provenanceMap?.[field]?.sourceType);

export function safeWordingAllowed(cmp: ComparisonLite | null, after: SnapshotLite | null): boolean {
  return Boolean(
    cmp &&
      after &&
      after.snapshotType === "VERIFIED_POST_INTERVENTION" &&
      cmp.afterSnapshotType === "VERIFIED_POST_INTERVENTION" &&
      cmp.evaluationVerdict === "VERIFIED_IMPROVEMENT" &&
      cmp.canClaimVerifiedIntervention &&
      !cmp.insufficientData &&
      trusted(after, WALKWAY_FIELD) &&
      trusted(after, LUX_FIELD)
  );
}

export interface StateCard {
  key: "baseline" | "proposed" | "verified";
  title: string;
  subtitle: string;
  present: boolean;
  revision: number | null;
  hazardCount: number | null;
  unknownCount: number | null;
  /** null = không đủ dữ liệu để hiển thị chỉ số sàng lọc. */
  screeningScore: number | null;
  statusText: string;
}

const CARD_META = {
  baseline: { title: "Hiện trạng", subtitle: "Ghi nhận ban đầu, bất biến" },
  proposed: { title: "Mô phỏng đề xuất", subtitle: "Chỉ là giả lập trên mô hình, chưa làm ngoài thực tế" },
  verified: { title: "Đã xác minh thực tế", subtitle: "Chỉ có sau khi bạn khai báo đã sửa và nhập lại số đo" },
} as const;

export function buildStateCard(key: StateCard["key"], snap: SnapshotLite | null): StateCard {
  const meta = CARD_META[key];
  if (!snap) {
    return { key, ...meta, present: false, revision: null, hazardCount: null, unknownCount: null, screeningScore: null,
      statusText: key === "verified" ? "Chưa có xác minh thực tế" : key === "proposed" ? "Chưa lưu mô phỏng" : "Chưa đánh giá" };
  }
  const a = snap.canonicalAssessment;
  const unknown = a.missingInputs.length;
  return {
    key, ...meta, present: true, revision: snap.revision,
    hazardCount: a.findings.length,
    unknownCount: unknown,
    screeningScore: unknown === 0 ? a.heuristicSafetyScore : null,
    statusText: unknown === 0 ? "Đủ dữ liệu cho các quy tắc áp dụng" : "Chưa thể đánh giá đầy đủ: còn thiếu dữ liệu",
  };
}

export interface ComparisonView {
  headline: string;
  verdict: ComparisonLite["evaluationVerdict"];
  safeWording: boolean;
  notes: string;
  disclaimer: string;
  missing: string[];
  rows: { ruleId: string; ruleName: string; change: string; category: DiffCategory; before: string; after: string; reason: string; warning: string | null }[];
}

export function buildComparisonView(cmp: ComparisonLite, after: SnapshotLite | null): ComparisonView {
  const ok = safeWordingAllowed(cmp, after);
  const headline = cmp.insufficientData || cmp.evaluationVerdict === "CHUA_THE_DANH_GIA"
    ? "Chưa thể đánh giá: còn thiếu số đo/xác nhận"
    : cmp.evaluationVerdict === "PROPOSED_SIMULATION_ONLY"
    ? "Mô phỏng đề xuất, chưa xác minh ngoài thực tế"
    : ok
    ? "Đã xác minh cải thiện yếu tố môi trường (không phải bằng chứng giảm té ngã)"
    : cmp.evaluationVerdict === "VERIFIED_IMPROVEMENT"
    ? "Chưa thể đánh giá: thiếu số đo lối đi hoặc độ rọi được đo/xác nhận"
    : "Chưa ghi nhận cải thiện";
  return {
    headline,
    verdict: ok ? cmp.evaluationVerdict : cmp.evaluationVerdict === "VERIFIED_IMPROVEMENT" ? "CHUA_THE_DANH_GIA" : cmp.evaluationVerdict,
    safeWording: ok,
    notes: sanitizeClaim(cmp.verificationNotes, ok),
    disclaimer: cmp.aggregateScoreDisclaimer,
    missing: cmp.summary.missingDataFields,
    rows: cmp.findingDiffs
      .filter((d) => d.beforeState !== "NOT_APPLICABLE" || d.afterState !== "NOT_APPLICABLE")
      .map((d) => ({
        ruleId: d.ruleId,
        ruleName: d.ruleName,
        change: CHANGE_LABEL[d.category],
        category: d.category,
        before: d.beforeMeasuredValue,
        after: d.afterMeasuredValue,
        reason: sanitizeClaim(d.reason, ok),
        warning: d.notMeasuredWarning,
      })),
  };
}
