/**
 * Trạng thái hiển thị trên AppHeader (B09). Chỉ lấy từ snapshot đã lưu trên máy chủ của đúng tài khoản;
 * không dùng số liệu từ store mẫu. Độ rọi luôn đi kèm nhãn nguồn.
 */
export const ACTIVE_ROOM_KEY = "safehome:active-room";
export const SNAPSHOT_SAVED_EVENT = "safehome:snapshot-saved";

export type LuxSource = "measured" | "user_confirmed" | "vision_estimated" | "simulated" | "unknown";

export const LUX_SOURCE_LABEL: Record<LuxSource, string> = {
  measured: "đã đo",
  user_confirmed: "người dùng xác nhận",
  vision_estimated: "ước lượng AI",
  simulated: "mô phỏng",
  unknown: "chưa đo",
};

/** Chỉ hai nguồn này mới được trình bày như số đo. */
export const luxIsMeasurement = (s: LuxSource) => s === "measured" || s === "user_confirmed";

export interface HeaderSnapshotInput {
  snapshotType: string;
  roomState?: Record<string, any>;
  provenanceMap?: Record<string, any>;
  canonicalAssessment?: { findings: unknown[]; heuristicSafetyScore: number; missingInputs: string[] };
}

export type HeaderStatus =
  | { kind: "none"; label: "Chưa đánh giá" }
  | {
      kind: "assessed";
      snapshotType: string;
      /** Nhãn trạng thái đang hiển thị: "Hiện trạng" hoặc "Đã xác minh". */
      stateLabel: string;
      hazards: number;
      unknownRules: number;
      /** null khi còn thiếu dữ liệu: không đưa điểm ra như một kết luận. */
      screeningScore: number | null;
      lux: { value: number; source: LuxSource; label: string } | null;
    };

export function deriveHeaderStatus(latest: HeaderSnapshotInput | null | undefined): HeaderStatus {
  const a = latest?.canonicalAssessment;
  if (!latest || !a) return { kind: "none", label: "Chưa đánh giá" };
  const raw = latest.roomState?.lighting?.nighttimeLux;
  const rec = latest.provenanceMap?.["lighting.nighttimeLux"];
  // Có số nhưng không có hồ sơ nguồn => mẫu/mặc định => "mô phỏng", không phải số đo.
  const source: LuxSource = typeof raw === "number" ? ((rec?.sourceType as LuxSource) ?? "simulated") : "unknown";
  return {
    kind: "assessed",
    snapshotType: latest.snapshotType,
    stateLabel: latest.snapshotType === "VERIFIED_POST_INTERVENTION" ? "Đã xác minh" : "Hiện trạng",
    hazards: a.findings.length,
    unknownRules: a.missingInputs.length,
    screeningScore: a.missingInputs.length === 0 ? a.heuristicSafetyScore : null,
    lux: typeof raw === "number" ? { value: raw, source, label: LUX_SOURCE_LABEL[source] } : null,
  };
}

/**
 * Snapshot header được phép hiển thị: VERIFIED_POST_INTERVENTION (bản mới nhất) nếu có, nếu không thì BASELINE.
 * PROPOSED_SCENARIO (mô phỏng) KHÔNG BAO GIỜ được chọn.
 */
export function pickLatest<T extends { createdAt: string; snapshotType?: string; revision?: number }>(snaps: T[]): T | null {
  const newest = (type: string) =>
    snaps.filter((x) => x.snapshotType === type).sort((a, b) => (a.revision ?? 0) - (b.revision ?? 0) || a.createdAt.localeCompare(b.createdAt)).at(-1);
  return newest("VERIFIED_POST_INTERVENTION") ?? newest("BASELINE") ?? null;
}
