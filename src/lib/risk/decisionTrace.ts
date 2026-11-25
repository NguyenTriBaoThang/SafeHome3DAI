/**
 * ==============================================================================
 * TASK A10: DECISION TRACEABILITY & RULE-BASED PROVENANCE SCHEMA
 * ==============================================================================
 * Provides deterministic, versioned traceability from:
 * Object / Room Snapshot -> Input Evidence (with sourceType & uncertainty flags)
 * -> Versioned Rule -> Finding -> Verified Citation(s) -> Recommendation.
 *
 * IMPORTANT: Represents Rule-Based Explainability / Decision Provenance.
 * Never mislabeled as internal Gemini/LLM model explainability.
 * ==============================================================================
 */
import { z } from "zod";
import {
  MeasurementSourceTypeSchema,
  RiskCertaintySchema,
  RiskFindingV1Schema,
  RiskSeveritySchema,
} from "@/lib/contracts/sharedContractV1";
import {
  CanonicalAssessmentResult,
  CanonicalEngineOptions,
  evaluateRoomHazardsCanonical,
} from "./canonicalEngine";
import { getActiveRegistrySources, validateOfficialSourceUrl } from "@/lib/rag/documentRegistry";
import { ALL_VERSIONED_RULES } from "./riskRuleRegistry";

export const DECISION_TRACE_VERSION = "1.0.0" as const;

export const TraceApprovedStatusSchema = z.enum([
  "VERIFIED_APPROVED",
  "PROVISIONAL_NEEDS_CONFIRMATION",
  "NO_EVIDENCE_UNVERIFIED",
]);

export const TraceInputEvidenceItemSchema = z.object({
  field: z.string().min(1),
  measuredValue: z.string(),
  threshold: z.string(),
  sourceType: MeasurementSourceTypeSchema,
  certainty: RiskCertaintySchema,
  needsConfirmation: z.boolean(),
  warningBadge: z.string().nullable(),
  tooltipText: z.string().nullable(),
});

export const TraceCitationItemSchema = z.object({
  citationId: z.string().min(1),
  documentId: z.string().min(1),
  publisher: z.string().min(1),
  documentTitle: z.string().min(1),
  section: z.string(),
  version: z.string(),
  officialUrl: z.string().url(),
  pageNumber: z.number().int().optional(),
});

export const DecisionTraceSchema = z.object({
  traceVersion: z.literal(DECISION_TRACE_VERSION),
  traceId: z.string().regex(/^trace-[a-zA-Z0-9_-]+$/),
  explainabilityType: z.literal("RULE_BASED_PROVENANCE"),
  snapshotId: z.string().regex(/^snap-[a-zA-Z0-9_-]+$/),
  assessmentId: z.string(),
  roomId: z.string(),
  objectLink: z.object({
    objectId: z.string().nullable(),
    objectName: z.string().nullable(),
    roomId: z.string(),
    snapshotId: z.string(),
    hotspotHref: z.string().nullable(),
  }),
  inputEvidence: z.array(TraceInputEvidenceItemSchema),
  sourceType: MeasurementSourceTypeSchema,
  ruleId: z.string().regex(/^RISK-\d{3}$/),
  ruleName: z.string(),
  ruleVersion: z.string(),
  findingId: z.string(),
  findingTitle: z.string(),
  severity: RiskSeveritySchema,
  certainty: RiskCertaintySchema,
  recommendationId: z.string(),
  recommendationTitle: z.string(),
  recommendationSteps: z.array(z.string()),
  citationIds: z.array(z.string()),
  citations: z.array(TraceCitationItemSchema),
  approvedStatus: TraceApprovedStatusSchema,
  needsConfirmation: z.boolean(),
  confirmationTooltip: z.string().nullable(),
});

export type DecisionTrace = z.infer<typeof DecisionTraceSchema>;

export interface DecisionGraphNode {
  id: string;
  stage:
    | "ROOM_SNAPSHOT"
    | "OBJECT_3D"
    | "INPUT_EVIDENCE"
    | "RULE"
    | "FINDING"
    | "EVIDENCE_SOURCE"
    | "RECOMMENDATION";
  label: string;
  subtitle: string;
  sourceType?: string;
  warningState: "NONE" | "PROVISIONAL" | "UNKNOWN";
  badgeText?: string;
  tooltipText?: string;
  hotspotHref?: string | null;
  findingId?: string;
  objectId?: string | null;
  snapshotId: string;
  details: Record<string, unknown>;
}

