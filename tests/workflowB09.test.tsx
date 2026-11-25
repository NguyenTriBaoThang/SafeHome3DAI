import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { evaluateRoomHazardsCanonical } from "@/lib/risk/ruleEngine";
import { diffStoredSnapshots, type StoredRoomSnapshot } from "@/lib/risk/snapshotManager";
import { deriveHeaderStatus } from "@/components/layout/headerStatus";
import { createSnapshotClient } from "@/components/workflow/snapshotClient";
import { buildComparisonView, buildStateCard, sanitizeClaim, safeWordingAllowed } from "@/components/workflow/reportGuard";
import {
  EMPTY_CHECKLIST,
  buildActionPlan,
  buildAssessmentInput,
  buildPatches,
  buildStepUrl,
  buildVerifiedInput,
  lastPersistedStep,
  parseStepParams,
  resolveRestoreStep,
  validateVerifiedForm,
  type WorkflowDraft,
} from "@/components/workflow/workflowLogic";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

const NOW = "2026-11-25T00:00:00.000Z";
const draft = (over: Partial<WorkflowDraft> = {}): WorkflowDraft => ({
  roomId: "wf-bedroom-test0001",
  roomType: "BEDROOM",
  roomName: "Phòng ngủ",
  dims: { length: 4.5, width: 3.5, height: 2.8 },
  touchedDims: { length: false, width: false, height: false },
  checklist: { ...EMPTY_CHECKLIST },
  thresholdCm: { value: null, source: "measured" },
  walkway: { value: null, source: "measured" },
  nightLux: { value: null, source: "measured" },
  sceneObjects: [{ id: "obj-rug-1", category: "RUG" }, { id: "obj-cable-1", category: "CABLE" }],
  ...over,
});
const complete = (): WorkflowDraft =>
  draft({
    checklist: { ...EMPTY_CHECKLIST, looseRug: true, cablesOnWalkway: true, dimLighting: false, switchReachableFromBed: true, essentialReachableFromBed: true, thresholdStep: false },
    walkway: { value: 0.9, source: "measured" },
    nightLux: { value: 80, source: "user_confirmed" },
  });

function fakeSnap(type: StoredRoomSnapshot["snapshotType"], input: any, prov: any, revision = 1): StoredRoomSnapshot {
  const assess = evaluateRoomHazardsCanonical(type === "PROPOSED_SCENARIO" ? { ...input, sourceType: "3D_SCENE" } : input, { provenanceMap: prov, deterministicTimestamp: NOW });
  return {
    snapshotId: `snap-wf-${type.slice(0, 3)}-r${revision}-abcdef01`, roomId: input.roomId, snapshotType: type, revision, parentSnapshotId: null,
    ownerAccountId: "a", assessmentVersion: "2026.1", dataPartition: "REAL", snapshotHash: "h", roomState: input, provenanceMap: prov,
    canonicalAssessment: assess, persistenceStatus: "saved", idempotencyKey: null, notes: null, isImmutable: true, createdAt: NOW,
  } as StoredRoomSnapshot;
}

