"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  FileText,
  Compass,
  Box,
  Sparkles,
  Info,
  ChevronRight,
  Layers,
  Sliders,
} from "lucide-react";
import { ChapterData, CHAPTERS_DATA } from "./experienceData";

interface ChapterOverlayProps {
  activeChapter: ChapterData;
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isAutoPlay: boolean;
  onToggleAutoPlay: () => void;
  autoPlayProgress: number; // 0 to 100%
  isComparisonActive: boolean;
  comparisonMode: "BEFORE" | "AFTER";
  onToggleComparison: (mode: "BEFORE" | "AFTER") => void;
}

export function ChapterOverlay({
  activeChapter,
  activeChapterIndex,
  onSelectChapter,
  onNext,
  onPrev,
  isAutoPlay,
  onToggleAutoPlay,
  autoPlayProgress,
  isComparisonActive,
  comparisonMode,
  onToggleComparison,
}: ChapterOverlayProps) {
  const isFirst = activeChapterIndex === 0;
  const isLast = activeChapterIndex === CHAPTERS_DATA.length - 1;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-10">
      {/* Top Bar: Brand, Navigation Dots & Auto-Play */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        {/* Brand Pill */}
        <div className="flex items-center gap-2 bg-slate-900/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700/60 shadow-lg text-white">
          <div className="h-7 w-7 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold text-xs">
            3D
          </div>
          <div>
            <div className="text-xs font-bold tracking-tight">SafeHome 3D AI</div>
            <div className="text-[10px] text-teal-400 font-medium">
              Cinematic Digital Twin Experience
            </div>
          </div>
        </div>

        {/* Chapter Navigation Timeline Pills */}
        <div className="hidden lg:flex items-center bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 shadow-lg gap-1.5">
          {CHAPTERS_DATA.map((ch, idx) => {
            const isActive = idx === activeChapterIndex;
            return (
              <button
                key={ch.id}
                onClick={() => onSelectChapter(idx)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? "bg-teal-500 text-slate-950 shadow-md font-bold"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <span>0{idx + 1}</span>
                {isActive && (
                  <span className="text-[11px] font-medium hidden xl:inline">
                    {ch.tag.split("·")[1]?.trim() || ch.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Auto-Play Presentation Button & Manual Link */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleAutoPlay}
            className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-all flex items-center gap-2 shadow-lg ${
              isAutoPlay
                ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold"
                : "bg-slate-900/85 text-slate-200 border-slate-700/60 hover:text-white"
            }`}
            title="Tự động trình chiếu các chương (Auto-play Presentation Tour)"
          >
            {isAutoPlay ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">
              {isAutoPlay ? "Tạm dừng Tour" : "Trình chiếu tự động"}
            </span>
          </button>

          <Link
            href="/digital-twin"
            className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-white/90 hover:bg-white text-slate-900 shadow-lg transition-all flex items-center gap-1.5 border border-slate-200"
          >
            <Box className="h-3.5 w-3.5 text-teal-600" />
            <span className="hidden sm:inline">Không gian 3D tương tác</span>
          </Link>
        </div>
      </div>

      {/* Auto-Play Timeline Progress Bar */}
      {isAutoPlay && (
        <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden mt-3 max-w-xl mx-auto shadow-sm">
          <div
            className="h-full bg-gradient-to-r from-teal-400 to-amber-400 transition-all duration-200 ease-linear"
            style={{ width: `${autoPlayProgress}%` }}
          />
        </div>
      )}

      {/* Main Narrative Card: Floating Story Box (Bottom-Left or Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end mt-auto pt-6">
        <div className="lg:col-span-7 xl:col-span-6 pointer-events-auto">
          <div className="bg-slate-950/88 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden transition-all duration-300">
            {/* Ambient Top Glow Border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400" />

            {/* Chapter Tag & Badge */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="text-[11px] font-mono font-bold tracking-widest text-teal-400 uppercase bg-teal-950/60 px-3 py-1 rounded-full border border-teal-800/60">
                {activeChapter.tag}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {activeChapterIndex + 1} / {CHAPTERS_DATA.length}
              </span>
            </div>

            {/* Headline */}
            <h2 className="text-xl md:text-2xl font-extrabold text-white leading-tight mb-2">
              {activeChapter.headline}
            </h2>

            {/* Subhead */}
            <div className="text-xs md:text-sm font-semibold text-teal-300/90 mb-3 flex items-center gap-1.5">
              <span>{activeChapter.subhead}</span>
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-5">
              {activeChapter.description}
            </p>

            {/* Deep Clinical Evidence Box in Chapter 4 */}
            {activeChapter.evidenceDetails && (
              <div className="mb-5 p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-xs space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Cơ chế y học & căn cứ lâm sàng:</span>
                </div>
                <p className="text-slate-200 leading-relaxed">
                  {activeChapter.evidenceDetails.mechanism}
                </p>
                <div className="text-[11px] text-amber-200/90 font-medium">
                  {activeChapter.evidenceDetails.clinicalEvidence}
                </div>
                <div className="text-[10px] text-slate-400 font-mono border-t border-slate-800 pt-1.5">
                  Nguồn dẫn: {activeChapter.evidenceDetails.citation}
                </div>
              </div>
            )}

            {/* What-If Live Recovery Widget in Chapter 5 */}
            {activeChapter.key === "make-it-safer" && (
              <div className="mb-5 p-4 rounded-2xl bg-teal-950/70 border border-teal-500/40 text-xs flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                    Điểm số an toàn hồi phục tức thì
                  </div>
                  <div className="text-xl font-extrabold text-white mt-0.5">
                    28 ➔ <span className="text-emerald-400">100 / 100</span>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold text-xs">
                  +72 Điểm An Toàn
                </div>
              </div>
            )}

            {/* Chapter 6 Before / After Comparison Toggle */}
            {activeChapter.key === "compare-results" && (
              <div className="mb-5 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div className="text-xs font-bold text-slate-300">Chế độ hiển thị:</div>
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => onToggleComparison("BEFORE")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      comparisonMode === "BEFORE"
                        ? "bg-red-500/20 text-red-300 border border-red-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Hiện trạng (28 điểm)
                  </button>
                  <button
                    onClick={() => onToggleComparison("AFTER")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      comparisonMode === "AFTER"
                        ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sau cải tạo (100 điểm)
                  </button>
                </div>
              </div>
            )}

            {/* 3 Metrics Cards */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {activeChapter.metrics.map((m, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between"
                >
                  <span className="text-[10px] text-slate-400 font-medium truncate">
                    {m.label}
                  </span>
                  <div className="text-xs md:text-sm font-extrabold text-white mt-1">
                    {m.value}
                  </div>
                  {m.badge && (
                    <span className="text-[9px] font-mono text-teal-400 mt-1">
                      {m.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Action Bar: Prev, Next & Final CTAs */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
              <button
                onClick={onPrev}
                disabled={isFirst}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                  isFirst
                    ? "opacity-30 cursor-not-allowed border-slate-800 text-slate-600"
                    : "border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200"
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Trước</span>
              </button>

              {!isLast ? (
                <button
                  onClick={onNext}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2 font-extrabold ml-auto"
                >
                  <span>Chương tiếp theo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex items-center gap-2 ml-auto">
                  <Link
                    href="/reports"
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5 text-teal-400" />
                    <span>Xem báo cáo</span>
                  </Link>
                  <Link
                    href="/digital-twin"
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg flex items-center gap-1.5"
                  >
                    <span>Khám phá 3D</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Help Pill: Keyboard navigation guide */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 justify-end pointer-events-auto">
          <div className="bg-slate-950/70 backdrop-blur-md border border-slate-800/70 rounded-2xl px-4 py-2.5 text-[11px] text-slate-400 flex items-center gap-3">
            <span>Điều khiển bàn phím:</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-white text-[10px]">
              ↓ / →
            </span>
            <span>Tiếp theo</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-white text-[10px]">
              ↑ / ←
            </span>
            <span>Trước</span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-white text-[10px]">
              Space
            </span>
            <span>Tạm dừng</span>
          </div>
        </div>
      </div>
    </div>
  );
}