export interface DecisionGraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
}

export interface DecisionGraph {
  graphVersion: typeof DECISION_TRACE_VERSION;
  explainabilityType: "RULE_BASED_PROVENANCE";
  roomId: string;
  roomName: string;
  snapshotId: string;
  nodes: DecisionGraphNode[];
  edges: DecisionGraphEdge[];
}

export interface BuildTraceOptions {
  snapshotId?: string;
  objectNamesById?: Record<string, string>;
}

/**
 * Resolves valid, currently APPROVED, non-outdated citations for a finding.
 * Never fabricates fallback citations when input evidence is absent or unverified.
 */
export function resolveApprovedCitationsForTrace(
  ruleId: string,
  referenceIds: string[],
  hasSupportingInputEvidence: boolean
): z.infer<typeof TraceCitationItemSchema>[] {
  if (!hasSupportingInputEvidence || referenceIds.length === 0) {
    return [];
  }

  const { activeSources } = getActiveRegistrySources({ approvalOnly: true });
  const citations: z.infer<typeof TraceCitationItemSchema>[] = [];

  for (const srcId of referenceIds) {
    const src = activeSources.find((s) => s.id === srcId);
    if (!src) continue;

    const urlCheck = validateOfficialSourceUrl(src.officialUrl || src.url);
    if (!urlCheck.valid) continue;

    const passage =
      src.passages.find((p) =>
        p.relatedRules.some(
          (r) =>
            r.includes(ruleId) ||
            (ruleId === "RISK-001" && r.includes("RUG")) ||
            (ruleId === "RISK-002" && r.includes("CABLE")) ||
            (ruleId === "RISK-003" && r.includes("OBST")) ||
            (ruleId === "RISK-004" && r.includes("LIGHT")) ||
            (ruleId === "RISK-005" && r.includes("WET")) ||
            (ruleId === "RISK-006" && r.includes("GRAB"))
        )
      ) || src.passages[0];

    if (!passage) continue;

    citations.push({
      citationId: `${src.id}:${passage.id}@v${src.version}`,
      documentId: src.id,
      publisher: src.publisher || src.organization,
      documentTitle: src.title,
      section: passage.section,
      version: src.version,
      officialUrl: urlCheck.normalizedUrl,
      pageNumber: passage.pageNumber,
    });
  }

  return citations;
}

function deriveSnapshotId(canonicalResult: CanonicalAssessmentResult, override?: string): string {
  if (override && /^snap-[a-zA-Z0-9_-]+$/.test(override)) {
    return override;
  }
  const suffix = canonicalResult.assessmentId.replace(/^asmt-/, "");
  return `snap-${suffix}`;
}

/**
 * Deterministically builds versioned DecisionTrace records from a CanonicalAssessmentResult.
 */