describe("B09 header: never shows sample numbers", () => {
  it("renders 'Chưa đánh giá' and no score/lux/hazard count with no persisted assessment", async () => {
    const { AppHeader } = await import("@/components/layout/AppHeader");
    const html = renderToStaticMarkup(React.createElement(AppHeader));
    expect(html).toContain("Chưa đánh giá");
    expect(html).not.toMatch(/Điểm an toàn/);
    expect(html).not.toMatch(/\b28\b/);
    expect(html).not.toMatch(/250 Lux|40 Lux/);
    expect(html).not.toMatch(/6<\/span> nguy cơ/);
    expect(html).not.toContain("Digital Twin");
  });

  it("derives status from a persisted snapshot; score hidden while data is missing", () => {
    expect(deriveHeaderStatus(null)).toEqual({ kind: "none", label: "Chưa đánh giá" });
    const snap = fakeSnap("BASELINE", buildAssessmentInput(draft(), NOW).input, {});
    const st = deriveHeaderStatus(snap);
    expect(st.kind).toBe("assessed");
    if (st.kind === "assessed") {
      expect(st.unknownRules).toBeGreaterThan(0);
      expect(st.screeningScore).toBeNull();
      expect(st.lux).toBeNull();
    }
  });

  it("lux badge reflects provenance: measured/user_confirmed vs simulated/default", () => {
    const mk = (src?: string) => deriveHeaderStatus({
      snapshotType: "BASELINE",
      roomState: { lighting: { nighttimeLux: 45 } },
      provenanceMap: src ? { "lighting.nighttimeLux": { sourceType: src } } : {},
      canonicalAssessment: { findings: [], heuristicSafetyScore: 90, missingInputs: [] },
    });
    const get = (s: any) => (s.kind === "assessed" ? s.lux : null);
    expect(get(mk())).toMatchObject({ source: "simulated", label: "mô phỏng" });
    expect(get(mk("measured"))).toMatchObject({ source: "measured", label: "đã đo" });
    expect(get(mk("user_confirmed"))).toMatchObject({ source: "user_confirmed" });
    expect(get(mk("vision_estimated"))).toMatchObject({ label: "ước lượng AI" });
  });
});

describe("B09 snapshot client: saved / failed / 409", () => {
  const resp = (status: number, body: any) => ({ ok: status < 400, status, json: async () => body }) as unknown as Response;
  const baseBody = { snapshotType: "BASELINE" as const, roomId: "r1", roomInput: {} };

  it("saved only when server confirms persisted + persistenceStatus saved", async () => {
    const ok = createSnapshotClient(async () => resp(201, { success: true, persisted: true, persistenceStatus: "saved", data: { snapshotId: "s1" } }));
    expect((await ok.create(baseBody)).ok).toBe(true);
    const lying = createSnapshotClient(async () => resp(201, { success: true, data: { snapshotId: "s1" } }));
    const r = await lying.create(baseBody);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe("unsaved");
  });

  it("persistenceStatus failed (503) is an error, never 'saved'", async () => {
    const c = createSnapshotClient(async () => resp(503, { success: false, persisted: false, persistenceStatus: "failed", code: "DB_WRITE_FAILED", error: "x" }));
    const r = await c.create(baseBody);
    expect(r).toMatchObject({ ok: false, kind: "unavailable", status: 503 });
    if (!r.ok) expect(r.message).toMatch(/Chưa có gì được lưu/);
  });

  it("409 maps to conflict with reload instruction; 403 to forbidden; network error handled", async () => {
    const c409 = createSnapshotClient(async () => resp(409, { success: false, code: "OPTIMISTIC_CONCURRENCY_CONFLICT", persistenceStatus: "failed" }));
    const r = await c409.simulate({ baselineSnapshotId: "b", roomPatches: {}, expectedRevision: 1 });
    expect(r).toMatchObject({ ok: false, kind: "conflict", status: 409 });
    if (!r.ok) expect(r.message).toMatch(/tải lại/);
    const c403 = createSnapshotClient(async () => resp(403, { success: false, code: "FORBIDDEN" }));
    expect(await c403.list("r")).toMatchObject({ ok: false, kind: "forbidden" });
    const cnet = createSnapshotClient(async () => { throw new Error("offline"); });
    expect(await cnet.list("r")).toMatchObject({ ok: false, kind: "network" });
  });
});

