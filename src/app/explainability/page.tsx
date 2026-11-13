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
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

export default function ExplainabilityPage() {
  const { getCurrentRoom, currentAssessment, baselineAssessments } =
    useSimulationStore();

  const room = getCurrentRoom();
  const findings = currentAssessment?.findings || [];
  const [selectedNodeData, setSelectedNodeData] = useState<any>(null);

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
            <div className="text-[10px] text-slate-500 font-mono">Không gian khảo sát 3D</div>
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
      const refId = `node-ref-${finding.id}`;
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
              <span className="text-[9px] font-bold text-rose-500 uppercase">4. Nguy cơ ({finding.severityCategory})</span>
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

      // 5. Recommendation Node
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
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">
              Sơ Đồ Giải Trình &amp; Nguồn Gốc Quyết Định (Explainable AI &amp; Traceability)
            </h1>
            <p className="text-[11px] text-slate-500">
              Minh bạch 100% chuỗi logic: Vật thể 3D → Thuộc tính hình học → Quy tắc chuyên môn → Nguy cơ → Nguồn dẫn chứng → Khuyến nghị
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Info className="h-4 w-4 text-teal-600" />
          <span>Nhấp chuột vào nút trên sơ đồ để xem bằng chứng chi tiết</span>
        </div>
      </div>

      {/* Main Graph Viewport */}
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
    </div>
  );
}

