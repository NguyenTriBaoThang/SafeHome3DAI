/**
 * Client mỏng cho /api/v1/snapshots (A11). "saved" chỉ khi máy chủ xác nhận
 * { success:true, persisted:true, persistenceStatus:"saved" }. Mọi trường hợp khác là lỗi hiển thị cho người dùng.
 */
export type SnapshotKind = "BASELINE" | "PROPOSED_SCENARIO" | "VERIFIED_POST_INTERVENTION";

export interface SnapshotLite {
  snapshotId: string;
  roomId: string;
  snapshotType: SnapshotKind;
  revision: number;
  roomState: Record<string, any>;
  provenanceMap: Record<string, any>;
  canonicalAssessment: {
    findings: any[];
    heuristicSafetyScore: number;
    missingInputs: string[];
    ruleTrace: any[];
    dataQuality: Record<string, number>;
  };
  persistenceStatus: "saved" | "failed";
  notes: string | null;
  createdAt: string;
}

export type ApiFailure = {
  ok: false;
  kind: "conflict" | "forbidden" | "not_found" | "unavailable" | "invalid" | "network" | "unsaved";
  status: number;
  code?: string;
  message: string;
};
export type ApiResult<T> = { ok: true; data: T; idempotentReplay?: boolean } | ApiFailure;
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MESSAGES: Record<ApiFailure["kind"], string> = {
  conflict: "Dữ liệu đã thay đổi ở nơi khác (xung đột phiên bản). Đã tải lại bản mới nhất; hãy xem lại rồi thử lại.",
  forbidden: "Bạn không có quyền truy cập dữ liệu này.",
  not_found: "Không tìm thấy dữ liệu đã lưu.",
  unavailable: "Máy chủ chưa lưu được. Chưa có gì được lưu; hãy thử lại.",
  invalid: "Dữ liệu gửi lên không hợp lệ.",
  network: "Không kết nối được máy chủ. Chưa có gì được lưu; hãy thử lại.",
  unsaved: "Máy chủ không xác nhận đã lưu. Chưa có gì được lưu.",
};

function failure(kind: ApiFailure["kind"], status: number, code?: string, serverMsg?: string): ApiFailure {
  const base = MESSAGES[kind];
  return { ok: false, kind, status, code, message: kind === "invalid" && serverMsg ? `${base} ${serverMsg}` : base };
}

function kindOf(status: number): ApiFailure["kind"] {
  if (status === 409) return "conflict";
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 422 || status === 400) return "invalid";
  return "unavailable";
}

async function call<T>(
  f: FetchLike,
  url: string,
  init: RequestInit | undefined,
  requireSaved: boolean
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await f(url, init);
  } catch {
    return failure("network", 0);
  }
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json || json.success !== true) {
    return failure(kindOf(res.status), res.status, json?.code, json?.error);
  }
  if (requireSaved && !(json.persisted === true && json.persistenceStatus === "saved")) {
    return failure("unsaved", res.status, json?.code);
  }
  return { ok: true, data: json.data as T, idempotentReplay: json.idempotentReplay };
}

const jsonInit = (body: unknown, idempotencyKey?: string): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
  body: JSON.stringify(body),
});

export function createSnapshotClient(f: FetchLike = (i, o) => fetch(i, o)) {
  return {
    list: (roomId: string) =>
      call<SnapshotLite[]>(f, `/api/v1/snapshots?roomId=${encodeURIComponent(roomId)}`, undefined, false),

    create: (body: {
      snapshotType: SnapshotKind;
      roomId: string;
      roomInput: Record<string, any>;
      provenanceMap?: Record<string, any>;
      expectedRevision?: number;
      parentSnapshotId?: string | null;
      notes?: string;
      deterministicTimestamp?: string;
    }, idempotencyKey?: string) => call<SnapshotLite>(f, "/api/v1/snapshots", jsonInit(body, idempotencyKey), true),

    simulate: (body: {
      baselineSnapshotId: string;
      roomPatches: Record<string, Record<string, any>>;
      expectedRevision?: number;
      notes?: string;
    }, idempotencyKey?: string) => call<SnapshotLite>(f, "/api/v1/snapshots/simulate", jsonInit(body, idempotencyKey), true),

    compare: (baselineSnapshotId: string, afterSnapshotId: string) =>
      call<ComparisonLite>(f, "/api/v1/snapshots/compare", jsonInit({ baselineSnapshotId, afterSnapshotId }), false),
  };
}

export type DiffCategory = "RESOLVED" | "INCREASED" | "NEW" | "UNCHANGED" | "NEEDS_VERIFICATION";

export interface ComparisonLite {
  baselineSnapshotId: string;
  interventionSnapshotId: string;
  afterSnapshotType: SnapshotKind;
  beforeRevision: number;
  afterRevision: number;
  insufficientData: boolean;
  canClaimVerifiedIntervention: boolean;
  evaluationVerdict: "CHUA_THE_DANH_GIA" | "PROPOSED_SIMULATION_ONLY" | "VERIFIED_IMPROVEMENT" | "UNCHANGED_OR_WORSENED";
  verdictLabel: string;
  verificationNotes: string;
  aggregateScoreDisclaimer: string;
  baselineSafetyScore: number;
  interventionSafetyScore: number;
  summary: { resolvedCount: number; increasedCount: number; newCount: number; unchangedCount: number; needsVerificationCount: number; missingDataFields: string[] };
  findingDiffs: {
    ruleId: string;
    ruleName: string;
    category: DiffCategory;
    beforeState: string;
    afterState: string;
    beforeMeasuredValue: string;
    afterMeasuredValue: string;
    reason: string;
    missingDataFields: string[];
    notMeasuredWarning: string | null;
  }[];
}

/** Với 409 người gọi phải tải lại danh sách snapshot trước khi cho thử lại. */
export const needsReload = (r: ApiResult<unknown>) => !r.ok && r.kind === "conflict";
