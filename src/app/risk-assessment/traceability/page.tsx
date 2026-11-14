"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Info,
  ChevronLeft,
  FileCode,
  Layers,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Code2,
} from "lucide-react";
import { ALL_VERSIONED_RULES } from "@/lib/risk/riskRuleRegistry";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { TraceabilityStep } from "@/lib/risk/types";

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

export default function TraceabilityMapPage() {
  const { getCurrentRoom } = useSimulationStore();
  const room = getCurrentRoom();
  const snapshot = evaluateRoomHazards(room);

  const [selectedRuleId, setSelectedRuleId] = useState<string>("RISK-001");
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);

  const selectedRule = ALL_VERSIONED_RULES.find((r) => r.id === selectedRuleId) || ALL_VERSIONED_RULES[0];
  const ruleEvaluation = snapshot.ruleEvaluations.find((e) => e.ruleId === selectedRuleId);

  // Generate traceability steps for this rule
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
      data: { ruleId: selectedRule.id, evaluatedState: ruleEvaluation?.state || "NOT_DETECTED" },
    },
    {
      stepIndex: 4,
      stage: "HAZARD_FINDING",
      title: ruleEvaluation?.finding?.title || "Kết quả đánh giá",
      description: ruleEvaluation?.finding?.description || "Không phát hiện vi phạm ngưỡng.",
      data: ruleEvaluation?.evidence || {},
    },
    {
      stepIndex: 5,
      stage: "PRIORITY_DECISION",
      title: `Mức ưu tiên: ${ruleEvaluation?.priority || "LOW"}`,
      description: ruleEvaluation?.priorityRationale || "Đánh giá theo mức độ nguy hại.",
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
      description: ruleEvaluation?.recommendation?.title || "Duy trì hiện trạng an toàn.",
      data: { steps: ruleEvaluation?.recommendation?.practicalSteps },
    },
  ];

  const activeStep = steps[selectedStepIndex] || steps[0];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/risk-assessment"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Quay lại Bảng điều khiển"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <Compass className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Traceability Knowledge Map (Bản Đồ Truy Xuất Nguồn Gốc)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 pl-9">
            Minh bạch hóa toàn bộ chuỗi suy luận: Từ câu trả lời khảo sát $\rightarrow$ Quy tắc hình học $\rightarrow$ Mối nguy $\rightarrow$ Căn cứ y học $\rightarrow$ Khuyến nghị
          </p>
        </div>

        <Link
          href="/risk-assessment"
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Quay lại Dashboard</span>
        </Link>
      </div>

      {/* Rule Selection Bar */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Chọn quy tắc kiểm định an toàn để xem chuỗi nguồn gốc:
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
  );
}

