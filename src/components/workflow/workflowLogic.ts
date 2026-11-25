/**
 * Logic thuần của luồng /workflow (B09): URL ?step=, dựng đầu vào đánh giá từ dữ liệu người dùng
 * thật sự đã nhập, và các bản vá mô phỏng. Không tự tính điểm: đánh giá do A11/A03 làm khi lưu snapshot.
 * Quy ước: câu trả lời null = "chưa biết" -> bỏ trường -> engine trả NEEDS_VERIFICATION (không bao giờ coi là an toàn).
 */
import type { SnapshotLite } from "./snapshotClient";

export const WORKFLOW_LAST_STEP = 7;
export type Tri = boolean | null;
export type RoomKind = "BEDROOM" | "BATHROOM" | "LIVINGROOM";
export type ValueSource = "measured" | "user_confirmed";

export interface MeasuredInput {
  value: number | null;
  source: ValueSource;
}

export interface Checklist {
  looseRug: Tri;
  cablesOnWalkway: Tri;
  dimLighting: Tri;
  wetFloor: Tri;
  missingGrabBar: Tri;
  thresholdStep: Tri;
  switchReachableFromBed: Tri;
  essentialReachableFromBed: Tri;
}

export const EMPTY_CHECKLIST: Checklist = {
  looseRug: null,
  cablesOnWalkway: null,
  dimLighting: null,
  wetFloor: null,
  missingGrabBar: null,
  thresholdStep: null,
  switchReachableFromBed: null,
  essentialReachableFromBed: null,
};

export interface SceneObjectRef {
  id: string;
  category: string;
}

export interface WorkflowDraft {
  roomId: string;
  roomType: RoomKind;
  roomName: string;
  dims: { length: number; width: number; height: number };
  touchedDims: { length: boolean; width: boolean; height: boolean };
  checklist: Checklist;
  thresholdCm: MeasuredInput;
  walkway: MeasuredInput;
  nightLux: MeasuredInput;
  sceneObjects: SceneObjectRef[];
}

// ---------------------------------------------------------------- URL ----

export interface StepUrlState {
  step: number;
  room: string | null;
}

export function parseStepParams(search: string): StepUrlState {
  const p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = Number.parseInt(p.get("step") ?? "", 10);
  const step = Number.isInteger(raw) && raw >= 1 && raw <= WORKFLOW_LAST_STEP ? raw : 1;
  const room = p.get("room");
  return { step, room: room && /^[A-Za-z0-9_-]{3,80}$/.test(room) ? room : null };
}

export function buildStepUrl(state: StepUrlState): string {
  const p = new URLSearchParams({ step: String(state.step) });
  if (state.room) p.set("room", state.room);
  return `/workflow?${p.toString()}`;
}

/**
 * Bước được phép khôi phục sau khi tải lại. Chưa có snapshot BASELINE nào được lưu => mọi dữ liệu
 * bước 1-4 chỉ nằm trong bộ nhớ trình duyệt và đã mất, nên quay về bước 1.
 */
export function resolveRestoreStep(requested: number, snapshots: Pick<SnapshotLite, "snapshotType">[]): number {
  const hasBaseline = snapshots.some((s) => s.snapshotType === "BASELINE");
  if (!hasBaseline) return 1;
  return Math.min(Math.max(requested, 1), WORKFLOW_LAST_STEP);
}

/** Bước cao nhất đã có dữ liệu lưu thật trên máy chủ (để hiển thị trạng thái stepper). */
export function lastPersistedStep(snapshots: Pick<SnapshotLite, "snapshotType">[]): number {
  if (snapshots.some((s) => s.snapshotType === "VERIFIED_POST_INTERVENTION")) return 7;
  if (snapshots.some((s) => s.snapshotType === "PROPOSED_SCENARIO")) return 6;
  if (snapshots.some((s) => s.snapshotType === "BASELINE")) return 5;
  return 0;
}

export function newWorkflowRoomId(roomType: RoomKind, rand: () => string = () => crypto.randomUUID()): string {
  return `wf-${roomType.toLowerCase()}-${rand().replace(/-/g, "").slice(0, 10)}`;
}

