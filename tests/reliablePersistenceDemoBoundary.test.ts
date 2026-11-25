import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { INITIAL_ROOMS } from "@/data/mockRooms";
import { POST as postAssessment } from "@/app/api/assessments/route";
import { GET as getRooms } from "@/app/api/rooms/route";
import { POST as evaluateRisk } from "@/app/api/risk-assessment/evaluate/route";
import { GET as getAssessmentReport } from "@/app/api/risk-assessment/[assessmentId]/report/route";
import { GET as exportSurvey } from "@/app/api/surveys/[id]/export/route";
import { DELETE as deleteSimulation } from "@/app/api/simulations/[id]/route";
import { createSimulation } from "@/lib/simulations/persistence";
import {
  generateAssessmentReport,
  runAndPersistAssessment,
  invalidateRoomAssessments,
} from "@/lib/risk/assessmentManager";
import {
  assertRealFieldEvidenceForReport,
  classifyDataPartition,
  DemoDataExportBlockedError,
  excludeDemoFromRealQueries,
} from "@/lib/persistence/demoBoundary";
import {
  assertTenantAccess,
  CrossTenantAccessError,
  getRealResearchStatistics,
  IdempotencyConflictError,
  persistAssessmentTransaction,
} from "@/lib/persistence/reliablePersistence";
import {
  assertSafeForDestructiveSeed,
  ProductionGuardError,
} from "@/lib/config/envConfig";
import { familyDatabase, disconnectAccountStores } from "@/lib/auth/accounts";

