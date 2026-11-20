"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Moon,
  Sun,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Camera,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { cn } from "@/lib/utils";

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const {
    isNightMode,
    toggleNightMode,
    currentAssessment,
    runSimulation,
    restoreBaseline,
  } = useSimulationStore();

  const hazardCount = currentAssessment?.findings.length ?? 0;
  const safetyScore = currentAssessment?.safetyScore ?? 70;

  const scoreBadgeColor =
    safetyScore >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : safetyScore >= 60
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  if (pathname === "/experience") return null;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md shadow-teal-500/10 overflow-hidden border border-slate-200/80 p-0.5">
              <img src="/images/logo.png" alt="SafeHome 3D AI Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  SafeHome <span className="text-teal-600">3D AI</span>
                </span>
                <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                  Digital Twin
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Nhà an toàn, tuổi già an tâm • Bản sao số phòng ngừa té ngã
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Context-aware Navigation */}
        {pathname === "/workflow" ? (
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200/80 text-teal-800 text-xs font-bold shadow-xs">
            <Compass className="h-4 w-4 text-teal-600 animate-spin-slow" />
            <span>Quy Trình Khảo Sát &amp; Đánh Giá An Toàn (7 Bước Khép Kín)</span>
          </div>
        ) : null}

        {/* Real-time Status Badges & Quick Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* Safety Score Indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm transition-all",
              scoreBadgeColor
            )}
            title="Chỉ số an toàn không gian sống (0-100)"
          >
            {safetyScore >= 80 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            )}
            <span>Điểm an toàn:</span>
            <span className="text-sm font-black">{safetyScore}</span>/100
          </div>

          {/* Hazard Count Pill */}
          <div
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold",
              hazardCount > 0
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}
          >
            <span className="h-2 w-2 rounded-full animate-pulse bg-rose-500" />
            <span className="font-bold">{hazardCount}</span> nguy cơ
          </div>

          {/* Night / Day toggle */}
          <button
            onClick={toggleNightMode}
            title={isNightMode ? "Chuyển sang chế độ ban ngày" : "Mô phỏng ban đêm (Độ rọi mờ)"}
            className={cn(
              "p-2 rounded-xl border transition-all text-xs font-medium flex items-center gap-1.5",
              isNightMode
                ? "bg-indigo-900 text-indigo-100 border-indigo-700 shadow-inner"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            )}
          >
            {isNightMode ? (
              <>
                <Moon className="h-4 w-4 text-indigo-300" />
                <span className="hidden xl:inline">Đêm (40 Lux)</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-600" />
                <span className="hidden xl:inline">Ngày (250 Lux)</span>
              </>
            )}
          </button>

          {/* Run Simulation & Restore Baseline (Shown on 3D & interactive pages, hidden on workflow to keep header clean) */}
          {pathname !== "/workflow" && (
            <>
              <Link
                href="/ai-vision"
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold text-xs shadow-2xs active:scale-95 transition-all"
                title="Thị giác AI: Nhận diện không gian & Quét phòng 3D"
              >
                <Camera className="h-3.5 w-3.5 text-sky-600" />
                <span>AI Vision</span>
              </Link>

              <button
                onClick={() => runSimulation()}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                title="Đánh giá lại toàn bộ nguy cơ không gian"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Chạy mô phỏng</span>
              </button>

              <button
                onClick={() => restoreBaseline()}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs transition-all"
                title="Khôi phục trạng thái ban đầu (Baseline)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