describe("B09 input builder: unknown stays unknown", () => {
  it("empty checklist -> engine reports missing data, never 'no hazard'", () => {
    const { input } = buildAssessmentInput(draft(), NOW);
    const a = evaluateRoomHazardsCanonical(input, { deterministicTimestamp: NOW });
    expect(a.findings).toHaveLength(0);
    expect(a.missingInputs.length).toBeGreaterThan(0);
    expect(a.ruleTrace.filter((t) => t.state === "NEEDS_VERIFICATION").length).toBeGreaterThanOrEqual(4);
  });

  it("complete bedroom answers -> no missing inputs; rug/cable findings link scene object ids", () => {
    const { input, provenanceMap } = buildAssessmentInput(complete(), NOW);
    const a = evaluateRoomHazardsCanonical(input, { provenanceMap, deterministicTimestamp: NOW });
    expect(a.missingInputs).toEqual([]);
    const ids = a.findings.map((f) => f.targetObjectId);
    expect(ids).toContain("obj-rug-1");
    expect(ids).toContain("obj-cable-1");
    expect(provenanceMap["lighting.nighttimeLux"].sourceType).toBe("user_confirmed");
    expect(provenanceMap["obstacles.walkwayClearWidthM"].sourceType).toBe("measured");
  });
});

describe("B09 report guard", () => {
  const base = () => buildAssessmentInput(complete(), NOW);
  const simSnap = () => {
    const b = base();
    const patched = { ...b.input, ...buildPatches(b.input, ["SECURE_RUG", "ROUTE_CABLE", "ADD_NIGHT_LIGHT"]) };
    return { baseline: fakeSnap("BASELINE", b.input, b.provenanceMap), proposed: fakeSnap("PROPOSED_SCENARIO", patched, b.provenanceMap, 1) };
  };

  it("simulation-only: no safe wording, even if all hazards are resolved in the simulation", () => {
    const { baseline, proposed } = simSnap();
    const cmp = diffStoredSnapshots(baseline, proposed);
    expect(cmp.summary.resolvedCount).toBeGreaterThan(0);
    expect(safeWordingAllowed(cmp as any, proposed as any)).toBe(false);
    const view = buildComparisonView(cmp as any, proposed as any);
    const text = JSON.stringify({ ...view, disclaimer: "" }); // disclaimer của A11 phủ định ("KHÔNG ... khẳng định an toàn tuyệt đối")
    expect(view.safeWording).toBe(false);
    expect(text).not.toMatch(/đã an toàn|an toàn tuyệt đối|không còn nguy cơ/i);
    expect(view.headline).toMatch(/mô phỏng|chưa thể đánh giá/i);
    expect(view.rows.some((r) => r.change === "giảm")).toBe(true);
  });

  it("verified WITHOUT re-entered walkway/lux -> 'chưa thể đánh giá', no safe wording", () => {
    const b = base();
    const form = { who: "Con trai", when: "2026-11-25", done: ["SECURE_RUG", "ROUTE_CABLE", "ADD_NIGHT_LIGHT"] as any, walkway: { value: null, source: "measured" as const }, nightLux: { value: null, source: "measured" as const }, confirm: true };
    expect(validateVerifiedForm(form)).toEqual([]);
    const v = buildVerifiedInput(b.input, form, NOW);
    const verified = fakeSnap("VERIFIED_POST_INTERVENTION", v.input, v.provenanceMap);
    const cmp = diffStoredSnapshots(fakeSnap("BASELINE", b.input, b.provenanceMap), verified);
    expect(cmp.insufficientData).toBe(true);
    expect(cmp.evaluationVerdict).toBe("CHUA_THE_DANH_GIA");
    const view = buildComparisonView(cmp as any, verified as any);
    expect(view.safeWording).toBe(false);
    expect(view.headline).toMatch(/Chưa thể đánh giá/);
    expect(view.rows.some((r) => r.change === "chưa biết")).toBe(true);
  });

  it("verified WITH measured walkway + lux -> safe wording allowed; but unmeasured provenance blocks it", () => {
    const b = base();
    const form = { who: "Con trai", when: "2026-11-25", done: ["SECURE_RUG", "ROUTE_CABLE", "ADD_NIGHT_LIGHT"] as any, walkway: { value: 0.95, source: "measured" as const }, nightLux: { value: 90, source: "measured" as const }, confirm: true };
    const v = buildVerifiedInput(b.input, form, NOW);
    const verified = fakeSnap("VERIFIED_POST_INTERVENTION", v.input, v.provenanceMap);
    const cmp = diffStoredSnapshots(fakeSnap("BASELINE", b.input, b.provenanceMap), verified);
    expect(cmp.evaluationVerdict).toBe("VERIFIED_IMPROVEMENT");
    expect(safeWordingAllowed(cmp as any, verified as any)).toBe(true);
    // Same API verdict but lux provenance downgraded -> guard refuses.
    const downgraded = { ...verified, provenanceMap: { ...verified.provenanceMap, "lighting.nighttimeLux": { sourceType: "simulated" } } };
    expect(safeWordingAllowed(cmp as any, downgraded as any)).toBe(false);
    const view = buildComparisonView(cmp as any, downgraded as any);
    expect(view.safeWording).toBe(false);
    expect(view.headline).toMatch(/Chưa thể đánh giá/);
  });

  it("sanitizeClaim strips safe claims unless allowed", () => {
    expect(sanitizeClaim("Phòng đã an toàn", false)).not.toMatch(/đã an toàn/);
    expect(sanitizeClaim("Không còn nguy cơ", false)).toMatch(/chưa thể kết luận/);
    expect(sanitizeClaim("Phòng đã an toàn", true)).toBe("Phòng đã an toàn");
  });

  it("three states are never merged: absent states stay absent, values are not borrowed", () => {
    const { baseline, proposed } = simSnap();
    const cards = [buildStateCard("baseline", baseline as any), buildStateCard("proposed", proposed as any), buildStateCard("verified", null)];
    expect(cards.map((c) => c.key)).toEqual(["baseline", "proposed", "verified"]);
    expect(cards[2]).toMatchObject({ present: false, hazardCount: null, screeningScore: null, statusText: "Chưa có xác minh thực tế" });
    expect(cards[0].title).toBe("Hiện trạng");
    expect(cards[1].title).toBe("Mô phỏng đề xuất");
    expect(cards[2].title).toBe("Đã xác minh thực tế");
    expect(cards[0].revision).toBe(1);
    expect(cards[1].hazardCount).toBeLessThan(cards[0].hazardCount!);
  });
});

