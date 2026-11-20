"use client";
import React, { useMemo, useState } from "react";
import { CinematicScene } from "@/components/experience/CinematicScene";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { compareRooms } from "@/lib/experience/homeExperience";
import { useReducedMotion } from "framer-motion";

export function ComparisonViewer() {
  const store = useSimulationStore();
  const room = store.getCurrentRoom();
  const baseline = store.baselineRoomStates[room.id] || room;
  const comparison = useMemo(() => compareRooms(baseline, room), [baseline, room]);
  const [split, setSplit] = useState(50);
  const reducedMotion = Boolean(useReducedMotion());
  return <div className="relative h-full min-h-[500px] rounded-2xl overflow-hidden bg-stone-100">
    <CinematicScene room={room} baseline={baseline} mode="COMPARE" chapter={5} chapterProgress={0} followStory={false}
      lighting="STUDIO" quality="HIGH" reducedMotion={reducedMotion} showWalls={false} showPaths={false}
      selectedObjectId={null} selectedFindingKey={null} focus={null} resetKey={0} comparison={split}
      onSelectObject={(id) => store.selectObject(id)} onSelectFinding={() => {}} onSelectZone={() => {}} />
    <div className="absolute left-4 top-4 right-4 flex items-center justify-between gap-3 text-sm">
      <span className="rounded-lg bg-white/95 px-4 py-2 text-slate-700 shadow-sm">Trước: {comparison.before.score}/100</span>
      <button onClick={() => store.setCameraPreset("ISOMETRIC")} className="rounded-lg bg-white px-4 py-2 shadow-sm text-teal-800">Về Dollhouse</button>
      <span className="rounded-lg bg-white/95 px-4 py-2 text-teal-800 shadow-sm">Sau: {comparison.after.score}/100 · {comparison.delta >= 0 ? "+" : ""}{comparison.delta}</span>
    </div>
    <div className="absolute top-16 bottom-16 w-px bg-white shadow" style={{ left: split + "%" }} />
    <label className="absolute bottom-4 left-6 right-6 rounded-xl bg-white/95 px-4 py-3 text-sm text-slate-600 shadow-sm">
      Kéo để so sánh cùng góc nhìn · {comparison.resolved.length} nguy cơ đã giải quyết
      <input aria-label="So sánh kịch bản trước sau" type="range" min="5" max="95" value={split} onChange={(event) => setSplit(Number(event.target.value))} className="mt-2 w-full accent-teal-700" />
    </label>
  </div>;
}
