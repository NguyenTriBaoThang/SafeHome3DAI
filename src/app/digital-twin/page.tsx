"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  Compass,
  Eye,
  ShieldAlert,
  ArrowRight,
  Info,
  Sliders,
  Check,
  Bot,
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
    focusOnLocation,
    setCameraPreset,
    toggleHazardOverlay,
    showHazardOverlay,
    currentAssessment,
    copilotPendingAction,
    executeCopilotAction,
    clearCopilotPendingAction,
  } = useSimulationStore();

  const [savedNotification, setSavedNotification] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showRevealIntro, setShowRevealIntro] = useState(true);
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [copilotToast, setCopilotToast] = useState<string | null>(null);

  // Handle Copilot 3D Bridge pending actions
  useEffect(() => {
    if (copilotPendingAction) {
      const res = executeCopilotAction(copilotPendingAction);
      if (res.success) {
        setCopilotToast(res.message);
        setShowRevealIntro(false);
        setTimeout(() => setCopilotToast(null), 4500);
      }
      clearCopilotPendingAction();
    }
  }, [copilotPendingAction, executeCopilotAction, clearCopilotPendingAction]);

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
  const zones = currentRoom.zones || [];
  const findings = currentAssessment?.findings || [];

  const handleSelectZone = (zoneId: string | null) => {
    setActiveZoneId(zoneId);
    if (!zoneId) {
      focusOnLocation(null);
      setCameraPreset("ISOMETRIC");
      return;
    }

    const zone = zones.find((z) => z.id === zoneId);
    if (zone) {
      const centerX = (zone.bounds.minX + zone.bounds.maxX) / 2;
      const centerZ = (zone.bounds.minZ + zone.bounds.maxZ) / 2;
      focusOnLocation([centerX, 0.6, centerZ]);
      setCameraPreset("INTERIOR");
    }
  };

  const activeZone = zones.find((z) => z.id === activeZoneId);
  const activeZoneObjects = activeZone
    ? currentRoom.objects.filter((obj) => {
        const [x, , z] = obj.position;
        return (
          x >= activeZone.bounds.minX - 0.2 &&
          x <= activeZone.bounds.maxX + 0.2 &&
          z >= activeZone.bounds.minZ - 0.2 &&
          z <= activeZone.bounds.maxZ + 0.2
        );
      })
    : [];

  const activeZoneHazards = activeZone
    ? findings.filter((f) =>
        activeZoneObjects.some((o) => o.id === f.targetObjectId)
      )
    : [];

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
                  onClick={() => {
                    switchRoom(r.id);
                    setActiveZoneId(null);
                  }}
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
            <Link
              href="/simulations"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-200/60 transition flex items-center gap-1 border border-dashed border-slate-300 ml-1"
              title="Quản lý toàn bộ các phòng trong Kho Mô Phỏng 3D"
            >
              <Layers className="h-3 w-3 text-teal-600" />
              <span>Kho 3D Hub ➔</span>
            </Link>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Flagship Cinematic Tour Route Button */}
          <Link
            href="/experience"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 via-sky-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition active:scale-95 border border-teal-400/30"
            title="Mở hành trình trải nghiệm 3D Cinematic Storytelling tương tác toàn màn hình"
          >
            <Compass className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
            <span>🎬 Trải Nghiệm Tour Cinematic</span>
          </Link>

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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Center: 3D Canvas */}
        <div className="flex-1 p-3 relative flex flex-col">
          {/* Zone Navigation Pills for Multi-Zone Rooms (Scene 3 - Room Exploration) */}
          {zones.length > 0 && (
            <div className="mb-2 flex items-center gap-1.5 overflow-x-auto py-1 px-1 shrink-0 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 px-2 shrink-0 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-teal-600" />
                <span>Khu vực khám phá:</span>
              </span>
              <button
                onClick={() => handleSelectZone(null)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                  activeZoneId === null
                    ? "bg-teal-600 text-white font-bold shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                Toàn cảnh ngôi nhà
              </button>
              {zones.map((z) => {
                const isActive = activeZoneId === z.id;
                return (
                  <button
                    key={z.id}
                    onClick={() => handleSelectZone(z.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? "bg-teal-600 text-white font-bold shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    <span>{z.name.split("(")[0].trim()}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* 3D Canvas Container */}
          <div className="flex-1 relative rounded-2xl overflow-hidden">
            <RoomViewer />

            {/* Copilot 3D Bridge Toast Notification */}
            {copilotToast && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-teal-950/90 backdrop-blur-md text-white text-xs font-bold px-4 py-2.5 rounded-2xl border border-teal-400 shadow-2xl flex items-center gap-2 animate-bounce">
                <Bot className="h-4 w-4 text-amber-300 shrink-0 animate-pulse" />
                <span>{copilotToast}</span>
              </div>
            )}

            {/* Scene 1 — The Home Reveal Banner / Modal (Dismissible, with 3 Hero Actions) */}
            {showRevealIntro && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-xl bg-slate-950/85 backdrop-blur-md rounded-2xl border border-slate-700/80 p-4 shadow-2xl text-white animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-teal-400">
                      Bản sao số 3D • SafeHome Experience
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      Khám phá Bản sao số & Nhận diện rủi ro té ngã
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Quan sát ngôi nhà 3D đa góc nhìn, phát hiện vật thể gây nguy cơ và mô phỏng can thiệp an toàn theo chuẩn y khoa.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowRevealIntro(false)}
                    className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0"
                    title="Bỏ qua giới thiệu (Skip Intro)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* 3 Hero Action Buttons */}
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        focusOnLocation(null);
                        setCameraPreset("ISOMETRIC");
                        setShowRevealIntro(false);
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Khám phá ngôi nhà</span>
                    </button>
                    <button
                      onClick={() => {
                        if (!showHazardOverlay) toggleHazardOverlay();
                        setCameraPreset("SAFETY");
                        setShowRevealIntro(false);
                      }}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-sm active:scale-95 flex items-center gap-1.5"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>Xem nguy cơ</span>
                    </button>
                    <Link
                      href="/workflow"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
                    >
                      <span>Bắt đầu đánh giá</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <button
                    onClick={() => setShowRevealIntro(false)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 underline font-medium"
                  >
                    Bỏ qua giới thiệu
                  </button>
                </div>
              </div>
            )}

            {/* Contextual Room Exploration Panel (Scene 3) */}
            {activeZone && (
              <div className="absolute bottom-14 left-4 z-20 w-80 bg-slate-950/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3.5 shadow-2xl text-white animate-fade-in space-y-2.5">
                <div className="flex items-start justify-between pb-2 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                      Chi tiết phân vùng 3D
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">
                      {activeZone.name}
                    </h4>
                  </div>
                  <button
                    onClick={() => handleSelectZone(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Sàn & Vật liệu</span>
                    <span className="font-semibold text-slate-200 capitalize">
                      {activeZone.floorType === "wood" ? "Gỗ chống ẩm" : "Gạch chống trượt"}
                    </span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Vật thể trong vùng</span>
                    <span className="font-semibold text-teal-400">
                      {activeZoneObjects.length} đồ nội thất
                    </span>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Nguy cơ phát hiện:</span>
                    <span className={`font-bold ${activeZoneHazards.length > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {activeZoneHazards.length > 0 ? `${activeZoneHazards.length} điểm cần xử lý` : "An toàn đạt chuẩn"}
                    </span>
                  </div>
                  {activeZoneHazards.map((h) => (
                    <div key={h.id} className="text-[11px] text-rose-300 bg-rose-950/40 border border-rose-800/40 px-2 py-1 rounded-lg">
                      • {h.title}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Tiêu chuẩn: WHO 2021 & CDC STEADI</span>
                  <button
                    onClick={() => {
                      focusOnLocation(null);
                      setCameraPreset("ISOMETRIC");
                    }}
                    className="text-[11px] font-bold text-teal-400 hover:text-teal-300"
                  >
                    Về toàn cảnh
                  </button>
                </div>
              </div>
            )}
          </div>
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
