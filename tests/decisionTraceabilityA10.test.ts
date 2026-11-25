import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import { INITIAL_ROOMS } from "@/data/mockRooms";
import { evaluateRoomHazardsCanonical } from "@/lib/risk/canonicalEngine";
import {
  buildDecisionGraphFromTraces,
  buildDecisionTracesFromCanonical,
  createLooseRugEmpiricalTrace,
  DECISION_TRACE_VERSION,
  DecisionTraceSchema,
} from "@/lib/risk/decisionTrace";
import { explainHazardFinding } from "@/lib/risk/explanationEngine";
import { removeDocument, resetDocumentRegistry, validateOfficialSourceUrl } from "@/lib/rag/documentRegistry";
import { GET as getTraceability, POST as postTraceability } from "@/app/api/risk-assessment/traceability/route";
import { POST as postFindingExplain } from "@/app/api/risk-assessment/findings/[findingId]/explain/route";
import { NextRequest } from "next/server";

describe("Task A10 — Rule-Based Explainability & Decision Provenance", () => {
  beforeEach(() => {
    resetDocumentRegistry();
  });

  afterEach(() => {
    resetDocumentRegistry();
  });

  it("1. Identical snapshot inputs produce identical deterministic DecisionTrace IDs, versions & valid citation links", () => {
    const bedroomInput = {
      roomId: "room-bedroom-01",
      roomName: "Phòng ngủ chính",
      roomType: "BEDROOM",
      sourceType: "SURVEY_PROFILE",
      floor: { material: "Gỗ", isWet: false, isSlipResistant: true, levelDifferenceCm: 0, thresholdStepPresent: false },
      lighting: { daytimeLux: 180, nighttimeLux: 20, nightLightPresent: false, motionSensorPresent: false, pathLightToBathroom: false, switchReachableFromEntrance: true, switchReachableFromBed: false },
      rugs: {
        present: true,
        items: [{ id: "obj-rug-01", name: "Thảm chân", location: "Cạnh giường", isSecured: false, edgesCurled: true, inWalkway: true }],
      },
      cables: { crossingWalkway: false, items: [] },
      obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
      grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
      accessibility: { lightSwitchReachableFromBed: false, essentialItemsReachableFromBed: true, emergencyCallReachable: true },
    };

    const runA = evaluateRoomHazardsCanonical(bedroomInput, { deterministicTimestamp: "2026-11-25T10:00:00.000Z" });
    const runB = evaluateRoomHazardsCanonical(bedroomInput, { deterministicTimestamp: "2026-11-25T10:00:00.000Z" });

    const tracesA = buildDecisionTracesFromCanonical(runA, { snapshotId: "snap-bedroom-det-1" });
    const tracesB = buildDecisionTracesFromCanonical(runB, { snapshotId: "snap-bedroom-det-1" });

    expect(tracesA.length).toBeGreaterThan(0);
    expect(tracesA).toEqual(tracesB);

    for (const t of tracesA) {
      expect(() => DecisionTraceSchema.parse(t)).not.toThrow();
      expect(t.traceVersion).toBe(DECISION_TRACE_VERSION);
      expect(t.explainabilityType).toBe("RULE_BASED_PROVENANCE");
      expect(t.ruleVersion).toBeTruthy();
      expect(t.recommendationId).toBeTruthy();
      for (const cit of t.citations) {
        expect(validateOfficialSourceUrl(cit.officialUrl).valid).toBe(true);
      }
    }
  });

  it("2. Does not create fake citations or EVIDENCE_SOURCE nodes when finding lacks evidence or source is removed", () => {
    // 2a. Missing evidence in explainHazardFinding -> citations MUST be empty (never fallback to WHO default)
    const noEvidenceFinding: any = {
      id: "finding-no-ev-1",
      assessmentId: "asmt-test",
      ruleId: "RISK-001",
      hazardType: "LOOSE_RUG",
      title: "Nghi ngờ thảm thiếu dữ liệu",
      description: "Thiếu dữ liệu đo kiểm thảm.",
      severityCategory: "LOW",
      detectionRuleId: "RISK-001",
      evidence: {
        measuredValue: "Chưa rõ",
        threshold: "Chưa xác định",
        rationale: "Thiếu dữ liệu đầu vào",
        sourceFields: ["rugs.present"],
        missingFields: ["rugs.present"],
      },
      recommendationText: "Cần xác nhận thực tế tại hiện trường.",
      referenceIds: ["SRC_WHO_2021"],
      status: "ACTIVE",
    };

    const explanation = explainHazardFinding(noEvidenceFinding);
    expect(explanation.explainabilityType).toBe("RULE_BASED_PROVENANCE");
    expect(explanation.citations).toHaveLength(0);
    expect(explanation.requiresConfirmation).toBe(true);
    expect(explanation.confirmationTooltip).toContain("Cần xác nhận");

    // 2b. Knowledge sources removed -> graph suppresses EVIDENCE_SOURCE nodes cleanly
    for (const src of CURATED_KNOWLEDGE_SOURCES) {
      removeDocument(src.id);
    }
    const emp = createLooseRugEmpiricalTrace();
    expect(emp.beforeConfirmed.traces[0].citations).toHaveLength(0);
    expect(emp.beforeConfirmed.traces[0].approvedStatus).toBe("NO_EVIDENCE_UNVERIFIED");
    const evidenceNodes = emp.beforeConfirmed.graph.nodes.filter((n) => n.stage === "EVIDENCE_SOURCE");
    expect(evidenceNodes).toHaveLength(0);
  });

  it("3. Unknown / provisional inputs show warning state badges and 'Cần xác nhận' tooltips", () => {
    const provisionalInput = {
      roomId: "room-bedroom-01",
      roomName: "Phòng ngủ AI Vision",
      roomType: "BEDROOM",
      sourceType: "AI_VISION",
      dimensions: { lengthM: 4.0, widthM: 3.5, heightM: 2.8, source: "USER_ESTIMATED" },
      floor: { material: "Gỗ", isWet: false, isSlipResistant: true, levelDifferenceCm: 0, thresholdStepPresent: false },
      lighting: { daytimeLux: 180, nighttimeLux: 45, nightLightPresent: true, motionSensorPresent: true, pathLightToBathroom: true, switchReachableFromEntrance: true, switchReachableFromBed: true },
      rugs: {
        present: true,
        items: [{ id: "obj-rug-01", name: "Thảm dự đoán từ ảnh", location: "Cạnh giường", isSecured: false, edgesCurled: false, inWalkway: true }],
      },
      cables: { crossingWalkway: false, items: [] },
      obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
      grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
      accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: true },
    };

    const canonical = evaluateRoomHazardsCanonical(provisionalInput);
    const traces = buildDecisionTracesFromCanonical(canonical, { snapshotId: "snap-vision-prov" });
    const graph = buildDecisionGraphFromTraces("room-bedroom-01", "Phòng ngủ AI Vision", "snap-vision-prov", traces);

    const rugTrace = traces.find((t) => t.ruleId === "RISK-001");
    expect(rugTrace).toBeDefined();
    expect(rugTrace?.sourceType).toBe("vision_estimated");
    expect(rugTrace?.needsConfirmation).toBe(true);
    expect(rugTrace?.confirmationTooltip).toContain("Cần xác nhận");

    const inputNode = graph.nodes.find((n) => n.stage === "INPUT_EVIDENCE");
    expect(inputNode?.warningState).toBe("PROVISIONAL");
    expect(inputNode?.badgeText).toBe("Cần xác nhận");
    expect(inputNode?.tooltipText).toContain("Cần xác nhận");
  });

  it("4. Links findings to 3D hotspots using valid B07 objectId, roomId & snapshotId without fabricating IDs", () => {
    const empirical = createLooseRugEmpiricalTrace();
    const rugTrace = empirical.beforeConfirmed.traces.find((t) => t.ruleId === "RISK-001");
    expect(rugTrace).toBeDefined();
    expect(rugTrace?.objectLink.objectId).toBe("obj-rug-01");
    expect(rugTrace?.objectLink.roomId).toBe("room-bedroom-01");
    expect(rugTrace?.objectLink.snapshotId).toBe("snap-empirical-loose-rug-before");
    expect(rugTrace?.objectLink.hotspotHref).toBe(
      "/digital-twin?roomId=room-bedroom-01&findingId=finding-risk001-room-bedroom-01&snapshotId=snap-empirical-loose-rug-before&objectId=obj-rug-01"
    );

    // Verify objectId exists in B07 / INITIAL_ROOMS mock 3D scene
    const room01 = INITIAL_ROOMS.find((r) => r.id === "room-bedroom-01");
    expect(room01?.objects.some((o) => o.id === rugTrace?.objectLink.objectId)).toBe(true);

    // After verified intervention: RISK-001 resolved cleanly
    expect(empirical.afterVerified.traces.some((t) => t.ruleId === "RISK-001")).toBe(false);
    expect(empirical.afterVerified.rugRuleEvaluation?.state).toBe("NOT_DETECTED");
  });

  it("5. API routes and UX/README terminology reflect Rule-Based Explainability / Decision Provenance", async () => {
    const getRes = await getTraceability(new NextRequest("http://localhost/api/risk-assessment/traceability?sample=loose-rug"));
    expect(getRes.status).toBe(200);
    const getJson = await getRes.json();
    expect(getJson.success).toBe(true);
    expect(getJson.explainabilityType).toBe("RULE_BASED_PROVENANCE");
    expect(getJson.data.beforeConfirmed.traces.length).toBeGreaterThan(0);

    const postRes = await postTraceability(
      new NextRequest("http://localhost/api/risk-assessment/traceability", {
        method: "POST",
        body: JSON.stringify({
          roomInput: {
            roomId: "room-bedroom-01",
            roomName: "Phòng ngủ kiểm tra",
            roomType: "BEDROOM",
            sourceType: "SURVEY_PROFILE",
            floor: { material: "Gỗ", isWet: false, isSlipResistant: true, levelDifferenceCm: 0, thresholdStepPresent: false },
            lighting: { daytimeLux: 200, nighttimeLux: 45, nightLightPresent: true, motionSensorPresent: true, pathLightToBathroom: true, switchReachableFromEntrance: true, switchReachableFromBed: true },
            rugs: { present: true, items: [{ id: "obj-rug-01", name: "Thảm chân", location: "Cạnh giường", isSecured: false, edgesCurled: true, inWalkway: true }] },
            cables: { crossingWalkway: false, items: [] },
            obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
            grabBars: { present: false, count: 0, toiletGrabBarPresent: false, showerGrabBarPresent: false, inspectedSecure: false },
            accessibility: { lightSwitchReachableFromBed: true, essentialItemsReachableFromBed: true, emergencyCallReachable: true },
          },
          snapshotId: "snap-api-check-1",
        }),
      })
    );
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    expect(postJson.snapshotId).toBe("snap-api-check-1");
    expect(postJson.traces[0].ruleId).toBe("RISK-001");
    expect(postJson.traces[0].citations.length).toBeGreaterThan(0);

    const explainRes = await postFindingExplain(
      new NextRequest("http://localhost/api/risk-assessment/findings/finding-no-ev/explain", {
        method: "POST",
        body: JSON.stringify({
          finding: {
            id: "finding-no-ev",
            ruleId: "RISK-001",
            hazardType: "LOOSE_RUG",
            title: "Thiếu dữ liệu",
            description: "Thiếu đo kiểm",
            severityCategory: "LOW",
            detectionRuleId: "RISK-001",
            evidence: { measuredValue: "Chưa rõ", threshold: "-", rationale: "Thiếu", sourceFields: [], missingFields: ["rugs.present"] },
            recommendationText: "Cần xác nhận",
            referenceIds: ["SRC_WHO_2021"],
          },
        }),
      }),
      { params: Promise.resolve({ findingId: "finding-no-ev" }) }
    );
    expect(explainRes.status).toBe(200);
    const explainJson = await explainRes.json();
    expect(explainJson.data.citations).toHaveLength(0);
    expect(explainJson.data.explainabilityType).toBe("RULE_BASED_PROVENANCE");

    // Check README & explainability UI terminology
    const readmeText = fs.readFileSync(path.resolve("README.md"), "utf8");
    expect(readmeText).toContain("Rule-Based Explainability");
    expect(readmeText).toContain("Decision Provenance");
    expect(readmeText).not.toContain("Giải Trình AI (XAI)");
  });
});

