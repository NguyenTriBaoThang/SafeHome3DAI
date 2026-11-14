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
  Home,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { cn } from "@/lib/utils";

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const {
    rooms,
    currentRoomId,
    switchRoom,
    isNightMode,
    toggleNightMode,
    currentAssessment,
    runSimulation,
    restoreBaseline,
  } = useSimulationStore();

  const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0];
  const hazardCount = currentAssessment?.findings.length ?? 0;
  const safetyScore = currentAssessment?.safetyScore ?? 70;

  const scoreBadgeColor =
    safetyScore >= 80
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : safetyScore >= 60
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-sky-500 text-white shadow-md shadow-teal-500/20">
              <ShieldAlert className="h-6 w-6" />
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

        {/* Room Switcher */}
        <div className="flex items-center space-x-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 hidden md:flex">
          {rooms.map((r) => {
            const isActive = r.id === currentRoomId;
            return (
              <button
                key={r.id}
                onClick={() => switchRoom(r.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  isActive
                    ? "bg-white text-teal-700 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                )}
              >
                <Home className="h-3.5 w-3.5" />
                {r.name.split("(")[0].trim()}
              </button>
            );
          })}
        </div>

        {/* Guided Journey Fast Action */}
        <Link
          href="/workflow"
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-600 hover:to-sky-700 text-white text-xs font-bold transition shadow-sm"
        >
          <Compass className="h-3.5 w-3.5" />
          <span>Hành trình 7 Bước</span>
        </Link>

        {/* Real-time Status Badges & Quick Action Controls */}
        <div className="flex items-center space-x-3">
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

          {/* Run Simulation Action */}
          <button
            onClick={() => runSimulation()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all"
            title="Đánh giá lại toàn bộ nguy cơ không gian"
          >
            <Play className="h-3.5 w-3.5 fill-white" />
            <span>Chạy mô phỏng</span>
          </button>

          {/* Restore Baseline */}
          <button
            onClick={() => restoreBaseline()}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs transition-all"
            title="Khôi phục trạng thái ban đầu (Baseline)"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