export function buildDecisionTracesFromCanonical(
  canonicalResult: CanonicalAssessmentResult,
  options: BuildTraceOptions = {}
): DecisionTrace[] {
  const snapshotId = deriveSnapshotId(canonicalResult, options.snapshotId);
  const traces: DecisionTrace[] = [];

  for (const finding of canonicalResult.findings) {
    const ruleEval = canonicalResult.ruleTrace.find((rt) => rt.ruleId === finding.ruleId);
    const ruleMeta = ALL_VERSIONED_RULES.find((r) => r.id === finding.ruleId);
    const ruleVersion = ruleEval?.version || ruleMeta?.version || canonicalResult.ruleVersion || "2026.1";

    const hasMeasuredOrValue =
      finding.inputProvenance.length > 0 &&
      Boolean(ruleEval?.evidence.measuredValue && ruleEval.evidence.measuredValue !== "Chưa rõ");

    const inputEvidence = finding.inputProvenance.map((prov) => {
      const isUncertain =
        prov.sourceType === "unknown" ||
        prov.sourceType === "vision_estimated" ||
        prov.sourceType === "simulated";
      const warningBadge =
        prov.sourceType === "unknown"
          ? "Chưa rõ — Cần xác nhận"
          : prov.sourceType === "vision_estimated" || prov.sourceType === "simulated"
          ? "Ước lượng — Cần xác nhận"
          : null;
      const tooltipText = isUncertain
        ? "Cần xác nhận thực tế tại hiện trường (không coi là số đo xác thực)."
        : null;

      return {
        field: prov.field,
        measuredValue: String(ruleEval?.evidence.measuredValue ?? prov.value ?? "Chưa rõ"),
        threshold: String(ruleEval?.evidence.threshold ?? "Theo quy chuẩn phòng ngừa té ngã"),
        sourceType: prov.sourceType,
        certainty: finding.certainty,
        needsConfirmation: isUncertain,
        warningBadge,
        tooltipText,
      };
    });

    const primarySourceType = inputEvidence[0]?.sourceType || "unknown";
    const needsConfirmation =
      finding.requiresManualConfirmation ||
      inputEvidence.length === 0 ||
      inputEvidence.some((item) => item.needsConfirmation);

    const citations = resolveApprovedCitationsForTrace(
      finding.ruleId,
      finding.recommendation.referenceIds,
      hasMeasuredOrValue
    );

    const approvedStatus: z.infer<typeof TraceApprovedStatusSchema> =
      citations.length === 0
        ? "NO_EVIDENCE_UNVERIFIED"
        : needsConfirmation
        ? "PROVISIONAL_NEEDS_CONFIRMATION"
        : "VERIFIED_APPROVED";

    const sanitizedFindingId = finding.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const objectId = finding.targetObjectId || null;
    const objectName =
      objectId && options.objectNamesById?.[objectId]
        ? options.objectNamesById[objectId]
        : null;

    // Never fabricate objectId; emit hotspot link using real roomId, snapshotId, findingId, and optional objectId
    const hotspotParams = new URLSearchParams({
      roomId: canonicalResult.roomId,
      findingId: finding.id,
      snapshotId,
    });
    if (objectId) {
      hotspotParams.set("objectId", objectId);
    }
    const hotspotHref = objectId ? `/digital-twin?${hotspotParams.toString()}` : null;

    const trace: DecisionTrace = {
      traceVersion: DECISION_TRACE_VERSION,
      traceId: `trace-${snapshotId}-${sanitizedFindingId}`,
      explainabilityType: "RULE_BASED_PROVENANCE",
      snapshotId,
      assessmentId: canonicalResult.assessmentId,
      roomId: canonicalResult.roomId,
      objectLink: {
        objectId,
        objectName,
        roomId: canonicalResult.roomId,
        snapshotId,
        hotspotHref,
      },
      inputEvidence,
      sourceType: primarySourceType,
      ruleId: finding.ruleId,
      ruleName: ruleEval?.ruleName || finding.title,
      ruleVersion,
      findingId: finding.id,
      findingTitle: finding.title,
      severity: finding.severity,
      certainty: finding.certainty,
      recommendationId: `rec-${sanitizedFindingId}`,
      recommendationTitle: finding.recommendation.title,
      recommendationSteps: finding.recommendation.steps,
      citationIds: citations.map((c) => c.citationId),
      citations,
      approvedStatus,
      needsConfirmation,
      confirmationTooltip: needsConfirmation
        ? "Cần xác nhận thực tế tại hiện trường trước khi xem là số đo xác thực."
        : null,
    };

    traces.push(DecisionTraceSchema.parse(trace));
  }

  return traces;
}

/**
 * Converts DecisionTrace[] into a deterministic DecisionGraph.
 * - Unretrievable/unapproved citations never create EVIDENCE_SOURCE nodes.
 * - Unknown/provisional inputs show warning badges and 'Cần xác nhận' tooltips.
 */