// ------------------------------------------------- assessment input ----

function provenance(value: unknown, unit: "m" | "lux" | "cm" | "boolean", sourceType: ValueSource | "simulated", method: string, updatedAt: string) {
  return { value, unit, sourceType, confidence: null, uncertainty: null, method, updatedAt, confirmedBy: null, evidenceId: null, isLegacyAssumed: false };
}

const ENGINE_ROOM_TYPE: Record<RoomKind, string> = { BEDROOM: "BEDROOM", BATHROOM: "BATHROOM", LIVINGROOM: "LIVING_ROOM" };

/** Đầu vào chuẩn (AssessmentInput) + provenanceMap. Trường chưa biết bị bỏ hẳn. */
export function buildAssessmentInput(d: WorkflowDraft, nowIso: string) {
  const c = d.checklist;
  const rugObj = d.sceneObjects.find((o) => o.category === "RUG");
  const cableObj = d.sceneObjects.find((o) => o.category === "CABLE");
  const walkway = d.walkway.value != null && d.walkway.value > 0 ? d.walkway.value : undefined;
  const lux = d.nightLux.value != null && d.nightLux.value >= 0 ? d.nightLux.value : undefined;
  const thr = d.thresholdCm.value != null && d.thresholdCm.value >= 0 ? d.thresholdCm.value : undefined;
  const anyDimTouched = d.touchedDims.length || d.touchedDims.width || d.touchedDims.height;

  const input: Record<string, any> = {
    roomId: d.roomId,
    roomName: d.roomName,
    roomType: ENGINE_ROOM_TYPE[d.roomType],
    sourceType: "SURVEY_PROFILE",
    dimensions: {
      lengthM: d.dims.length,
      widthM: d.dims.width,
      heightM: d.dims.height,
      source: anyDimTouched ? "USER_ESTIMATED" : "SYSTEM_DEFAULT",
    },
    floor: {
      material: d.roomType === "BATHROOM" ? "Gạch men" : "Sàn gỗ",
      isWet: c.wetFloor ?? undefined,
      isSlipResistant: c.wetFloor === true ? false : c.wetFloor === false ? true : undefined,
      thresholdStepPresent: c.thresholdStep === false ? false : c.thresholdStep === true && thr != null ? true : undefined,
      levelDifferenceCm: c.thresholdStep === false ? 0 : c.thresholdStep === true ? thr : undefined,
    },
    lighting: {
      nighttimeLux: lux,
      nightLightPresent: c.dimLighting == null && lux == null ? undefined : false,
      pathLightToBathroom: c.dimLighting != null ? !c.dimLighting : lux != null ? lux >= 50 : undefined,
      motionSensorPresent: false,
    },
    rugs:
      c.looseRug == null
        ? { present: null, items: [] }
        : { present: c.looseRug, items: c.looseRug ? [{ id: rugObj?.id ?? "rug-reported", name: "Thảm sàn (người dùng khai báo)", location: "lối đi", isSecured: false, edgesCurled: true, inWalkway: true }] : [] },
    cables:
      c.cablesOnWalkway == null
        ? { crossingWalkway: null, items: [] }
        : { crossingWalkway: c.cablesOnWalkway, items: c.cablesOnWalkway ? [{ id: cableObj?.id ?? "cable-reported", name: "Dây điện (người dùng khai báo)", location: "lối đi", crossesWalkway: true, hasCordCover: false, hasSkirtingTrunking: false }] : [] },
    obstacles: { present: walkway != null ? walkway < 0.85 : null, walkwayClearWidthM: walkway, items: [] },
    grabBars:
      c.missingGrabBar == null
        ? { present: null, count: undefined, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false }
        : { present: !c.missingGrabBar, count: c.missingGrabBar ? 0 : 1, toiletGrabBarPresent: !c.missingGrabBar, showerGrabBarPresent: !c.missingGrabBar, inspectedSecure: !c.missingGrabBar },
    accessibility: {
      lightSwitchReachableFromBed: c.switchReachableFromBed ?? undefined,
      essentialItemsReachableFromBed: c.essentialReachableFromBed ?? undefined,
      emergencyCallReachable: false,
    },
  };

  const provenanceMap: Record<string, any> = {};
  if (walkway != null) provenanceMap["obstacles.walkwayClearWidthM"] = provenance(walkway, "m", d.walkway.source, "workflow_step2", nowIso);
  if (lux != null) provenanceMap["lighting.nighttimeLux"] = provenance(lux, "lux", d.nightLux.source, "workflow_step2", nowIso);
  if (thr != null) provenanceMap["floor.levelDifferenceCm"] = provenance(thr, "cm", d.thresholdCm.source, "workflow_step2", nowIso);
  return { input, provenanceMap };
}

