"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Wrench,
  BookOpen,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { HazardFindingResult } from "@/types";

export const HazardFindingList: React.FC = () => {
  const {
    currentAssessment,
    selectedObjectId,
    selectObject,
    focusOnLocation,
    fixObject,
    setLightingLevel,
    setFloorWetness,
    setAntiSlip,
    addSafetyDevice,
    getCurrentRoom,
  } = useSimulationStore();

  const findings = currentAssessment?.findings || [];
  const room = getCurrentRoom();

  const handleFocus = (finding: HazardFindingResult) => {
    if (finding.targetObjectId) {
      selectObject(finding.targetObjectId);
    }
    if (finding.evidence.coordinates) {
      focusOnLocation(finding.evidence.coordinates);
    }
  };

  const handleQuickFix = (finding: HazardFindingResult) => {
    if (finding.targetObjectId) {
      fixObject(finding.targetObjectId);
      return;
    }
    // Lighting
    if (finding.hazardType === "POOR_LIGHTING") {
      setLightingLevel(200);
      return;
    }
    // Wet floor
    if (finding.hazardType === "WET_FLOOR") {
      setFloorWetness(false);
      setAntiSlip(true);
      return;
    }
    // Missing grab bar
    if (finding.hazardType === "MISSING_GRAB_BAR") {
      addSafetyDevice("grab_bar_toilet");
      addSafetyDevice("grab_bar_shower");
      return;
    }
  };

  if (findings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-100 p-6 shadow-sm text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">
          Không gian đạt chuẩn an toàn môi trường!
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Tất cả các nguy cơ ngã đã được khắc phục hoặc không có vi phạm quy chuẩn an toàn nào trong không gian này.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-rose-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Nguy cơ môi trường phát hiện ({findings.length})
          </h3>
        </div>
        <span className="text-[11px] text-slate-400">Bấm thẻ để định vị 3D</span>
      </div>

      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {findings.map((item, idx) => {
          const isHigh = item.severityCategory === "HIGH";
          const isMedium = item.severityCategory === "MEDIUM";
          const hazardNumber = `H${idx + 1}`;
          const isSelected = selectedObjectId && item.targetObjectId === selectedObjectId;

          const badgeBg = isHigh
            ? "bg-rose-100 text-rose-800 border-rose-300"
            : isMedium
            ? "bg-amber-100 text-amber-800 border-amber-300"
            : "bg-sky-100 text-sky-800 border-sky-300";

          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border transition-all hover:shadow-md cursor-pointer bg-white ${
                isSelected
                  ? "border-teal-500 ring-2 ring-teal-500/40 shadow-lg"
                  : isHigh
                  ? "border-rose-200 hover:border-rose-400"
                  : isMedium
                  ? "border-amber-200 hover:border-amber-400"
                  : "border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => handleFocus(item)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 px-2 py-0.5 rounded-lg text-white font-black text-xs shadow-sm flex items-center justify-center shrink-0 ${
                      isHigh
                        ? "bg-rose-600"
                        : isMedium
                        ? "bg-amber-600"
                        : "bg-sky-600"
                    }`}
                  >
                    {hazardNumber}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">
                      Quy tắc: {item.detectionRuleId}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badgeBg}`}
                >
                  Ưu tiên {item.severityCategory}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                {item.description}
              </p>

              {/* Evidence disclosure */}
              {item.evidence && (
                <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                  <div>
                    <strong className="text-slate-700">Dữ liệu đo đạc: </strong>
                    <span className="font-mono text-slate-800">
                      {item.evidence.measuredValue}
                    </span>
                  </div>
                  <div>
                    <strong className="text-slate-700">Căn cứ chuyên môn: </strong>
                    <span>{item.evidence.rationale}</span>
                  </div>
                </div>
              )}

              {/* Recommendation & Quick fix */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-teal-700 font-medium">
                  <BookOpen className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[210px] sm:max-w-xs">
                    {item.recommendationText}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFocus(item);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
                    title="Định vị camera 3D"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickFix(item);
                    }}
                    className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold border border-teal-200 flex items-center gap-1 transition shadow-sm"
                    title="Khắc phục giải quyết nguy cơ này"
                  >
                    <Wrench className="h-3 w-3 text-teal-600" />
                    <span>Khắc phục</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

