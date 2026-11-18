"use client";

import React, { useState } from "react";
import {
  Sliders,
  Play,
  RotateCcw,
  Save,
  CheckCircle,
  Layers,
  History,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import { ObjectInspector } from "@/components/simulator/ObjectInspector";
import { HazardFindingList } from "@/components/simulator/HazardFindingList";
import { ComparisonPanel } from "@/components/simulator/ComparisonPanel";
import { useSimulationStore } from "@/stores/useSimulationStore";

export default function ScenarioSimulatorPage() {
  const {
    rooms,
    currentRoomId,
    switchRoom,
    runSimulation,
    restoreBaseline,
    saveCurrentScenario,
    scenarioHistory,
    currentAssessment,
    comparison,
  } = useSimulationStore();

  const [scenarioNameInput, setScenarioNameInput] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);

  const handleSaveScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenarioNameInput.trim()) return;
    saveCurrentScenario(scenarioNameInput.trim());
    setScenarioNameInput("");
    setShowSaveModal(false);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100">
      {/* Simulation Header / Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-teal-600" />
            <h1 className="text-sm font-bold text-slate-800">
              Mô Phỏng Kịch Bản Can Thiệp (Scenario Simulator)
            </h1>
          </div>

          {/* Preset Scenario Quick Switches */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 hidden sm:flex">
            <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">
              Kịch bản mẫu:
            </span>
            <button
              onClick={() => switchRoom("room-photoreal-dollhouse-01")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                currentRoomId === "room-photoreal-dollhouse-01"
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ★ Dollhouse 3D
            </button>
            <button
              onClick={() => switchRoom("room-bedroom-01")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                currentRoomId === "room-bedroom-01"
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              1. Phòng ngủ đêm tối
            </button>
            <button
              onClick={() => switchRoom("room-bathroom-01")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                currentRoomId === "room-bathroom-01"
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              2. Phòng tắm sàn ướt
            </button>
            <button
              onClick={() => switchRoom("room-living-01")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                currentRoomId === "room-living-01"
                  ? "bg-white text-teal-700 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              3. Phòng khách lộn xộn
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => runSimulation()}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2 transition active:scale-95 animate-pulse"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Chạy mô phỏng</span>
          </button>

          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Save className="h-4 w-4" />
            <span>Lưu kịch bản</span>
          </button>

          <button
            onClick={restoreBaseline}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition"
            title="Khôi phục trạng thái ban đầu"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Environment Controls */}
        <div className="w-80 border-r border-slate-200 bg-white p-3 overflow-y-auto space-y-4 shrink-0 hidden md:block">
          <ObjectInspector />

          {/* Scenario Timeline History */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <History className="h-4 w-4 text-teal-600" />
              <span>Tiến trình kịch bản ({scenarioHistory.length})</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {scenarioHistory.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="p-2 rounded-xl bg-white border border-slate-200 text-xs space-y-0.5"
                >
                  <div className="flex items-center justify-between font-bold text-slate-800">
                    <span className="truncate">{entry.name}</span>
                    <span className="text-[10px] text-teal-600 font-mono">
                      {entry.assessment.safetyScore}đ
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(entry.timestamp).toLocaleTimeString("vi-VN")} • {entry.assessment.totalHazards} nguy cơ
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center: 3D Workspace + Bottom Comparison Panel */}
        <div className="flex-1 flex flex-col p-3 overflow-hidden gap-3">
          <div className="flex-1 min-h-[360px]">
            <RoomViewer />
          </div>

          <div className="shrink-0">
            <ComparisonPanel />
          </div>
        </div>

        {/* Right Side: Hazard Findings & Recommendations */}
        <div className="w-96 border-l border-slate-200 bg-slate-50 p-3 overflow-y-auto space-y-3 shrink-0 hidden xl:block">
          <HazardFindingList />
        </div>
      </div>

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Lưu kịch bản mô phỏng mới
            </h3>
            <p className="text-xs text-slate-500">
              Đặt tên mô tả cho phương án cải tạo này để đưa vào báo cáo và đối sánh phân tích.
            </p>
            <form onSubmit={handleSaveScenario} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={scenarioNameInput}
                onChange={(e) => setScenarioNameInput(e.target.value)}
                placeholder="VD: Phương án dán thảm & lắp 2 tay vịn"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!scenarioNameInput.trim()}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  Lưu kịch bản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

