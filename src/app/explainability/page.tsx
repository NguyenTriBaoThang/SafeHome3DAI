"use client";

import React, { useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Network,
  Box,
  Sliders,
  ShieldAlert,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Info,
  ExternalLink,
  Layers,
  ArrowRight,
  Code2,
  FileCode,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { getActiveRegistrySources } from "@/lib/rag/documentRegistry";
import { ALL_VERSIONED_RULES } from "@/lib/risk/riskRuleRegistry";
import { evaluateRoomHazards, evaluateRoomHazardsCanonical } from "@/lib/risk/ruleEngine";
import {
  buildDecisionGraphFromTraces,
  buildDecisionTracesFromCanonical,
  createLooseRugEmpiricalTrace,
  DECISION_TRACE_VERSION,
} from "@/lib/risk/decisionTrace";
import { TraceabilityStep } from "@/lib/risk/types";
import { cn } from "@/lib/utils";

const STAGE_ICONS: Record<string, string> = {
  SURVEY_ANSWER: "💬",
  ROOM_PROFILE_FIELD: "📋",
  DETECTION_RULE: "⚙️",
  HAZARD_FINDING: "⚠️",
  PRIORITY_DECISION: "🎯",
  EVIDENCE_SOURCE: "📚",
  RECOMMENDATION: "🛠️",
  REASSESSMENT: "🔄",
};

const STAGE_LABELS: Record<string, string> = {
  SURVEY_ANSWER: "1. Câu hỏi & Trả lời Khảo sát",
  ROOM_PROFILE_FIELD: "2. Hồ sơ chuẩn hóa RoomProfile",
  DETECTION_RULE: "3. Quy tắc Động cơ RISK-XXX",
  HAZARD_FINDING: "4. Mối nguy môi trường phát hiện",
  PRIORITY_DECISION: "5. Quyết định mức ưu tiên",
  EVIDENCE_SOURCE: "6. Tài liệu chứng cứ WHO / CDC",
  RECOMMENDATION: "7. Khuyến nghị hành động",
  REASSESSMENT: "8. Tái thẩm định sau can thiệp",
};

export default function ExplainabilityPage() {
  const { getCurrentRoom, currentAssessment, baselineAssessments } =
    useSimulationStore();

  const room = getCurrentRoom();
  const [activeTab, setActiveTab] = useState<"GRAPH" | "AUDIT">("GRAPH");
  const [traceSourceMode, setTraceSourceMode] = useState<"ROOM" | "EMPIRICAL_RUG">("ROOM");
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  // Traceability Audit Trail State
  const snapshot = evaluateRoomHazards(room);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("RISK-001");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  const objectNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const obj of room.objects || []) {
      map[obj.id] = obj.name;
    }
    return map;
  }, [room.objects]);

  const activeTraceBundle = useMemo(() => {
    if (traceSourceMode === "EMPIRICAL_RUG") {
      const empirical = createLooseRugEmpiricalTrace();
      return {
        snapshotId: empirical.beforeConfirmed.snapshotId,
        traces: empirical.beforeConfirmed.traces,
        graph: empirical.beforeConfirmed.graph,
        roomName: "Phòng ngủ chính (Mẫu thảm rời trước xử lý)",
      };
    }

    const canonical = evaluateRoomHazardsCanonical(room);
    const snapshotId = `snap-${canonical.assessmentId.replace(/^asmt-/, "")}`;
    const traces = buildDecisionTracesFromCanonical(canonical, {
      snapshotId,
      objectNamesById,
    });
    const graph = buildDecisionGraphFromTraces(room.id, room.name, snapshotId, traces);
    return {
      snapshotId,
      traces,
      graph,
      roomName: room.name,
    };
  }, [traceSourceMode, room, objectNamesById]);

  const approvedSources = useMemo(
    () => getActiveRegistrySources({ approvalOnly: true }).activeSources,
    []
  );

  const handleExportTrace = () => {
    const payload = {
      traceVersion: DECISION_TRACE_VERSION,
      explainabilityType: "RULE_BASED_PROVENANCE",
      explainabilityNotice:
        "Rule-based explainability / decision provenance từ động cơ quy tắc xác định (không phải lời giải thích nội tại của Gemini).",
      snapshotId: activeTraceBundle.snapshotId,
      roomName: activeTraceBundle.roomName,
      traces: activeTraceBundle.traces,
      graph: activeTraceBundle.graph,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decision-trace-${activeTraceBundle.snapshotId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedRule =
    ALL_VERSIONED_RULES.find((r) => r.id === selectedRuleId) ||
    ALL_VERSIONED_RULES[0];
  const ruleEvaluation = snapshot.ruleEvaluations.find(
    (e) => e.ruleId === selectedRuleId
  );

  const steps: TraceabilityStep[] = ruleEvaluation?.finding?.traceabilityTrail || [
    {
      stepIndex: 1,
      stage: "SURVEY_ANSWER",
      title: "Dữ liệu thu thập từ Khảo sát thông minh AI",
      description: `Ghi nhận thông tin thực địa cho yếu tố ${selectedRule.name}.`,
      data: { roomType: room.roomType, roomName: room.name },
    },
    {
      stepIndex: 2,
      stage: "ROOM_PROFILE_FIELD",
      title: "Trường dữ liệu trong RoomProfile",
      description: "Được chuyển đổi thành định dạng số hóa chuẩn Zod schema.",
      data: { status: "PROFILE_GENERATED", version: "1.0.0" },
    },
    {
      stepIndex: 3,
      stage: "DETECTION_RULE",
      title: `Kích hoạt thuật toán kiểm định ${selectedRule.id}`,
      description: `So sánh giá trị đo đạc với ngưỡng an toàn quy định.`,
      data: {
        ruleId: selectedRule.id,
        evaluatedState: ruleEvaluation?.state || "NOT_DETECTED",
      },
    },
    {
      stepIndex: 4,
      stage: "HAZARD_FINDING",
      title: ruleEvaluation?.finding?.title || "Kết quả đánh giá",
      description:
        ruleEvaluation?.finding?.description || "Không phát hiện vi phạm ngưỡng.",
      data: ruleEvaluation?.evidence || {},
    },
    {
      stepIndex: 5,
      stage: "PRIORITY_DECISION",
      title: `Mức ưu tiên: ${ruleEvaluation?.priority || "LOW"}`,
      description:
        ruleEvaluation?.priorityRationale || "Đánh giá theo mức độ nguy hại.",
      data: { priority: ruleEvaluation?.priority },
    },
    {
      stepIndex: 6,
      stage: "EVIDENCE_SOURCE",
      title: "Căn cứ khoa học y tế dẫn chiếu",
      description: "Dẫn chứng từ WHO Step Safety 2021 và CDC STEADI.",
      data: { sources: ruleEvaluation?.supportingSourceIds },
    },
    {
      stepIndex: 7,
      stage: "RECOMMENDATION",
      title: "Khuyến nghị khắc phục cụ thể",
      description:
        ruleEvaluation?.recommendation?.title || "Duy trì hiện trạng an toàn.",
      data: { steps: ruleEvaluation?.recommendation?.practicalSteps },
    },
  ];

  const activeStep = steps[selectedStepIndex] || steps[0];

  // Generate deterministic ReactFlow graph from DecisionGraph (no hallucinated citation nodes)
  const { initialNodes, initialEdges } = useMemo(() => {
    const graph = activeTraceBundle.graph;
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const stageX: Record<string, number> = {
      ROOM_SNAPSHOT: 20,
      OBJECT_3D: 230,
      INPUT_EVIDENCE: 440,
      RULE: 660,
      FINDING: 870,
      EVIDENCE_SOURCE: 1090,
      RECOMMENDATION: 1320,
    };

    const findingRowMap = new Map<string, number>();
    let rowIdx = 0;
    for (const gn of graph.nodes) {
      if (gn.findingId && !findingRowMap.has(gn.findingId)) {
        findingRowMap.set(gn.findingId, rowIdx++);
      }
    }

    const citCountPerFinding = new Map<string, number>();

    for (const gn of graph.nodes) {
      const row = gn.findingId ? findingRowMap.get(gn.findingId) ?? 0 : 0;
      let y = gn.stage === "ROOM_SNAPSHOT" ? 120 : 20 + row * 190;
      if (gn.stage === "EVIDENCE_SOURCE" && gn.findingId) {
        const sub = citCountPerFinding.get(gn.findingId) ?? 0;
        citCountPerFinding.set(gn.findingId, sub + 1);
        y += sub * 78;
      }

      const isWarning = gn.warningState === "PROVISIONAL" || gn.warningState === "UNKNOWN";
      const borderColor = isWarning
        ? "#d97706"
        : gn.stage === "FINDING"
        ? "#f43f5e"
        : gn.stage === "EVIDENCE_SOURCE"
        ? "#0284c7"
        : gn.stage === "RECOMMENDATION"
        ? "#10b981"
        : "#0d9488";

      nodes.push({
        id: gn.id,
        type: gn.stage === "ROOM_SNAPSHOT" ? "input" : undefined,
        data: {
          title: gn.label,
          stage: gn.stage,
          warningState: gn.warningState,
          badgeText: gn.badgeText,
          tooltipText: gn.tooltipText,
          hotspotHref: gn.hotspotHref,
          objectId: gn.objectId,
          findingId: gn.findingId,
          snapshotId: gn.snapshotId,
          details: gn.details,
          label: (
            <div className="p-2 text-left" title={gn.tooltipText || gn.subtitle}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase">{gn.stage}</span>
                {gn.badgeText && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-bold",
                      isWarning ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-teal-700"
                    )}
                  >
                    {gn.badgeText}
                  </span>
                )}
              </div>
              <div className="font-bold text-xs text-slate-900 truncate mt-0.5">{gn.label}</div>
              <div className="text-[10px] text-slate-500 truncate">{gn.subtitle}</div>
            </div>
          ),
        },
        position: { x: stageX[gn.stage] ?? 20, y },
        style: {
          background: isWarning ? "#fffbeb" : "#ffffff",
          border: `${isWarning ? "2px dashed" : "1.5px solid"} ${borderColor}`,
          borderRadius: "12px",
          width: 195,
        },
      });
    }

    for (const ge of graph.edges) {
      edges.push({
        id: ge.id,
        source: ge.source,
        target: ge.target,
        animated: true,
        style: { stroke: "#64748b" },
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [activeTraceBundle]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">
              Rule-Based Explainability &amp; Decision Provenance (Truy Vết Quyết Định Theo Luật)
            </h1>
            <p className="text-[11px] text-slate-500">
              Truy vết quy tắc xác định: Vật thể → Đầu vào (sourceType) → Quy tắc phiên bản → Nguy cơ → Tài liệu đã duyệt → Khuyến nghị (tách biệt với model explainability nội tại của Gemini)
            </p>
          </div>
        </div>

        {/* Mode & Tab Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setTraceSourceMode((m) => (m === "ROOM" ? "EMPIRICAL_RUG" : "ROOM"))
            }
            className="min-h-11 sm:min-h-[auto] px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700"
          >
            {traceSourceMode === "ROOM" ? "Xem mẫu thảm rời" : "Quay lại phòng hiện tại"}
          </button>
          <button
            onClick={handleExportTrace}
            className="min-h-11 sm:min-h-[auto] px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-xs font-bold text-teal-800"
          >
            Xuất Trace JSON
          </button>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("GRAPH")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "GRAPH"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Sơ đồ Cây Quyết Định (Graph)</span>
          </button>
          <button
            onClick={() => setActiveTab("AUDIT")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5",
              activeTab === "AUDIT"
                ? "bg-white text-teal-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Truy Xuất Nguồn Gốc (Audit Trail)</span>
          </button>
        </div>
        </div>
      </div>

      {/* Content Viewport */}
      {activeTab === "GRAPH" ? (
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 h-full relative">
            <ReactFlow
              nodes={initialNodes}
              edges={initialEdges}
              onNodeClick={(_, node) => setSelectedNodeData(node.data)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={1.5}
            >
              <Background color="#cbd5e1" gap={18} />
              <Controls />
            </ReactFlow>
          </div>

          {/* Right Details Panel */}
          <div className="w-80 border-l border-slate-200 bg-white p-4 overflow-y-auto space-y-4 shrink-0 hidden md:block">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Chi tiết mắt xích logic
            </h3>

            {selectedNodeData ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-bold text-teal-800 text-sm">
                    {selectedNodeData.title || "Thông tin nút"}
                  </div>
                  {selectedNodeData.badgeText && (
                    <span
                      title={selectedNodeData.tooltipText}
                      className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        selectedNodeData.warningState && selectedNodeData.warningState !== "NONE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-teal-100 text-teal-800"
                      )}
                    >
                      {selectedNodeData.badgeText}
                    </span>
                  )}
                </div>
                {selectedNodeData.tooltipText && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    {selectedNodeData.tooltipText}
                  </div>
                )}
                {selectedNodeData.hotspotHref && (
                  <a
                    href={selectedNodeData.hotspotHref}
                    className="min-h-11 sm:min-h-[auto] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-[11px] hover:bg-teal-700 transition"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Mở điểm nóng 3D ({selectedNodeData.objectId})</span>
                  </a>
                )}
                <div className="text-slate-600 space-y-2">
                  {selectedNodeData.details ? (
                    <pre className="text-[11px] bg-white p-2.5 rounded-xl border border-slate-200 overflow-x-auto font-mono text-slate-800 whitespace-pre-wrap">
                      {JSON.stringify(selectedNodeData.details, null, 2)}
                    </pre>
                  ) : (
                    <p>Không có dữ liệu bổ sung</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Nhấp vào bất kỳ nút nào trên sơ đồ truy vết để xem nguồn gốc dữ liệu, trạng thái xác nhận và liên kết điểm nóng 3D.
              </div>
            )}

            {/* Approved sources list (filtered by Task A08 registry) */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase">
                Tài liệu đã phê duyệt ({approvedSources.length})
              </h4>
              {approvedSources.map((src) => (
                <div
                  key={src.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1"
                >
                  <div className="font-bold text-slate-800">
                    {src.organization} (v{src.version})
                  </div>
                  <div className="text-slate-500 text-[10px] line-clamp-1">{src.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Tab AUDIT: 8-Stage Interactive Traceability Trail */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Rule Selection Bar */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Chọn quy tắc kiểm định an toàn để xem chuỗi nguồn gốc logic:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {ALL_VERSIONED_RULES.map((rule) => {
                const ev = snapshot.ruleEvaluations.find((e) => e.ruleId === rule.id);
                const isDetected = ev?.state === "DETECTED";

                return (
                  <button
                    key={rule.id}
                    onClick={() => {
                      setSelectedRuleId(rule.id);
                      setSelectedStepIndex(0);
                    }}
                    className={`min-h-11 sm:min-h-[auto] p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      selectedRuleId === rule.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : isDetected
                        ? "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold">{rule.id}</span>
                      {isDetected && (
                        <span className="h-2 w-2 rounded-full bg-rose-500" />
                      )}
                    </div>
                    <div className="text-[10px] font-medium mt-1 truncate">
                      {rule.name.split("/")[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Interactive Flow & Inspector Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Step-by-Step Interactive Trail */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-teal-600" />
                  <span>Chuỗi suy luận có kiểm toán ({steps.length} bước)</span>
                </h2>
                <span className="text-[11px] text-slate-400">
                  Nhấp vào bước bất kỳ để xem thanh tra chi tiết
                </span>
              </div>

              <div className="space-y-3">
                {steps.map((st, idx) => {
                  const isSelected = selectedStepIndex === idx;

                  return (
                    <div
                      key={st.stepIndex}
                      onClick={() => setSelectedStepIndex(idx)}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3.5 ${
                        isSelected
                          ? "bg-teal-50/60 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-base font-bold transition ${
                          isSelected
                            ? "bg-teal-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {STAGE_ICONS[st.stage] || st.stepIndex}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {STAGE_LABELS[st.stage] || st.stage}
                          </span>
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            Bước {st.stepIndex}
                          </span>
                        </div>

                        <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                          {st.title}
                        </h3>
                        <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                          {st.description}
                        </p>
                      </div>

                      <ArrowRight
                        className={`h-4 w-4 shrink-0 transition self-center ${
                          isSelected ? "text-teal-600 translate-x-1" : "text-slate-300"
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 5 Columns: Node Inspector Drawer */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 self-start sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                    <Code2 className="h-4 w-4" />
                  </span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Thanh tra dữ liệu (Node Inspector)
                  </h3>
                </div>
                <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
                  {activeStep.stage}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">
                  Tên bước kiểm định
                </div>
                <div className="text-sm font-bold text-slate-900">{activeStep.title}</div>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {activeStep.description}
                </p>
              </div>

              {/* Raw JSON Data View */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Cấu trúc dữ liệu ghi nhận (Raw Payload)
                  </span>
                  <span className="text-[10px] font-mono text-teal-600">JSON</span>
                </div>
                <pre className="p-3 bg-slate-900 text-teal-400 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                  {JSON.stringify(activeStep.data, null, 2)}
                </pre>
              </div>

              {/* Audit Verification Stamp */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-teal-800 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                  <span>Truy vết quyết định theo quy tắc (Rule-Based Provenance)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Kết luận được truy vết từ dữ liệu đầu vào (sourceType) qua quy tắc xác định RISK-XXX và tài liệu đã phê duyệt — đây không phải lời giải thích nội tại của Gemini/LLM.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