export function buildDecisionGraphFromTraces(
  roomId: string,
  roomName: string,
  snapshotId: string,
  traces: DecisionTrace[]
): DecisionGraph {
  const nodes: DecisionGraphNode[] = [
    {
      id: `node-room-${snapshotId}`,
      stage: "ROOM_SNAPSHOT",
      label: roomName,
      subtitle: `Snapshot ${snapshotId}`,
      warningState: "NONE",
      snapshotId,
      details: {
        roomId,
        snapshotId,
        explainabilityType: "RULE_BASED_PROVENANCE",
        totalFindingsTraced: traces.length,
      },
    },
  ];
  const edges: DecisionGraphEdge[] = [];

  for (const trace of traces) {
    const key = trace.findingId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const objectNodeId = `node-obj-${key}`;
    const inputNodeId = `node-input-${key}`;
    const ruleNodeId = `node-rule-${key}`;
    const findingNodeId = `node-finding-${key}`;
    const recNodeId = `node-rec-${key}`;

    // 1. Object / Zone Node
    nodes.push({
      id: objectNodeId,
      stage: "OBJECT_3D",
      label: trace.objectLink.objectName || (trace.objectLink.objectId ? trace.objectLink.objectId : "Không gian phòng"),
      subtitle: trace.objectLink.objectId ? `objectId: ${trace.objectLink.objectId}` : "Quy tắc cấp phòng",
      warningState: trace.objectLink.objectId ? "NONE" : "PROVISIONAL",
      badgeText: trace.objectLink.objectId ? "Liên kết 3D" : "Cấp phòng",
      tooltipText: trace.objectLink.objectId
        ? `Nhấn để mở vật thể ${trace.objectLink.objectId} trong Bản sao số 3D`
        : "Nguy cơ cấp môi trường phòng (không gắn objectId riêng lẻ)",
      hotspotHref: trace.objectLink.hotspotHref,
      objectId: trace.objectLink.objectId,
      findingId: trace.findingId,
      snapshotId,
      details: { ...trace.objectLink },
    });
    edges.push({
      id: `e-room-${key}`,
      source: `node-room-${snapshotId}`,
      target: objectNodeId,
      relation: "contains",
    });

    // 2. Input Evidence Node (flags UNKNOWN / PROVISIONAL clearly with 'Cần xác nhận' tooltip)
    const hasUnknown = trace.inputEvidence.some((ev) => ev.sourceType === "unknown");
    const hasProvisional = trace.inputEvidence.some(
      (ev) => ev.sourceType === "vision_estimated" || ev.sourceType === "simulated"
    );
    const inputWarningState =
      hasUnknown || trace.inputEvidence.length === 0
        ? "UNKNOWN"
        : hasProvisional
        ? "PROVISIONAL"
        : "NONE";

    nodes.push({
      id: inputNodeId,
      stage: "INPUT_EVIDENCE",
      label: trace.inputEvidence[0]?.measuredValue || "Thiếu thông số đầu vào",
      subtitle: `Nguồn: ${trace.sourceType}`,
      sourceType: trace.sourceType,
      warningState: inputWarningState,
      badgeText: inputWarningState !== "NONE" ? "Cần xác nhận" : "Đã xác nhận",
      tooltipText:
        inputWarningState !== "NONE"
          ? "Cần xác nhận thực tế tại hiện trường (dữ liệu ước lượng/mô phỏng hoặc chưa đo)"
          : "Dữ liệu đã xác nhận hoặc đo thực tế",
      snapshotId,
      findingId: trace.findingId,
      details: { inputEvidence: trace.inputEvidence },
    });
    edges.push({
      id: `e-obj-input-${key}`,
      source: objectNodeId,
      target: inputNodeId,
      relation: "evidences",
    });

    // 3. Deterministic Rule Node
    nodes.push({
      id: ruleNodeId,
      stage: "RULE",
      label: `${trace.ruleId} (v${trace.ruleVersion})`,
      subtitle: trace.ruleName,
      warningState: "NONE",
      snapshotId,
      findingId: trace.findingId,
      details: {
        ruleId: trace.ruleId,
        ruleVersion: trace.ruleVersion,
        ruleName: trace.ruleName,
      },
    });
    edges.push({
      id: `e-input-rule-${key}`,
      source: inputNodeId,
      target: ruleNodeId,
      relation: "evaluates",
    });

    // 4. Finding Node
    nodes.push({
      id: findingNodeId,
      stage: "FINDING",
      label: trace.findingTitle,
      subtitle: `${trace.severity} · ${trace.certainty}`,
      warningState: trace.needsConfirmation ? "PROVISIONAL" : "NONE",
      badgeText: trace.needsConfirmation ? "Cần xác nhận" : trace.severity,
      tooltipText: trace.confirmationTooltip ?? undefined,
      hotspotHref: trace.objectLink.hotspotHref,
      objectId: trace.objectLink.objectId,
      findingId: trace.findingId,
      snapshotId,
      details: {
        findingId: trace.findingId,
        severity: trace.severity,
        certainty: trace.certainty,
        approvedStatus: trace.approvedStatus,
      },
    });
    edges.push({
      id: `e-rule-finding-${key}`,
      source: ruleNodeId,
      target: findingNodeId,
      relation: "triggers",
    });

    // 5. Verified Citation Nodes (STRICT: DO NOT render nodes for unapproved/unretrievable sources)
    for (const cit of trace.citations) {
      const citNodeId = `node-cit-${key}-${cit.documentId}`;
      nodes.push({
        id: citNodeId,
        stage: "EVIDENCE_SOURCE",
        label: `${cit.publisher} (v${cit.version})`,
        subtitle: cit.section,
        warningState: "NONE",
        badgeText: "Nguồn đã duyệt",
        snapshotId,
        findingId: trace.findingId,
        details: { ...cit },
      });
      edges.push({
        id: `e-finding-cit-${key}-${cit.documentId}`,
        source: findingNodeId,
        target: citNodeId,
        relation: "grounded_by",
      });
    }

    // 6. Recommendation Node
    nodes.push({
      id: recNodeId,
      stage: "RECOMMENDATION",
      label: trace.recommendationTitle,
      subtitle: `${trace.recommendationSteps.length} bước xử lý`,
      warningState: trace.citations.length === 0 ? "UNKNOWN" : "NONE",
      badgeText: trace.citations.length === 0 ? "Chưa có nguồn kiểm chứng" : "Khuyến nghị",
      tooltipText:
        trace.citations.length === 0
          ? "Cần xác nhận thủ công: chưa có nguồn tài liệu được duyệt gắn cho khuyến nghị này."
          : undefined,
      snapshotId,
      findingId: trace.findingId,
      details: {
        recommendationId: trace.recommendationId,
        steps: trace.recommendationSteps,
        citationIds: trace.citationIds,
      },
    });
    edges.push({
      id: `e-finding-rec-${key}`,
      source: findingNodeId,
      target: recNodeId,
      relation: "recommends",
    });
  }

  return {
    graphVersion: DECISION_TRACE_VERSION,
    explainabilityType: "RULE_BASED_PROVENANCE",
    roomId,
    roomName,
    snapshotId,
    nodes,
    edges,
  };
}

