import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/database/prisma";
import {
  B09_BEDROOM_BASELINE_INPUT,
  B09_INSUFFICIENT_AFTER_INPUT,
  B09_PROPOSED_SCENARIO_PATCHES,
  B09_VERIFIED_POST_INTERVENTION_INPUT,
} from "@/data/beforeAfterFixturesB09";
import { GET as getSnapshots, POST as postSnapshot } from "@/app/api/v1/snapshots/route";
import { POST as simulateSnapshot } from "@/app/api/v1/snapshots/simulate/route";
import { POST as compareSnapshotsApi } from "@/app/api/v1/snapshots/compare/route";
import { POST as rollbackSnapshot } from "@/app/api/v1/snapshots/rollback/route";

function apiReq(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("Task A11 — Immutable Room Snapshots & Before-After API v1", () => {
  beforeEach(async () => {
    await prisma.roomSnapshotRecord.deleteMany({});
    await prisma.persistenceAuditEvent.deleteMany({ where: { resourceType: { in: ["ROOM_SNAPSHOT", "BEFORE_AFTER_EXPORT"] } } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. End-to-end lifecycle on same room (BASELINE -> PROPOSED_SCENARIO -> VERIFIED_POST_INTERVENTION) never mutates baseline & exports diff", async () => {
    const ownerHeader = { "x-test-account-id": "acct-family-1" };

    // 1a. Create BASELINE
    const baseRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "BASELINE",
          roomInput: B09_BEDROOM_BASELINE_INPUT,
          notes: "Baseline survey room-bedroom-b09",
        },
        { ...ownerHeader, "Idempotency-Key": "a11-base-key-1" }
      )
    );
    expect(baseRes.status).toBe(201);
    const baseJson = await baseRes.json();
    expect(baseJson.persistenceStatus).toBe("saved");
    expect(baseJson.data.snapshotType).toBe("BASELINE");
    expect(baseJson.data.revision).toBe(1);
    const baselineId = baseJson.data.snapshotId;
    const baselineHash = baseJson.data.snapshotHash;

    // 1b. Attempting to overwrite BASELINE without matching idempotency key fails (HTTP 409)
    const overwriteRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "BASELINE",
          roomInput: { ...B09_BEDROOM_BASELINE_INPUT, lighting: { ...B09_BEDROOM_BASELINE_INPUT.lighting, nighttimeLux: 99 } },
        },
        ownerHeader
      )
    );
    expect(overwriteRes.status).toBe(409);
    const overwriteJson = await overwriteRes.json();
    expect(overwriteJson.persistenceStatus).toBe("failed");
    expect(overwriteJson.code).toBe("IMMUTABLE_BASELINE_EXISTS");

    // 1c. Simulate changes -> PROPOSED_SCENARIO (baseline untouched)
    const simRes = await simulateSnapshot(
      apiReq(
        "/api/v1/snapshots/simulate",
        "POST",
        {
          baselineSnapshotId: baselineId,
          roomPatches: B09_PROPOSED_SCENARIO_PATCHES,
          notes: "Simulated 3D fix",
        },
        ownerHeader
      )
    );
    expect(simRes.status).toBe(201);
    const simJson = await simRes.json();
    expect(simJson.isSimulatedProposal).toBe(true);
    expect(simJson.data.snapshotType).toBe("PROPOSED_SCENARIO");
    expect(simJson.data.parentSnapshotId).toBe(baselineId);
    const simId = simJson.data.snapshotId;

    // Baseline still identical
    const checkBase = await getSnapshots(
      apiReq(`/api/v1/snapshots?snapshotId=${baselineId}`, "GET", undefined, ownerHeader)
    );
    const checkBaseJson = await checkBase.json();
    expect(checkBaseJson.data.snapshotHash).toBe(baselineHash);

    // 1d. Compare BASELINE vs PROPOSED_SCENARIO -> not verified in real world, includes "if not measured" warning
    const cmpSimRes = await compareSnapshotsApi(
      apiReq(
        "/api/v1/snapshots/compare",
        "POST",
        { baselineSnapshotId: baselineId, afterSnapshotId: simId },
        ownerHeader
      )
    );
    expect(cmpSimRes.status).toBe(200);
    const cmpSim = (await cmpSimRes.json()).data;
    expect(cmpSim.evaluationVerdict).toBe("PROPOSED_SIMULATION_ONLY");
    expect(cmpSim.canClaimVerifiedIntervention).toBe(false);
    expect(cmpSim.summary.resolvedCount).toBeGreaterThanOrEqual(2);
    expect(cmpSim.findingDiffs.some((d: any) => d.notMeasuredWarning?.includes("if not measured"))).toBe(true);
    expect(cmpSim.aggregateScoreDisclaimer).toContain("KHÔNG dùng điểm tổng đơn lẻ");

    // 1e. Create VERIFIED_POST_INTERVENTION & compare
    const verRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "VERIFIED_POST_INTERVENTION",
          roomInput: B09_VERIFIED_POST_INTERVENTION_INPUT,
          parentSnapshotId: simId,
          notes: "Measured post physical modification",
        },
        ownerHeader
      )
    );
    expect(verRes.status).toBe(201);
    const verId = (await verRes.json()).data.snapshotId;

    const cmpVerRes = await compareSnapshotsApi(
      apiReq(
        "/api/v1/snapshots/compare",
        "POST",
        { baselineSnapshotId: baselineId, afterSnapshotId: verId, format: "export" },
        ownerHeader
      )
    );
    expect(cmpVerRes.status).toBe(200);
    expect(cmpVerRes.headers.get("Content-Disposition")).toContain("attachment");
    const cmpVerExport = JSON.parse(await cmpVerRes.text());
    expect(cmpVerExport.data.evaluationVerdict).toBe("VERIFIED_IMPROVEMENT");
    expect(cmpVerExport.data.canClaimVerifiedIntervention).toBe(true);
    expect(cmpVerExport.data.summary.resolvedCount).toBeGreaterThanOrEqual(3);
  });

  it("2. Enforces optimistic concurrency check, idempotent replay & immutable rollback", async () => {
    const ownerHeader = { "x-test-account-id": "acct-family-2" };

    // First PROPOSED_SCENARIO revision (revision 1)
    const r1 = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "PROPOSED_SCENARIO",
          roomInput: B09_BEDROOM_BASELINE_INPUT,
          expectedRevision: 0,
        },
        { ...ownerHeader, "Idempotency-Key": "sim-idem-key-1" }
      )
    );
    expect(r1.status).toBe(201);
    const s1 = (await r1.json()).data;

    // Duplicate idempotency replay returns 200 idempotentReplay=true
    const r1Replay = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "PROPOSED_SCENARIO",
          roomInput: B09_BEDROOM_BASELINE_INPUT,
        },
        { ...ownerHeader, "Idempotency-Key": "sim-idem-key-1" }
      )
    );
    expect(r1Replay.status).toBe(200);
    expect((await r1Replay.json()).idempotentReplay).toBe(true);

    // Stale expectedRevision=0 when revision 1 already exists -> 409 CONFLICT
    const staleRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "PROPOSED_SCENARIO",
          roomInput: B09_VERIFIED_POST_INTERVENTION_INPUT,
          expectedRevision: 0,
        },
        ownerHeader
      )
    );
    expect(staleRes.status).toBe(409);
    const staleJson = await staleRes.json();
    expect(staleJson.persistenceStatus).toBe("failed");
    expect(staleJson.code).toBe("OPTIMISTIC_CONCURRENCY_CONFLICT");

    // Advance cleanly to revision 2
    const r2 = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "PROPOSED_SCENARIO",
          roomInput: B09_VERIFIED_POST_INTERVENTION_INPUT,
          expectedRevision: 1,
        },
        ownerHeader
      )
    );
    expect(r2.status).toBe(201);
    expect((await r2.json()).data.revision).toBe(2);

    // Rollback to revision 1 creates immutable revision 3 pointing parentSnapshotId -> s1
    const rbRes = await rollbackSnapshot(
      apiReq(
        "/api/v1/snapshots/rollback",
        "POST",
        {
          targetSnapshotId: s1.snapshotId,
          expectedRevision: 2,
          reason: "Quay lại phương án trước đó",
        },
        ownerHeader
      )
    );
    expect(rbRes.status).toBe(201);
    const rbJson = await rbRes.json();
    expect(rbJson.data.revision).toBe(3);
    expect(rbJson.data.parentSnapshotId).toBe(s1.snapshotId);

    const listRes = await getSnapshots(
      apiReq(`/api/v1/snapshots?roomId=${B09_BEDROOM_BASELINE_INPUT.roomId}`, "GET", undefined, ownerHeader)
    );
    expect((await listRes.json()).count).toBe(3);
  });

  it("3. DB write failures explicitly return HTTP 503 persistenceStatus='failed' (never marked saved/done)", async () => {
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("SQLITE_FULL: disk unavailable"));

    const res = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "BASELINE",
          roomInput: B09_BEDROOM_BASELINE_INPUT,
        },
        { "x-test-account-id": "acct-db-err" }
      )
    );

    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.persisted).toBe(false);
    expect(json.persistenceStatus).toBe("failed");
  });

  it("4. Blocks cross-owner access (IDOR) across list, simulate, compare & rollback with HTTP 403", async () => {
    const ownerA = { "x-test-account-id": "acct-owner-a" };
    const ownerB = { "x-test-account-id": "acct-owner-b" };

    const createRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        { snapshotType: "BASELINE", roomInput: B09_BEDROOM_BASELINE_INPUT },
        ownerA
      )
    );
    expect(createRes.status).toBe(201);
    const baseId = (await createRes.json()).data.snapshotId;

    const getB = await getSnapshots(apiReq(`/api/v1/snapshots?snapshotId=${baseId}`, "GET", undefined, ownerB));
    expect(getB.status).toBe(403);

    const simB = await simulateSnapshot(
      apiReq(
        "/api/v1/snapshots/simulate",
        "POST",
        { baselineSnapshotId: baseId, roomPatches: B09_PROPOSED_SCENARIO_PATCHES },
        ownerB
      )
    );
    expect(simB.status).toBe(403);

    const rbB = await rollbackSnapshot(
      apiReq("/api/v1/snapshots/rollback", "POST", { targetSnapshotId: baseId }, ownerB)
    );
    expect(rbB.status).toBe(403);

    const cmpB = await compareSnapshotsApi(
      apiReq(
        "/api/v1/snapshots/compare",
        "POST",
        { baselineSnapshotId: baseId, afterSnapshotId: baseId },
        ownerB
      )
    );
    expect(cmpB.status).toBe(403);
  });

  it("5. Insufficient after-snapshot data yields explicit 'chưa thể đánh giá' verdict (never 'đã an toàn') & rejects PHOTO_DRAFT", async () => {
    const ownerHeader = { "x-test-account-id": "acct-insuff-check" };

    // PHOTO_DRAFT snapshot must be rejected cleanly (422)
    const draftRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        {
          snapshotType: "VERIFIED_POST_INTERVENTION",
          roomInput: { ...B09_BEDROOM_BASELINE_INPUT, evidenceStatus: "PHOTO_DRAFT" },
        },
        ownerHeader
      )
    );
    expect(draftRes.status).toBe(422);

    const baseRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        { snapshotType: "BASELINE", roomInput: B09_BEDROOM_BASELINE_INPUT },
        ownerHeader
      )
    );
    const baseId = (await baseRes.json()).data.snapshotId;

    const insuffRes = await postSnapshot(
      apiReq(
        "/api/v1/snapshots",
        "POST",
        { snapshotType: "VERIFIED_POST_INTERVENTION", roomInput: B09_INSUFFICIENT_AFTER_INPUT },
        ownerHeader
      )
    );
    expect(insuffRes.status).toBe(201);
    const insuffId = (await insuffRes.json()).data.snapshotId;

    const cmpRes = await compareSnapshotsApi(
      apiReq(
        "/api/v1/snapshots/compare",
        "POST",
        { baselineSnapshotId: baseId, afterSnapshotId: insuffId },
        ownerHeader
      )
    );
    expect(cmpRes.status).toBe(200);
    const diff = (await cmpRes.json()).data;

    expect(diff.insufficientData).toBe(true);
    expect(diff.evaluationVerdict).toBe("CHUA_THE_DANH_GIA");
    expect(diff.verdictLabel.toLowerCase()).toContain("chưa thể đánh giá");
    expect(diff.verdictLabel.toLowerCase()).not.toContain("đã an toàn");
    expect(diff.canClaimVerifiedIntervention).toBe(false);
    expect(diff.summary.needsVerificationCount).toBeGreaterThanOrEqual(2);
    expect(diff.summary.missingDataFields.length).toBeGreaterThan(0);
  });
});

