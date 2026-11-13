"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Eye,
  Sliders,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Wrench,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { ALL_RULES } from "@/features/risk-engine/rules";

export default function RiskAssessmentPage() {
  const {
    getCurrentRoom,
    currentAssessment,
    selectObject,
    focusOnLocation,
    fixObject,
    runSimulation,
  } = useSimulationStore();

  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);

  const room = getCurrentRoom();
  const findings = currentAssessment?.findings || [];

  const filteredFindings = findings.filter((f) => {
    if (filterSeverity === "ALL") return true;
    return f.severityCategory === filterSeverity;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Động Cơ Nhận Diện Nguy Cơ Môi Trường (Risk Engine)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quy tắc xác định không gian dựa trên đo đạc hình học 3D, đối chiếu với tiêu chuẩn CDC STEADI &amp; WHO
          </p>
        </div>

        <Link
          href="/digital-twin"
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 self-start md:self-auto"
        >
          <Eye className="h-4 w-4" />
          <span>Xem trực quan 3D</span>
        </Link>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400">Tổng số quy tắc thẩm định</div>
          <div className="text-2xl font-black text-slate-800">{ALL_RULES.length} quy tắc</div>
          <div className="text-[10px] text-teal-600 font-medium">Toán học không gian xác định</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400">Nguy cơ kích hoạt</div>
          <div className="text-2xl font-black text-rose-600">{findings.length} điểm</div>
          <div className="text-[10px] text-rose-500 font-medium">Tại không gian {room.name.split("(")[0]}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400">Mức ưu tiên cao (High)</div>
          <div className="text-2xl font-black text-rose-700">
            {findings.filter((f) => f.severityCategory === "HIGH").length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Cần can thiệp ngay</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400">Mức Trung bình &amp; Thấp</div>
          <div className="text-2xl font-black text-amber-600">
            {findings.filter((f) => f.severityCategory !== "HIGH").length}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">Khuyến nghị khắc phục</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {["ALL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterSeverity === sev
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {sev === "ALL"
              ? "Tất cả nguy cơ"
              : sev === "HIGH"
              ? "Ưu tiên Cao"
              : sev === "MEDIUM"
              ? "Ưu tiên Vừa"
              : "Ưu tiên Thấp"}
          </button>
        ))}
      </div>

      {/* Active Findings Detailed Cards */}
      <div className="space-y-4">
        {filteredFindings.map((finding) => {
          const isHigh = finding.severityCategory === "HIGH";

          return (
            <div
              key={finding.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm space-y-3 transition ${
                isHigh ? "border-rose-200" : "border-slate-200"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-xl ${
                      isHigh
                        ? "bg-rose-100 text-rose-600"
                        : "bg-amber-100 text-amber-600"
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {finding.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                      <span>Mã quy tắc: {finding.detectionRuleId}</span>
                      <span>•</span>
                      <span>Loại: {finding.hazardType}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      isHigh
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }`}
                  >
                    Mức ưu tiên {finding.severityCategory}
                  </span>

                  {finding.targetObjectId && (
                    <button
                      onClick={() => fixObject(finding.targetObjectId!)}
                      className="px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 flex items-center gap-1 transition"
                    >
                      <Wrench className="h-3.5 w-3.5 text-teal-600" />
                      <span>Xử lý</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {finding.description}
              </p>

              {/* Evidence box */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-start gap-2">
                  <strong className="text-slate-500 shrink-0">Bằng chứng hình học:</strong>
                  <span className="font-mono text-slate-800 font-semibold">
                    {finding.evidence.measuredValue}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <strong className="text-slate-500 shrink-0">Ngưỡng kỹ thuật:</strong>
                  <span className="text-slate-700">{finding.evidence.threshold}</span>
                </div>
                <div className="flex items-start gap-2">
                  <strong className="text-slate-500 shrink-0">Cơ chế nguy hại:</strong>
                  <span className="text-slate-600">{finding.evidence.rationale}</span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-1.5 text-teal-800 font-medium">
                  <BookOpen className="h-4 w-4 text-teal-600" />
                  <span>
                    <strong>Khuyến nghị khắc phục:</strong> {finding.recommendationText}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Catalog of all 8 Deterministic Rules */}
      <div className="mt-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-teal-600" />
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Danh mục quy tắc kiểm định an toàn hình học (Rule Engine Catalog)
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_RULES.map((rule) => (
            <div
              key={rule.id}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-teal-700">
                  {rule.id}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Mặc định: {rule.defaultSeverity}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">{rule.name}</h4>
              <p className="text-[11px] text-slate-500">
                Phân tích hình học không gian 3D, giao cắt thông thủy lối đi và tính chất vật liệu sàn.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