function jsonReq(url: string, method: string, body?: unknown, headers?: Record<string, string>) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      origin: "http://localhost",
      ...(headers || {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("Task A05 — Reliable Persistence & DEMO vs REAL Boundary", () => {
  describe("1. DB Outage Simulation — Never Fake Success or Fallback to Mock Rooms", () => {
    it("GET /api/rooms returns HTTP 503 failed instead of falling back to INITIAL_ROOMS when DB fails", async () => {
      vi.spyOn(prisma.room, "findMany").mockRejectedValueOnce(new Error("SQLITE_CANTOPEN: db offline"));

      const res = await getRooms(jsonReq("/api/rooms", "GET"));
      expect(res.status).toBe(503);
      const payload = await res.json();
      expect(payload.success).toBe(false);
      expect(payload.persistenceStatus).toBe("failed");
      expect(payload.rooms).toBeUndefined();
    });

    it("POST /api/assessments returns HTTP 503 with persistenceStatus='failed' when DB transaction fails", async () => {
      vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("ECONNRESET: database down"));

      const res = await postAssessment(
        jsonReq("/api/assessments", "POST", {
          roomState: INITIAL_ROOMS[0],
        })
      );
      expect(res.status).toBe(503);
      const payload = await res.json();
      expect(payload.success).toBe(false);
      expect(payload.persisted).toBe(false);
      expect(payload.persistenceStatus).toBe("failed");
    });

    it("POST /api/risk-assessment/evaluate returns HTTP 503 failed when room lookup throws DB outage", async () => {
      vi.spyOn(prisma.room, "findUnique").mockRejectedValueOnce(new Error("SQLITE_IOERR"));

      const res = await evaluateRisk(
        jsonReq("/api/risk-assessment/evaluate", "POST", {
          ...INITIAL_ROOMS[0],
          requirePersistence: true,
        })
      );
      expect(res.status).toBe(503);
      const payload = await res.json();
      expect(payload.success).toBe(false);
      expect(payload.persistenceStatus).toBe("failed");
    });
  });

  describe("2. Transaction Atomicity, Rollback & Idempotency", () => {
    it("replays duplicate assessment submissions idempotently without creating duplicate DB rows", async () => {
      const createdRoom = await createSimulation({
        name: "Phòng thực tế kiểm thử Idempotency",
        roomType: "BEDROOM",
      });
      const idemKey = `idem-test-${Date.now()}`;

      const firstRes = await postAssessment(
        jsonReq("/api/assessments", "POST", { roomState: createdRoom }, { "Idempotency-Key": idemKey })
      );
      expect(firstRes.status).toBe(201);
      const firstBody = await firstRes.json();
      expect(firstBody.persistenceStatus).toBe("saved");
      expect(firstBody.persisted).toBe(true);
      expect(firstBody.idempotentReplay).toBe(false);

      // Duplicate retry with same Idempotency-Key
      const secondRes = await postAssessment(
        jsonReq("/api/assessments", "POST", { roomState: createdRoom }, { "Idempotency-Key": idemKey })
      );
      expect(secondRes.status).toBe(200);
      const secondBody = await secondRes.json();
      expect(secondBody.persistenceStatus).toBe("saved");
      expect(secondBody.idempotentReplay).toBe(true);

      // Verify only 1 Assessment exists in DB for this room
      const assessmentsInDb = await prisma.assessment.findMany({ where: { roomId: createdRoom.id } });
      expect(assessmentsInDb).toHaveLength(1);

      // Verify DUPLICATE_REPLAYED audit event was recorded
      const audits = await prisma.persistenceAuditEvent.findMany({
        where: { roomId: createdRoom.id },
        orderBy: { createdAt: "asc" },
      });
      expect(audits.some((a) => a.action === "CREATED")).toBe(true);
      expect(audits.some((a) => a.action === "DUPLICATE_REPLAYED")).toBe(true);

      // Conflict when using the same Idempotency-Key on a different room
      const secondRoom = await createSimulation({ name: "Phòng thứ 2", roomType: "BATHROOM" });
      await expect(
        persistAssessmentTransaction({
          snapshot: { ...firstBody, id: `asmt-${Date.now()}`, roomId: secondRoom.id } as any,
          idempotencyKey: idemKey,
        })
      ).rejects.toBeInstanceOf(IdempotencyConflictError);

      await prisma.room.deleteMany({ where: { id: { in: [createdRoom.id, secondRoom.id] } } });
      invalidateRoomAssessments(createdRoom.id);
    });

    it("rolls back entire transaction when HazardFinding persistence fails", async () => {
      const createdRoom = await createSimulation({
        name: "Phòng kiểm thử Rollback",
        roomType: "BEDROOM",
      });
      const beforeAssessments = await prisma.assessment.count({ where: { roomId: createdRoom.id } });

      // Inject an invalid finding (null title violates non-null Prisma schema inside transaction)
      const brokenSnapshot: any = {
        id: `asmt-rollback-${Date.now()}`,
        roomId: createdRoom.id,
        roomName: createdRoom.name,
        roomType: createdRoom.roomType,
        snapshotType: "BASELINE",
        createdAt: new Date().toISOString(),
        safetyScore: 70,
        totalRulesEvaluated: 1,
        detectedCount: 1,
        needsVerificationCount: 0,
        highPriorityCount: 1,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        ruleEvaluations: [],
        findings: [
          {
            id: "finding-broken",
            ruleId: "RISK-001",
            hazardType: "LOOSE_RUG",
            title: null, // Triggers SQLite NOT NULL constraint inside transaction!
            description: "desc",
            severityCategory: "HIGH",
            evidence: {},
            recommendationText: "fix",
            status: "ACTIVE",
          },
        ],
        recommendations: [],
        input: createdRoom,
      };

      await expect(persistAssessmentTransaction({ snapshot: brokenSnapshot })).rejects.toThrow();

      // Assessment count must remain unchanged due to atomic rollback
      const afterAssessments = await prisma.assessment.count({ where: { roomId: createdRoom.id } });
      expect(afterAssessments).toBe(beforeAssessments);

      await prisma.room.delete({ where: { id: createdRoom.id } });
    });

    it("deletes room inside transaction and writes DELETED audit event", async () => {
      const createdRoom = await createSimulation({
        name: "Phòng kiểm thử Xóa",
        roomType: "BATHROOM",
      });

      const delRes = await deleteSimulation(jsonReq(`/api/simulations/${createdRoom.id}`, "DELETE"), {
        params: Promise.resolve({ id: createdRoom.id }),
      });
      expect(delRes.status).toBe(200);
      const body = await delRes.json();
      expect(body.persistenceStatus).toBe("saved");
      expect(body.auditEventId).toBeTruthy();

      const deletedAudit = await prisma.persistenceAuditEvent.findUnique({
        where: { id: body.auditEventId },
      });
      expect(deletedAudit?.action).toBe("DELETED");
      expect(deletedAudit?.roomId).toBe(createdRoom.id);
    });
  });

  describe("3. DEMO vs REAL Data Partitioning, Banner & Export Guard", () => {
    it("classifies seeded mock rooms and demo-prefixed IDs as DEMO and filters them from real research stats", async () => {
      expect(classifyDataPartition(INITIAL_ROOMS[0])).toBe("DEMO");
      expect(classifyDataPartition({ id: "demo-room-123" })).toBe("DEMO");
      expect(classifyDataPartition({ id: "real-room-abc", dataPartition: "REAL" })).toBe("REAL");

      // Create 1 DEMO project/room and 1 REAL room in DB
      const ts = Date.now();
      const demoRoomId = `demo-room-${ts}`;
      const demoAsmtId = `demo-asmt-${ts}`;
      const demoProj = await prisma.project.create({
        data: {
          id: `demo-proj-${ts}`,
          name: "Dự án Demo",
          dataPartition: "DEMO",
          homes: {
            create: {
              id: `demo-home-${ts}`,
              name: "Nhà Demo",
              dataPartition: "DEMO",
              rooms: {
                create: {
                  id: demoRoomId,
                  name: "Phòng Demo",
                  roomType: "BEDROOM",
                  dataPartition: "DEMO",
                  assessments: {
                    create: {
                      id: demoAsmtId,
                      safetyScore: 10, // Extreme outlier score in DEMO should NOT skew REAL research average!
                      dataPartition: "DEMO",
                      notes: JSON.stringify({
                        format: "risk-snapshot-v1",
                        snapshot: {
                          id: demoAsmtId,
                          roomId: demoRoomId,
                          roomName: "Phòng Demo",
                          roomType: "BEDROOM",
                          createdAt: new Date().toISOString(),
                          safetyScore: 10,
                          totalRulesEvaluated: 8,
                          detectedCount: 4,
                          needsVerificationCount: 0,
                          highPriorityCount: 4,
                          mediumPriorityCount: 0,
                          lowPriorityCount: 0,
                          findings: [],
                          recommendations: [],
                          ruleEvaluations: [],
                        },
                      }),
                    },
                  },
                },
              },
            },
          },
        },
        include: { homes: { include: { rooms: { include: { assessments: true } } } } },
      });

      const realRoom = await createSimulation({ name: "Phòng Nghiên cứu Thực tế", roomType: "BEDROOM" });
      await runAndPersistAssessment(realRoom);

      // Research statistics must strictly exclude DEMO records
      const stats = await getRealResearchStatistics();
      expect(stats.dataPartition).toBe("REAL");
      expect(stats.totalRealRooms).toBeGreaterThanOrEqual(1);

      const allRooms = await prisma.room.findMany();
      const filtered = excludeDemoFromRealQueries(allRooms);
      expect(filtered.some((r) => r.id.startsWith("demo-"))).toBe(false);
      expect(filtered.some((r) => r.id === realRoom.id)).toBe(true);

      // Demo Report Export Guard via strict assertion & HTTP API
      const demoAsmt = demoProj.homes[0].rooms[0].assessments[0];
      expect(() =>
        assertRealFieldEvidenceForReport({ id: demoAsmt.id, dataPartition: "DEMO" })
      ).toThrow(DemoDataExportBlockedError);

      // API report endpoint blocks DEMO export without preview flag
      const blockedReportRes = await getAssessmentReport(
        jsonReq(`/api/risk-assessment/${demoAsmt.id}/report`, "GET"),
        { params: Promise.resolve({ assessmentId: demoAsmt.id }) }
      );
      expect(blockedReportRes.status).toBe(403);
      const blockedJson = await blockedReportRes.json();
      expect(blockedJson.code).toBe("DEMO_EXPORT_BLOCKED");

      // Survey Export Guard blocks DEMO survey export
      const demoSurvey = await prisma.homeSurvey.create({
        data: {
          id: `demo-survey-${Date.now()}`,
          name: "Khảo sát Demo",
          dataPartition: "DEMO",
        },
      });
      const blockedSurveyRes = await exportSurvey(
        jsonReq(`/api/surveys/${demoSurvey.id}/export`, "GET"),
        { params: Promise.resolve({ id: demoSurvey.id }) }
      );
      expect(blockedSurveyRes.status).toBe(403);

      // Preview mode with explicit banner works for demo videos
      const demoReportWithBanner = generateAssessmentReport(
        {
          id: "demo-snap-preview",
          roomId: "room-bedroom-01",
          roomName: "Phòng mẫu",
          roomType: "BEDROOM",
          snapshotType: "BASELINE",
          createdAt: new Date().toISOString(),
          safetyScore: 55,
          totalRulesEvaluated: 8,
          detectedCount: 2,
          needsVerificationCount: 0,
          highPriorityCount: 2,
          mediumPriorityCount: 0,
          lowPriorityCount: 0,
          ruleEvaluations: [],
          findings: [],
          recommendations: [],
          input: {} as any,
        },
        { strictFieldEvidence: true, allowDemoPreview: true }
      );
      expect(demoReportWithBanner.meta.isDemo).toBe(true);
      expect(demoReportWithBanner.meta.demoBanner).toContain("DỮ LIỆU TRÌNH DIỄN (DEMO)");

      // Cleanup
      await prisma.homeSurvey.delete({ where: { id: demoSurvey.id } });
      await prisma.project.delete({ where: { id: demoProj.id } });
      await prisma.room.delete({ where: { id: realRoom.id } });
    });
  });

  describe("4. Production Safety Guard & Cross-Tenant Access Control", () => {
    it("blocks destructive seed resets when NODE_ENV === 'production'", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(() => assertSafeForDestructiveSeed("seed_reset")).toThrow(ProductionGuardError);
    });

    it("blocks cross-tenant access and logs audit event", async () => {
      await expect(
        assertTenantAccess("account-owner-A", "ASSESSMENT", "asmt-123")
      ).resolves.not.toThrow(); // offline-test scope allows unit test without active HTTP scope

      // When running with an explicit tenant accountId != caller scope (verified via cross-tenant boundary)
      const scratchDir = path.resolve(".scratch");
      fs.mkdirSync(scratchDir, { recursive: true });
      const tmpDir = fs.mkdtempSync(path.join(scratchDir, "a05-tenant-"));
      vi.stubEnv("SAFEHOME_PRIVATE_DIR", tmpDir);
      vi.stubEnv("SAFEHOME_ISOLATED_TESTS", "0");

      const { accountScope } = await import("@/lib/auth/context");
      const { createAccount } = await import("@/lib/auth/accounts");

      try {
        const accA = await createAccount("a05_a@test.invalid", "StrongPass2026!");
        const accB = await createAccount("a05_b@test.invalid", "StrongPass2026!");
        const dbB = await familyDatabase(accB.id);

        await accountScope.run({ ...accB, database: dbB }, async () => {
          await expect(
            assertTenantAccess(accA.id, "ROOM", "room-owned-by-A")
          ).rejects.toBeInstanceOf(CrossTenantAccessError);

          const blockedEvents = await prisma.persistenceAuditEvent.findMany({
            where: { action: "CROSS_TENANT_BLOCKED" },
          });
          expect(blockedEvents).toHaveLength(1);
        });
      } finally {
        await disconnectAccountStores();
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    }, 60000);
  });
});