// ------------------------------------------------------ simulation ----

export type SimActionId = "SECURE_RUG" | "ROUTE_CABLE" | "ADD_GRAB_BAR" | "ADD_NIGHT_LIGHT";

export const SIM_ACTIONS: { id: SimActionId; label: string; hint: string; cost: string; effort: string; urgency: number }[] = [
  { id: "SECURE_RUG", label: "Dán cố định thảm", hint: "Dán keo/lót chống trượt viền thảm", cost: "Ước tính: dưới 50.000đ", effort: "15 phút", urgency: 2 },
  { id: "ROUTE_CABLE", label: "Nẹp dây điện sát tường", hint: "Luồn ống ghen/nẹp bán nguyệt", cost: "Ước tính: 30.000–80.000đ", effort: "30 phút", urgency: 2 },
  { id: "ADD_GRAB_BAR", label: "Lắp thanh tay vịn", hint: "Bắt vít vào tường chắc chắn", cost: "Ước tính: 250.000–450.000đ/thanh", effort: "1 giờ", urgency: 1 },
  { id: "ADD_NIGHT_LIGHT", label: "Thêm đèn ngủ cảm biến", hint: "Cắm ở ổ thấp trên lối ra nhà vệ sinh", cost: "Ước tính: 80.000–150.000đ", effort: "cắm dùng ngay", urgency: 3 },
];

/** Hành động có áp dụng được cho dữ liệu đã biết của phòng không (không tự bịa mục để "sửa"). */
export function simActionApplicable(id: SimActionId, input: Record<string, any>): boolean {
  switch (id) {
    case "SECURE_RUG": return (input.rugs?.items ?? []).some((i: any) => !i.isSecured);
    case "ROUTE_CABLE": return input.cables?.crossingWalkway === true;
    case "ADD_GRAB_BAR": return input.roomType === "BATHROOM" && input.grabBars?.present === false;
    case "ADD_NIGHT_LIGHT": return input.lighting?.nightLightPresent !== true && input.roomType !== "LIVING_ROOM";
  }
}

/** Các phần (section) cần vá lên baseline cho /simulate và cho snapshot VERIFIED. */
export function buildPatches(baseInput: Record<string, any>, actions: SimActionId[]): Record<string, Record<string, any>> {
  const patches: Record<string, Record<string, any>> = {};
  for (const a of actions) {
    if (!simActionApplicable(a, baseInput)) continue;
    if (a === "SECURE_RUG")
      patches.rugs = { ...baseInput.rugs, items: (baseInput.rugs.items as any[]).map((i) => ({ ...i, isSecured: true, edgesCurled: false })) };
    if (a === "ROUTE_CABLE")
      patches.cables = { ...baseInput.cables, crossingWalkway: false, items: (baseInput.cables.items as any[]).map((i) => ({ ...i, crossesWalkway: false, hasCordCover: true, hasSkirtingTrunking: true })) };
    if (a === "ADD_GRAB_BAR")
      patches.grabBars = { present: true, count: 1, toiletGrabBarPresent: true, showerGrabBarPresent: true, inspectedSecure: true };
    if (a === "ADD_NIGHT_LIGHT")
      patches.lighting = { ...baseInput.lighting, nightLightPresent: true, motionSensorPresent: true, pathLightToBathroom: true };
  }
  return patches;
}

