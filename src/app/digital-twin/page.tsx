"use client";

import React, { useState } from "react";
import {
  Box,
  Layers,
  Save,
  RotateCcw,
  Sparkles,
  Home,
  CheckCircle,
  HelpCircle,
} from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import { ObjectInspector } from "@/components/simulator/ObjectInspector";
import { HazardFindingList } from "@/components/simulator/HazardFindingList";
import { useSimulationStore } from "@/stores/useSimulationStore";

export default function DigitalTwinPage() {
  const {
    rooms,
    currentRoomId,
    switchRoom,
    saveCurrentScenario,
    restoreBaseline,
    runSimulation,
  } = useSimulationStore();

  const [savedNotification, setSavedNotification] = useState(false);

  const handleSave = () => {
    saveCurrentScenario(
      `Cấu hình tùy chỉnh lúc ${new Date().toLocaleTimeString("vi-VN")}`,
      "Người dùng lưu lại vị trí đồ vật và thiết lập an toàn sau khi tinh chỉnh"
    );
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-teal-600" />
            <h1 className="text-sm font-bold text-slate-800">
              Bản sao số 3D (Digital Twin Workspace)
            </h1>
          </div>

          {/* Room tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => switchRoom(r.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  r.id === currentRoomId
                    ? "bg-white text-teal-700 shadow-sm font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Home className="h-3.5 w-3.5" />
                <span>{r.name.split("(")[0].trim()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {savedNotification && (
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-fade-in">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Đã lưu cấu hình 3D!</span>
            </div>
          )}

          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95"
            title="Lưu lại cấu hình phòng hiện tại vào danh sách kịch bản"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Lưu cấu hình</span>
          </button>

          <button
            onClick={restoreBaseline}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Khôi phục trạng thái ban đầu"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Khôi phục gốc</span>
          </button>
        </div>
      </div>

      {/* Main 3D Workspace & Side Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Center: 3D Canvas */}
        <div className="flex-1 p-3 relative">
          <RoomViewer />
        </div>

        {/* Right Side Inspection & Hazard List */}
        <div className="w-96 border-l border-slate-200 bg-slate-50 p-3 overflow-y-auto space-y-3 shrink-0 hidden md:block">
          <ObjectInspector />
          <HazardFindingList />
        </div>
      </div>
    </div>
  );
}