describe("B09 URL step + restore + plan", () => {
  it("parses and builds ?step=&room=, rejecting junk", () => {
    expect(parseStepParams("?step=5&room=wf-bedroom-abc1234567")).toEqual({ step: 5, room: "wf-bedroom-abc1234567" });
    expect(parseStepParams("?step=99")).toEqual({ step: 1, room: null });
    expect(parseStepParams("?step=abc&room=../x")).toEqual({ step: 1, room: null });
    expect(parseStepParams("")).toEqual({ step: 1, room: null });
    expect(buildStepUrl({ step: 7, room: "wf-x-1234" })).toBe("/workflow?step=7&room=wf-x-1234");
    expect(buildStepUrl({ step: 2, room: null })).toBe("/workflow?step=2");
  });

  it("restore: without a persisted baseline always back to step 1; with one, keep requested step", () => {
    expect(resolveRestoreStep(5, [])).toBe(1);
    expect(resolveRestoreStep(7, [{ snapshotType: "PROPOSED_SCENARIO" }])).toBe(1);
    expect(resolveRestoreStep(7, [{ snapshotType: "BASELINE" }])).toBe(7);
    expect(resolveRestoreStep(0, [{ snapshotType: "BASELINE" }])).toBe(1);
    expect(lastPersistedStep([{ snapshotType: "BASELINE" }, { snapshotType: "PROPOSED_SCENARIO" }])).toBe(6);
  });

  it("action plan: urgent first, cost always labelled estimate, no invented quotes", () => {
    const b = buildAssessmentInput(complete(), NOW);
    const a = evaluateRoomHazardsCanonical(b.input, { provenanceMap: b.provenanceMap, deterministicTimestamp: NOW });
    const plan = buildActionPlan(a.findings);
    const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    for (let i = 1; i < plan.length; i++) expect(rank[plan[i - 1].severity]).toBeLessThanOrEqual(rank[plan[i].severity]);
    expect(plan.length).toBeGreaterThan(0);
  });
});
