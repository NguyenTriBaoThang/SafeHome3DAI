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
  Image as ImageIcon,
  X,
  Maximize2,
  Camera,
} from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import { ObjectInspector } from "@/components/simulator/ObjectInspector";
import { HazardFindingList } from "@/components/simulator/HazardFindingList";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { AiRoomScannerWizard } from "@/components/scanner/AiRoomScannerWizard";

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
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const handleSave = () => {
    saveCurrentScenario(
      `Cấu hình tùy chỉnh lúc ${new Date().toLocaleTimeString("vi-VN")}`,
      "Người dùng lưu lại vị trí đồ vật và thiết lập an toàn sau khi tinh chỉnh"
    );
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0];
  const isDollhouse = currentRoom.layoutType === "DOLLHOUSE_MULTI_ZONE";

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-slate-100">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 border border-teal-200">
              <Box className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>Bản sao số 3D (Digital Twin Workspace)</span>
                {isDollhouse && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Dollhouse Photoreal</span>
                  </span>
                )}
              </h1>
            </div>
          </div>

          {/* Room tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 flex-wrap gap-1">
            {rooms.map((r) => {
              const isSelected = r.id === currentRoomId;
              const isDh = r.layoutType === "DOLLHOUSE_MULTI_ZONE";
              return (
                <button
                  key={r.id}
                  onClick={() => switchRoom(r.id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-white text-teal-700 shadow-sm font-bold border border-slate-200/60"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>
                    {isDh ? "★ Dollhouse (Ảnh mẫu)" : r.name.split("(")[0].trim()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* AI Room Scanner Button */}
          <button
            onClick={() => setShowScannerModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
            title="Quét ảnh phòng thực tế để tự động nhận diện và dựng mô hình 3D"
          >
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            <span>AI Room Scanner</span>
          </button>

          {/* Reference Image Button */}
          <button
            onClick={() => setShowReferenceModal(true)}
            className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-800 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Mở ảnh kiến trúc tham chiếu để so sánh đối chiếu với mô hình 3D"
          >
            <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
            <span className="hidden sm:inline">Đối chiếu ảnh mẫu</span>
          </button>

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
            <span className="hidden sm:inline">Khôi phục gốc</span>
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

      {/* Reference Image Comparison Modal */}
      {showReferenceModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-4 space-y-4 shadow-2xl animate-fade-in text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Ảnh kiến trúc tham chiếu (Visual Reference Comparison)
                </h3>
              </div>
              <button
                onClick={() => setShowReferenceModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
              <img
                src="/reference/reference_room.jpg"
                alt="Ảnh kiến trúc tham chiếu Dollhouse 3D"
                className="max-h-[70vh] object-contain w-full"
              />
            </div>

            <div className="text-xs text-slate-300 flex items-center justify-between">
              <span>
                Bố cục đối chiếu: Phòng ngủ (Trái) — Khu thay đồ mở (Giữa) —
                Phòng tắm vách kính (Phải).
              </span>
              <button
                onClick={() => setShowReferenceModal(false)}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition"
              >
                Quay lại không gian 3D
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Room Scanner Wizard Modal */}
      {showScannerModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="max-w-5xl w-full relative my-auto">
            <button
              onClick={() => setShowScannerModal(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <AiRoomScannerWizard
              onComplete={() => {
                setShowScannerModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
