"use client";

import React from "react";
import {
  TrendingUp,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";

export const ComparisonPanel: React.FC = () => {
  const { comparison, currentAssessment, restoreBaseline } =
    useSimulationStore();

  if (!comparison) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800">
              Đối sánh Kịch bản Trước / Sau can thiệp
            </div>
            <div className="text-[11px] text-slate-500">
              Điều chỉnh nội thất hoặc môi trường, sau đó bấm &quot;Chạy mô phỏng&quot; để so sánh kết quả.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { resolved, remaining, newlyIntroduced, baselineScore, currentScore, scoreDelta } =
    comparison;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Kết quả đối sánh mô phỏng
            </h4>
            <span className="text-[10px] text-slate-500">
              So sánh hiện trạng can thiệp với kịch bản gốc (Baseline)
            </span>
          </div>
        </div>

        {/* Score comparison */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-semibold">Chỉ số an toàn</div>
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-slate-500">{baselineScore}</span>
              <span className="text-slate-400">→</span>
              <span
                className={`text-sm font-black ${
                  scoreDelta > 0
                    ? "text-emerald-600"
                    : scoreDelta < 0
                    ? "text-rose-600"
                    : "text-slate-700"
                }`}
              >
                {currentScore}/100
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  scoreDelta > 0
                    ? "bg-emerald-100 text-emerald-800"
                    : scoreDelta < 0
                    ? "bg-rose-100 text-rose-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}
              </span>
            </div>
          </div>

          <button
            onClick={restoreBaseline}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition"
            title="Khôi phục trạng thái ban đầu"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Comparison metrics row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Resolved */}
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span>Đã giải quyết ({resolved.length})</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 leading-tight">
            {resolved.length > 0
              ? resolved.map((r) => r.title).join("; ")
              : "Chưa giải quyết nguy cơ nào"}
          </p>
        </div>

        {/* Remaining */}
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Còn tồn đọng ({remaining.length})</span>
          </div>
          <p className="mt-1 text-[11px] text-amber-700 leading-tight">
            {remaining.length > 0
              ? remaining.map((r) => r.title).join("; ")
              : "Đã triệt tiêu toàn bộ nguy cơ!"}
          </p>
        </div>

        {/* Newly introduced */}
        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>Nguy cơ mới phát sinh ({newlyIntroduced.length})</span>
          </div>
          <p className="mt-1 text-[11px] text-rose-700 leading-tight">
            {newlyIntroduced.length > 0
              ? newlyIntroduced.map((r) => r.title).join("; ")
              : "Không phát sinh nguy cơ mới"}
          </p>
        </div>
      </div>
    </div>
  );
};