export interface VerifiedForm {
  who: string;
  when: string; // yyyy-mm-dd
  done: SimActionId[];
  walkway: MeasuredInput;
  nightLux: MeasuredInput;
  confirm: boolean;
}

export function validateVerifiedForm(f: VerifiedForm): string[] {
  const errs: string[] = [];
  if (!f.who.trim()) errs.push("Cần ghi ai đã thực hiện/xác nhận.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.when)) errs.push("Cần ghi ngày thực hiện.");
  if (f.done.length === 0) errs.push("Chọn ít nhất một thay đổi đã làm ngoài thực tế.");
  if (!f.confirm) errs.push("Cần tích xác nhận rằng thay đổi đã được làm thật.");
  return errs;
}

/**
 * Đầu vào cho snapshot VERIFIED: bắt đầu từ baseline, áp các thay đổi đã làm, nhưng độ rộng lối đi và độ rọi
 * bị RESET về "chưa biết" trừ khi nhập lại sau can thiệp (không mượn số đo cũ để khẳng định tình trạng mới).
 */
export function buildVerifiedInput(baseInput: Record<string, any>, f: VerifiedForm, nowIso: string) {
  const patches = buildPatches(baseInput, f.done);
  const input: Record<string, any> = { ...baseInput, ...patches };
  const walkway = f.walkway.value != null && f.walkway.value > 0 ? f.walkway.value : undefined;
  const lux = f.nightLux.value != null && f.nightLux.value >= 0 ? f.nightLux.value : undefined;
  input.obstacles = { ...baseInput.obstacles, walkwayClearWidthM: walkway, present: walkway != null ? walkway < 0.85 : null };
  input.lighting = { ...(patches.lighting ?? baseInput.lighting), nighttimeLux: lux };
  const provenanceMap: Record<string, any> = {};
  if (walkway != null) provenanceMap["obstacles.walkwayClearWidthM"] = provenance(walkway, "m", f.walkway.source, "post_intervention_recheck", nowIso);
  if (lux != null) provenanceMap["lighting.nighttimeLux"] = provenance(lux, "lux", f.nightLux.source, "post_intervention_recheck", nowIso);
  input.workflowMeta = { ...(baseInput.workflowMeta ?? {}), intervention: { who: f.who.trim(), when: f.when, done: f.done } };
  const notes = `Đã sửa ngoài thực tế bởi ${f.who.trim()} ngày ${f.when}: ${f.done.join(", ")}`.slice(0, 1000);
  return { input, provenanceMap, notes };
}

// ------------------------------------------------------ action plan ----

export interface PlanItem {
  findingId: string;
  ruleId: string;
  title: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  actionTitle: string;
  steps: string[];
  /** Luôn là "ước tính" từ khuyến nghị của engine; null = chưa có ước tính. */
  costEstimate: string | null;
  targetObjectId: string | null;
}

const SEV_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

/** Sắp theo mức khẩn (severity), rồi ít bước trước (dễ làm), rồi có ước tính chi phí trước. Không bịa báo giá. */
export function buildActionPlan(findings: any[]): PlanItem[] {
  return findings
    .map((f) => ({
      findingId: f.id as string,
      ruleId: f.ruleId as string,
      title: f.title as string,
      severity: (f.severity ?? "LOW") as PlanItem["severity"],
      actionTitle: (f.recommendation?.title ?? "Khuyến nghị") as string,
      steps: (f.recommendation?.steps ?? []) as string[],
      costEstimate: (f.recommendation?.estimatedCost ?? null) as string | null,
      targetObjectId: (f.targetObjectId ?? null) as string | null,
    }))
    .sort(
      (a, b) =>
        SEV_RANK[a.severity] - SEV_RANK[b.severity] ||
        a.steps.length - b.steps.length ||
        Number(b.costEstimate != null) - Number(a.costEstimate != null) ||
        a.ruleId.localeCompare(b.ruleId)
    );
}

export function labelCost(cost: string | null): string {
  return cost ? `Chi phí ước tính: ${cost} (chưa phải báo giá)` : "Chưa có ước tính chi phí";
}
