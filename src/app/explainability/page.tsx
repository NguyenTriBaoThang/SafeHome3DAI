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
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import { ALL_VERSIONED_RULES } from "@/lib/risk/riskRuleRegistry";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
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
  const findings = currentAssessment?.findings || [];
  const [activeTab, setActiveTab] = useState<"GRAPH" | "AUDIT">("GRAPH");
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

  // Traceability Audit Trail State
  const snapshot = evaluateRoomHazards(room);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("RISK-001");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

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

  // Generate real graph nodes and edges tracing the findings
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Root Room Node
    nodes.push({
      id: "node-room",
      type: "input",
      data: {
        label: (
          <div className="p-2 text-center">
            <div className="font-bold text-xs text-teal-800">{room.name}</div>
            <div className="text-[10px] text-slate-500 font-mono">
              Không gian khảo sát 3D
            </div>
          </div>
        ),
      },
      position: { x: 20, y: 150 },
      style: {
        background: "#ccfbf1",
        border: "2px solid #0d9488",
        borderRadius: "16px",
        width: 180,
      },
    });

    let yOffset = 20;

    findings.forEach((finding, idx) => {
      const objId = `node-obj-${finding.id}`;
      const propId = `node-prop-${finding.id}`;
      const ruleId = `node-rule-${finding.id}`;
      const findingId = `node-find-${finding.id}`;
      const recId = `node-rec-${finding.id}`;

      const y = yOffset;
      yOffset += 160;

      // 1. Scene Object Node
      nodes.push({
        id: objId,
        data: {
          title: "Vật thể không gian",
          label: (
            <div className="p-2 text-left">
              <span className="text-[9px] font-bold text-slate-400 uppercase">1. Vật thể 3D</span>
              <div className="font-bold text-xs text-slate-800 truncate">
                {finding.evidence.affectedObjectName || finding.title}
              </div>
            </div>
          ),
          details: finding.evidence,
        },
        position: { x: 240, y },
        style: {
          background: "#ffffff",
          border: "1.5px solid #cbd5e1",
          borderRadius: "12px",
          width: 170,
        },
      });

      edges.push({
        id: `e-room-${objId}`,
        source: "node-room",
        target: objId,
        animated: true,
        style: { stroke: "#0d9488" },
      });

      // 2. Spatial Property Node
      nodes.push({
        id: propId,
        data: {
          title: "Đo đạc hình học",
          label: (
            <div className="p-2 text-left">
              <span className="text-[9px] font-bold text-sky-500 uppercase">2. Đo đạc không gian</span>
              <div className="font-bold text-xs text-slate-700 font-mono">
                {finding.evidence.measuredValue?.toString().slice(0, 24)}...
              </div>
            </div>
          ),
          details: finding.evidence,
        },
        position: { x: 450, y },
        style: {
          background: "#f0f9ff",
          border: "1.5px solid #0284c7",
          borderRadius: "12px",
          width: 180,
        },
      });

      edges.push({
        id: `e-${objId}-${propId}`,
        source: objId,
        target: propId,
        animated: true,
        style: { stroke: "#0284c7" },
      });

      // 3. Detection Rule Node
      nodes.push({
        id: ruleId,
        data: {
          title: "Quy tắc kiểm định",
          label: (
            <div className="p-2 text-left">
              <span className="text-[9px] font-bold text-amber-500 uppercase">3. Quy chuẩn</span>
              <div className="font-bold text-xs text-amber-900 font-mono">
                {finding.detectionRuleId}
              </div>
            </div>
          ),
          details: { ruleId: finding.detectionRuleId, threshold: finding.evidence.threshold },
        },
        position: { x: 670, y },
        style: {
          background: "#fefce8",
          border: "1.5px solid #eab308",
          borderRadius: "12px",
          width: 160,
        },
      });

      edges.push({
        id: `e-${propId}-${ruleId}`,
        source: propId,
        target: ruleId,
        animated: true,
        style: { stroke: "#eab308" },
      });

      // 4. Hazard Finding Node
      nodes.push({
        id: findingId,
        data: {
          title: "Kết luận nguy cơ",
          label: (
            <div className="p-2 text-left">
              <span className="text-[9px] font-bold text-rose-500 uppercase">
                4. Nguy cơ ({finding.severityCategory})
              </span>
              <div className="font-bold text-xs text-rose-700 truncate">
                {finding.title}
              </div>
            </div>
          ),
          details: finding,
        },
        position: { x: 870, y },
        style: {
          background: "#fff1f2",
          border: "1.5px solid #f43f5e",
          borderRadius: "12px",
          width: 170,
        },
      });

      edges.push({
        id: `e-${ruleId}-${findingId}`,
        source: ruleId,
        target: findingId,
        animated: true,
        style: { stroke: "#f43f5e" },
      });

      // 5. Actionable Recommendation Node
      nodes.push({
        id: recId,
        data: {
          title: "Khuyến nghị giải pháp",
          label: (
            <div className="p-2 text-left">
              <span className="text-[9px] font-bold text-emerald-600 uppercase">5. Can thiệp</span>
              <div className="font-bold text-xs text-emerald-800 truncate">
                {finding.recommendationText.slice(0, 26)}...
              </div>
            </div>
          ),
          details: { recommendation: finding.recommendationText },
        },
        position: { x: 1080, y },
        style: {
          background: "#ecfdf5",
          border: "1.5px solid #10b981",
          borderRadius: "12px",
          width: 180,
        },
      });

      edges.push({
        id: `e-${findingId}-${recId}`,
        source: findingId,
        target: recId,
        animated: true,
        style: { stroke: "#10b981" },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [room, findings]);

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
              Giải Trình AI &amp; Nguồn Gốc Quyết Định (Explainable AI &amp; Audit Trail)
            </h1>
            <p className="text-[11px] text-slate-500">
              Minh bạch 100% chuỗi suy luận: Vật thể 3D → Đo đạc → Quy tắc → Nguy cơ → Căn cứ Y học → Khuyến nghị
            </p>
          </div>
        </div>

        {/* Tab switch buttons */}
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
                <div className="font-bold text-teal-800 text-sm">
                  {selectedNodeData.title || "Thông tin nút"}
                </div>
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
                Nhấp vào bất kỳ nút nào trên cây giải trình để xem chi tiết thông số đo đạc và căn cứ quy chuẩn.
              </div>
            )}

            {/* Reference standards list */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <h4 className="text-[11px] font-bold text-slate-600 uppercase">
                Tài liệu chuẩn hóa liên kết
              </h4>
              {CURATED_KNOWLEDGE_SOURCES.map((src) => (
                <div
                  key={src.id}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1"
                >
                  <div className="font-bold text-slate-800">{src.organization}</div>
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
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
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
                  <span>Chứng chỉ minh bạch kiểm định (Audit Traceable)</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Mọi kết luận của SafeHome 3D AI đều truy nguyên được từ câu hỏi hiện trường và tài liệu tiêu chuẩn, tuyệt đối không suy diễn ngẫu nhiên.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