export interface LooseRugEmpiricalTraceBundle {
  bundleVersion: typeof DECISION_TRACE_VERSION;
  scenarioTitle: string;
  explainabilityNotice: string;
  beforeConfirmed: {
    snapshotId: string;
    canonicalResult: CanonicalAssessmentResult;
    traces: DecisionTrace[];
    graph: DecisionGraph;
  };
  afterVerified: {
    snapshotId: string;
    canonicalResult: CanonicalAssessmentResult;
    traces: DecisionTrace[];
    graph: DecisionGraph;
    rugRuleEvaluation: CanonicalAssessmentResult["ruleTrace"][number] | undefined;
  };
}

/**
 * End-to-end empirical trace for Task A10 Req 06:
 * Loose rug obstructing walkway before intervention vs verified intervention after confirmation.
 */
export function createLooseRugEmpiricalTrace(): LooseRugEmpiricalTraceBundle {
  const beforeInput = {
    roomId: "room-bedroom-01",
    roomName: "Phòng ngủ chính",
    roomType: "BEDROOM" as const,
    sourceType: "SURVEY_PROFILE" as const,
    floor: {
      material: "Gỗ",
      isWet: false,
      isSlipResistant: true,
      levelDifferenceCm: 0,
      thresholdStepPresent: false,
    },
    lighting: {
      daytimeLux: 220,
      nighttimeLux: 45,
      nightLightPresent: true,
      motionSensorPresent: true,
      pathLightToBathroom: true,
      switchReachableFromEntrance: true,
      switchReachableFromBed: true,
    },
    rugs: {
      present: true,
      items: [
        {
          id: "obj-rug-01",
          name: "Thảm chân mép giường chắn lối đi",
          location: "Lối đi từ giường ra cửa",
          isSecured: false,
          edgesCurled: true,
          inWalkway: true,
        },
      ],
    },
    cables: { crossingWalkway: false, items: [] },
    obstacles: { present: false, walkwayClearWidthM: 1.0, items: [] },
    grabBars: {
      present: false,
      count: 0,
      toiletGrabBarPresent: false,
      showerGrabBarPresent: false,
      inspectedSecure: false,
    },
    accessibility: {
      lightSwitchReachableFromBed: true,
      essentialItemsReachableFromBed: true,
      emergencyCallReachable: true,
    },
  };

  const beforeProvenance = {
    "rugs.items": {
      value: beforeInput.rugs.items,
      unit: "count",
      sourceType: "user_confirmed",
      confidence: 1,
      uncertainty: 0,
      method: "Khảo sát trực tiếp + xác nhận gia đình",
      updatedAt: "2026-11-25T09:00:00.000Z",
      confirmedBy: "Gia đình",
      provenanceId: "prov-rug-before",
    },
  };

  const beforeCanonical = evaluateRoomHazardsCanonical(beforeInput, {
    deterministicTimestamp: "2026-11-25T09:00:00.000Z",
    provenanceMap: beforeProvenance as any,
  });

  // Ensure stable targetObjectId "obj-rug-01" linkage from input rug item if rule didn't set it
  const normalizedBeforeFindings = beforeCanonical.findings.map((f) =>
    f.ruleId === "RISK-001" && !f.targetObjectId ? { ...f, targetObjectId: "obj-rug-01" } : f
  );
  const patchedBeforeCanonical: CanonicalAssessmentResult = {
    ...beforeCanonical,
    findings: normalizedBeforeFindings,
  };

  const beforeSnapshotId = "snap-empirical-loose-rug-before";
  const beforeTraces = buildDecisionTracesFromCanonical(patchedBeforeCanonical, {
    snapshotId: beforeSnapshotId,
    objectNamesById: { "obj-rug-01": "Thảm chân mép giường chắn lối đi" },
  });
  const beforeGraph = buildDecisionGraphFromTraces(
    beforeInput.roomId,
    beforeInput.roomName,
    beforeSnapshotId,
    beforeTraces
  );

  // Verified post-intervention input after family taped edges + added non-slip underlay
  const afterInput = {
    ...beforeInput,
    rugs: {
      present: true,
      items: [
        {
          id: "obj-rug-01",
          name: "Thảm chân mép giường (đã dán cố định mép)",
          location: "Cạnh giường",
          isSecured: true,
          edgesCurled: false,
          inWalkway: false,
        },
      ],
    },
  };

  const afterCanonical = evaluateRoomHazardsCanonical(afterInput, {
    deterministicTimestamp: "2026-11-25T09:30:00.000Z",
    provenanceMap: {
      "rugs.items": {
        value: afterInput.rugs.items,
        unit: "count",
        sourceType: "measured",
        confidence: 1,
        uncertainty: 0,
        method: "Kiểm tra bám dính mép thảm sau xử lý",
        updatedAt: "2026-11-25T09:30:00.000Z",
        confirmedBy: "Gia đình & kỹ thuật viên",
        provenanceId: "prov-rug-after",
      } as any,
    },
  });

  const afterSnapshotId = "snap-empirical-loose-rug-after";
  const afterTraces = buildDecisionTracesFromCanonical(afterCanonical, {
    snapshotId: afterSnapshotId,
    objectNamesById: { "obj-rug-01": "Thảm chân mép giường (đã dán cố định mép)" },
  });
  const afterGraph = buildDecisionGraphFromTraces(
    afterInput.roomId,
    afterInput.roomName,
    afterSnapshotId,
    afterTraces
  );

  return {
    bundleVersion: DECISION_TRACE_VERSION,
    scenarioTitle: "Thảm rời chắn lối đi phòng ngủ — Trước và Sau xác nhận xử lý",
    explainabilityNotice:
      "Rule-based explainability / decision provenance from deterministic clinical risk rules (RISK-001..RISK-008) — NOT internal Gemini/LLM model explainability.",
    beforeConfirmed: {
      snapshotId: beforeSnapshotId,
      canonicalResult: patchedBeforeCanonical,
      traces: beforeTraces,
      graph: beforeGraph,
    },
    afterVerified: {
      snapshotId: afterSnapshotId,
      canonicalResult: afterCanonical,
      traces: afterTraces,
      graph: afterGraph,
      rugRuleEvaluation: afterCanonical.ruleTrace.find((r) => r.ruleId === "RISK-001"),
    },
  };
}
