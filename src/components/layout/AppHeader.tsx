"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldAlert,
  Moon,
  Sun,
  Play,
  RotateCcw,
  AlertTriangle,
  Compass,
  Camera,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { cn } from "@/lib/utils";
import {
  ACTIVE_ROOM_KEY,
  SNAPSHOT_SAVED_EVENT,
  deriveHeaderStatus,
  luxIsMeasurement,
  pickLatest,
  type HeaderStatus,
} from "./headerStatus";

export const AppHeader: React.FC = () => {
  const pathname = usePathname();
  const isPhotoVision = pathname === "/ai-vision" || pathname === "/vision";
  const { isNightMode, toggleNightMode, runSimulation, restoreBaseline, getCurrentRoom } = useSimulationStore();
  const isPhotoDraft = getCurrentRoom().evidenceStatus === "PHOTO_DRAFT";

  // Đánh giá gần nhất của phòng đang làm việc, đọc từ máy chủ (chỉ đúng tài khoản). Không dùng store mẫu.
  const [status, setStatus] = useState<HeaderStatus>({ kind: "none", label: "Chưa đánh giá" });
  const refresh = useCallback(async () => {
    let room: string | null = null;
    try { room = localStorage.getItem(ACTIVE_ROOM_KEY); } catch { /* chặn lưu trữ: coi như chưa có */ }
    if (!room) return setStatus({ kind: "none", label: "Chưa đánh giá" });
    try {
      const res = await fetch(`/api/v1/snapshots?roomId=${encodeURIComponent(room)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) return setStatus({ kind: "none", label: "Chưa đánh giá" });
      setStatus(deriveHeaderStatus(pickLatest(json.data as any[])));
    } catch {
      setStatus({ kind: "none", label: "Chưa đánh giá" });
    }
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener(SNAPSHOT_SAVED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SNAPSHOT_SAVED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh, pathname]);

  if (pathname === "/experience" || pathname === "/sign-in") return null;

  return (
    <header className="md:sticky md:top-0 z-40 w-full border-b bg-white/90 backdrop-blur-md">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 sm:px-6 py-1">
        {/* Brand */}
        <div className="flex items-center space-x-3 shrink-0">
          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-md shadow-teal-500/10 overflow-hidden border border-slate-200/80 p-0.5">
              <img src="/images/logo.png" alt="SafeHome 3D AI Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
                  SafeHome <span className="text-teal-600">3D AI</span>
                </span>
                <span className="hidden 2xl:inline rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800 whitespace-nowrap">
                  Mô hình phòng (mô phỏng gần đúng)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden 2xl:block">
                Nhà an toàn, tuổi già an tâm • Sàng lọc môi trường phòng ngừa té ngã
              </p>
            </div>
          </Link>
        </div>

        {/* Center: Context-aware Navigation */}
        <button className="min-h-[44px] px-2 text-sm text-slate-700 underline whitespace-nowrap" onClick={async () => {
          const response = await fetch("/api/auth/logout", { method: "POST" });
          if (!response.ok) return;
          for (const key of Object.keys(localStorage)) if (key.startsWith("safehome:")) localStorage.removeItem(key);
          localStorage.setItem("safehome:auth-change", crypto.randomUUID());
          window.location.assign("/sign-in");
        }}>Đăng xuất</button>
        {pathname === "/workflow" ? (
          <div className="hidden 2xl:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200/80 text-teal-800 text-sm font-bold shadow-xs">
            <Compass className="h-4 w-4 text-teal-600 animate-spin-slow" />
            <span>Quy Trình Khảo Sát &amp; Đánh Giá An Toàn (7 Bước Khép Kín)</span>
          </div>
        ) : null}

        {/* Real-time Status Badges & Quick Action Controls */}
        {isPhotoVision || status.kind === "none" ? (
          <div
            data-testid="header-status-none"
            className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-sm text-amber-900 font-semibold"
          >
            <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{isPhotoDraft ? "Bản dựng ước lượng — chưa đánh giá thực trạng" : isPhotoVision ? "Ảnh cần xác nhận tại nhà" : "Chưa đánh giá"}</span>
          </div>
        ) : (
        <div className="flex flex-wrap items-center gap-2 min-w-0" data-testid="header-status-assessed">
          <div
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-sm font-bold",
              status.unknownRules > 0 ? "bg-amber-50 text-amber-900 border-amber-300" : "bg-slate-50 text-slate-800 border-slate-300"
            )}
            title="Chỉ số sàng lọc môi trường tham khảo, không phải kết luận an toàn hay dự báo té ngã"
          >
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
            {status.screeningScore == null ? (
              <span>{status.stateLabel}: chưa đủ dữ liệu ({status.unknownRules} mục)</span>
            ) : (
              <span>{status.stateLabel}: {status.screeningScore}/100</span>
            )}
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border bg-white text-slate-700 border-slate-200 text-sm font-semibold whitespace-nowrap">
            <span className="font-bold">{status.hazards}</span>&nbsp;nguy cơ
          </div>

          {status.lux ? (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border bg-white text-slate-700 border-slate-200 text-sm font-semibold whitespace-nowrap">
              <span>Đêm {status.lux.value} Lux</span>
              <span
                data-testid="header-lux-badge"
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-bold",
                  luxIsMeasurement(status.lux.source) ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                )}
              >
                {status.lux.label}
              </span>
            </div>
          ) : (
            <div className="px-2.5 py-1.5 rounded-xl border bg-white text-slate-500 border-slate-200 text-sm font-semibold">Độ rọi: chưa đo</div>
          )}

          {/* Night / Day toggle */}
          <button
            onClick={toggleNightMode}
            aria-pressed={isNightMode}
            aria-label={isNightMode ? "Chuyển cảnh 3D sang ban ngày" : "Chuyển cảnh 3D sang ban đêm (chỉ hiển thị)"}
            title={isNightMode ? "Chuyển cảnh 3D sang ban ngày" : "Xem cảnh 3D ở chế độ ban đêm (chỉ là hiển thị, không phải số đo)"}
            className={cn(
              "min-h-[44px] min-w-[44px] justify-center p-2 rounded-xl border transition-all text-sm font-medium flex items-center gap-1.5",
              isNightMode
                ? "bg-indigo-900 text-indigo-100 border-indigo-700 shadow-inner"
                : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
            )}
          >
            {isNightMode ? (
              <>
                <Moon className="h-4 w-4 text-indigo-300" />
                <span className="hidden 2xl:inline">Cảnh đêm (mô phỏng)</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-600" />
                <span className="hidden 2xl:inline">Cảnh ngày (mô phỏng)</span>
              </>
            )}
          </button>

          {/* Run Simulation & Restore Baseline (Shown on 3D & interactive pages, hidden on workflow to keep header clean) */}
          {pathname !== "/workflow" && (
            <>
              <Link
                href="/ai-vision"
                className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 font-semibold text-sm shadow-2xs active:scale-95 transition-all"
                title="Thị giác AI: Nhận diện không gian & Quét phòng 3D"
              >
                <Camera className="h-3.5 w-3.5 text-sky-600" />
                <span>AI Vision</span>
              </Link>

              <button
                onClick={() => runSimulation()}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-md shadow-teal-600/20 active:scale-95 transition-all"
                title="Đánh giá lại toàn bộ nguy cơ không gian"
              >
                <Play className="h-3.5 w-3.5 fill-white" />
                <span>Chạy mô phỏng</span>
              </button>

              <button
                onClick={() => restoreBaseline()}
                className="p-1.5 sm:p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-sm transition-all"
                title="Khôi phục trạng thái ban đầu (Baseline)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        )}
      </div>
    </header>
  );
};

