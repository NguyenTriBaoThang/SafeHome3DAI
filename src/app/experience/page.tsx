"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { CinematicScene } from "@/components/experience/CinematicScene";
import { ChapterOverlay } from "@/components/experience/ChapterOverlay";
import { CHAPTERS_DATA } from "@/components/experience/experienceData";

export default function ExperiencePage() {
  const [chapterIndex, setChapterIndex] = useState<number>(0);
  const [isAutoPlay, setIsAutoPlay] = useState<boolean>(false);
  const [autoPlayProgress, setAutoPlayProgress] = useState<number>(0);
  const [comparisonMode, setComparisonMode] = useState<"BEFORE" | "AFTER">("AFTER");

  const activeChapter = CHAPTERS_DATA[chapterIndex];
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleNext = useCallback(() => {
    setChapterIndex((prev) =>
      prev < CHAPTERS_DATA.length - 1 ? prev + 1 : 0
    );
    setAutoPlayProgress(0);
  }, []);

  const handlePrev = useCallback(() => {
    setChapterIndex((prev) => (prev > 0 ? prev - 1 : prev));
    setAutoPlayProgress(0);
  }, []);

  const handleSelectChapter = useCallback((index: number) => {
    setChapterIndex(index);
    setAutoPlayProgress(0);
  }, []);

  const handleToggleAutoPlay = useCallback(() => {
    setIsAutoPlay((prev) => !prev);
    setAutoPlayProgress(0);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === " ") {
        e.preventDefault();
        handleToggleAutoPlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev, handleToggleAutoPlay]);

  // Auto-play timer logic (8 seconds per chapter)
  useEffect(() => {
    if (!isAutoPlay) {
      setAutoPlayProgress(0);
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const durationMs = 8000;
    const intervalMs = 100;
    let elapsed = 0;

    progressIntervalRef.current = setInterval(() => {
      elapsed += intervalMs;
      setAutoPlayProgress(Math.min((elapsed / durationMs) * 100, 100));
    }, intervalMs);

    timerRef.current = setTimeout(() => {
      handleNext();
    }, durationMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isAutoPlay, chapterIndex, handleNext]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950 relative select-none">
      {/* 3D WebGL Canvas Layer */}
      <div className="w-full h-full absolute inset-0">
        <CinematicScene
          activeChapter={activeChapter}
          isComparisonActive={activeChapter.key === "compare-results"}
          comparisonMode={comparisonMode}
        />
      </div>

      {/* Floating Storytelling Overlay Layer */}
      <ChapterOverlay
        activeChapter={activeChapter}
        activeChapterIndex={chapterIndex}
        onSelectChapter={handleSelectChapter}
        onNext={handleNext}
        onPrev={handlePrev}
        isAutoPlay={isAutoPlay}
        onToggleAutoPlay={handleToggleAutoPlay}
        autoPlayProgress={autoPlayProgress}
        isComparisonActive={activeChapter.key === "compare-results"}
        comparisonMode={comparisonMode}
        onToggleComparison={setComparisonMode}
      />
    </div>
  );
}

