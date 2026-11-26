"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Box,
  Compass,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Home,
  CheckCircle2,
  FileText,
  Sliders,
  X,
  Camera,
  Upload,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { AiRoomScannerWizard } from "@/components/scanner/AiRoomScannerWizard";

interface SavedRoom {
  id: string;
  name: string;
  roomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM" | "DOLLHOUSE" | string;
  dimensions: { width: number; length: number; height: number };
  projectName: string;
  targetResident: string;
  objectsCount: number;
  lightingLevel: number;
  isWet?: boolean;
  isSlipResistant?: boolean;
  safetyScore: number | null;
  evidenceStatus?: "PHOTO_DRAFT";
  hazardsResolved: number;
  hazardsRemaining: number;
  totalHazards: number;
  updatedAt: string;
  isCustom: boolean;
}

export default function SimulationsArchivePage() {
  const router = useRouter();
  const { switchRoom } = useSimulationStore();

  const [savedRooms, setSavedRooms] = useState<SavedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for creating new room
  const [creationMode, setCreationMode] = useState<"AI_SCAN" | "PRESET_TEMPLATE">("AI_SCAN");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<"BEDROOM" | "BATHROOM" | "LIVING_ROOM">("BEDROOM");
  const [newWidth, setNewWidth] = useState(4.0);
  const [newLength, setNewLength] = useState(5.0);
  const [newHeight, setNewHeight] = useState(2.8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo Upload State
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoFile, setUploadedPhotoFile] = useState<File | null>(null);
  const [showScannerWizard, setShowScannerWizard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedPhotoFile(file);
    const url = URL.createObjectURL(file);
    setUploadedPhotoUrl(url);

    if (!newRoomName.trim()) {
      setNewRoomName("Không gian phòng (Từ ảnh chụp)");
    }
  };

  // Fetch all saved simulation rooms
  const fetchRooms = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/simulations");
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Không tải được danh sách phòng.");
      setSavedRooms(json.data);
    } catch (err) {
      console.error("Lỗi lấy danh sách phòng:", err);
      setError(err instanceof Error ? err.message : "Không tải được danh sách phòng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Handle open in 3D Digital Twin
  const handleOpenIn3D = async (roomId: string, destination = "/digital-twin") => {
    setError("");
    const target = savedRooms.find(r => r.id === roomId);
    if (target?.isCustom) {
      try {
        const response = await fetch(`/api/simulations/${encodeURIComponent(roomId)}`);
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error || "Không tải được bản dựng.");
        useSimulationStore.getState().loadReconstructedRoom(json.data);
        router.push(destination);
      } catch (err) { setError(err instanceof Error ? err.message : "Không tải được bản dựng."); }
      return;
    }
    switchRoom(roomId);
    router.push(destination);
  };

  // Handle Delete
  const handleDelete = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa phòng mô phỏng 3D này không?")) return;

    try {
      const res = await fetch(`/api/simulations/${roomId}`, { method: "DELETE" });
      if (res.ok) {
        setSavedRooms(savedRooms.filter((r) => r.id !== roomId));
        const state = useSimulationStore.getState();
        useSimulationStore.setState({ rooms: state.rooms.filter(r => r.id !== roomId), comparison: null, selectedObjectId: null });
        if (state.currentRoomId === roomId) useSimulationStore.getState().switchRoom("room-bedroom-01");
      } else throw new Error("Không xóa được phòng. Hãy thử lại.");
    } catch (err) {
      console.error("Lỗi xóa phòng:", err);
      setError(err instanceof Error ? err.message : "Không xóa được phòng.");
    }
  };

  // Handle Create New Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoomName.trim(),
          roomType: newRoomType,
          width: newWidth,
          length: newLength,
          height: newHeight,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewRoomName("");
        setUploadedPhotoUrl(null);
        setUploadedPhotoFile(null);
        fetchRooms();
      } else throw new Error("Không lưu được phòng. Hãy thử lại.");
    } catch (err) {
      console.error("Lỗi tạo phòng:", err);
      setError(err instanceof Error ? err.message : "Không lưu được phòng.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered rooms
  const filteredRooms = savedRooms.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const isDh = r.roomType === "DOLLHOUSE" || r.id.includes("dollhouse");
    const matchesType =
      filterType === "ALL" ||
      (filterType === "DOLLHOUSE" && isDh) ||
      (!isDh && r.roomType === filterType);
    return matchesSearch && matchesType;
  });

  const totalRooms = savedRooms.length;
  const scoredRooms = savedRooms.filter(r => r.safetyScore != null);
  const avgScore = scoredRooms.length ? Math.round(scoredRooms.reduce((sum, r) => sum + r.safetyScore!, 0) / scoredRooms.length) : null;
  const totalResolved = savedRooms.reduce((acc, r) => acc + r.hazardsResolved, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 text-rose-800">{error}<button onClick={fetchRooms} className="ml-3 underline">Tải lại</button></div>}
      {/* 1. Header & Quick Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
            <Box className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Kho Lưu Trữ Mô Phỏng 3D</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold uppercase">
                {totalRooms} Không Gian
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Tất cả các phòng mô phỏng 3D được người dùng khởi tạo, lưu trữ và sẵn sàng tiếp tục can thiệp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/workflow"
            className="min-h-11 sm:min-h-[auto] px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="h-4 w-4 text-teal-600" />
            <span>Chạy 7 Bước Mới</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="min-h-11 sm:min-h-[auto] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo Phòng 3D Mới</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-black text-slate-900">{totalRooms}</div>
            <div className="text-xs text-slate-500 font-medium">Tổng phòng 3D đã lưu</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-black text-emerald-600">{avgScore == null ? "Chưa đánh giá" : `${avgScore}/100`}</div>
            <div className="text-xs text-slate-500 font-medium">Điểm an toàn trung bình</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-black text-teal-700">{totalResolved} Nguy cơ</div>
            <div className="text-xs text-slate-500 font-medium">Đã được khắc phục trong mô phỏng</div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên phòng, dự án..."
            className="min-h-11 sm:min-h-[auto] w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [&>*]:shrink-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Loại phòng:
          </span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "DOLLHOUSE", label: "Bản sao Dollhouse" },
            { id: "BEDROOM", label: "Phòng ngủ" },
            { id: "BATHROOM", label: "Nhà vệ sinh" },
            { id: "LIVING_ROOM", label: "Phòng khách" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] px-3 py-1 rounded-xl text-xs font-semibold transition ${
                filterType === tab.id
                  ? "bg-teal-600 text-white shadow-xs font-bold"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Grid of Simulation Rooms */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Đang tải kho mô phỏng 3D...
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
          <Box className="h-10 w-10 text-slate-300 mx-auto" />
          <div className="text-sm font-bold text-slate-700">Chưa có phòng 3D phù hợp</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Không tìm thấy phòng nào phù hợp với từ khóa tìm kiếm. Bạn có thể tạo phòng mới hoặc bấm "Chạy 7 Bước AI" để khởi tạo.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="min-h-11 sm:min-h-[auto] px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
          >
            + Tạo phòng mới ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const isHighSafety = room.safetyScore != null && room.safetyScore >= 80;
            const isMedSafety = room.safetyScore != null && room.safetyScore >= 60;

            return (
              <div
                key={room.id}
                data-room-id={room.id}
                onClick={() => handleOpenIn3D(room.id)}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group hover:border-teal-300"
              >
                <div className="space-y-3">
                  {/* Top Bar: Room Type & Actions */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        room.id.includes("dollhouse") || room.roomType === "DOLLHOUSE"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : room.roomType === "BEDROOM"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : room.roomType === "BATHROOM"
                          ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {room.id.includes("dollhouse") || room.roomType === "DOLLHOUSE"
                        ? "✨ Bản sao Dollhouse 3D"
                        : room.roomType === "BEDROOM"
                        ? "Phòng ngủ"
                        : room.roomType === "BATHROOM"
                        ? "Nhà vệ sinh"
                        : "Phòng khách"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {room.isCustom && (
                        <button
                          onClick={(e) => handleDelete(room.id, e)}
                          aria-label="Xóa phòng này"
                          title="Xóa phòng này"
                          className="min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Room Title & Project */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 group-hover:text-teal-700 transition">
                      {room.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{room.projectName}</p>
                  </div>

                  {/* Visual Stats Row */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400">Kích thước: </span>
                      <strong className="text-slate-700">
                        {room.dimensions.length}m × {room.dimensions.width}m
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Đồ nội thất: </span>
                      <strong className="text-slate-700">{room.objectsCount} vật thể</strong>
                    </div>
                  </div>

                  {/* Safety Score Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-500">Chỉ số an toàn:</span>
                      <span
                        className={
                          isHighSafety
                            ? "text-emerald-600"
                            : isMedSafety
                            ? "text-amber-600"
                            : "text-rose-600"
                        }
                      >
                        {room.safetyScore == null ? "Chưa đánh giá" : `${room.safetyScore}/100`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isHighSafety
                            ? "bg-emerald-500"
                            : isMedSafety
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${room.safetyScore ?? 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Hazard Count Indicator */}
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>
                      Đã khắc phục: <strong className="text-emerald-600">{room.hazardsResolved}</strong>
                    </span>
                    <span>
                      Còn lại: <strong className="text-amber-600">{room.hazardsRemaining ?? "Chưa xác định"}</strong>
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    <span>Mở mô phỏng 3D</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleOpenIn3D(room.id, "/reports");
                    }}
                    className="min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[11px] flex items-center gap-1"
                    aria-label="Xem báo cáo an toàn"
                    title="Xem báo cáo an toàn"
                  >
                    <FileText className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Modal: Tạo phòng mô phỏng mới */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">Khởi Tạo Không Gian Mô Phỏng 3D</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chuyển đổi phương thức: AI Quét từ ảnh vs Phòng mẫu ví dụ có sẵn */}
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCreationMode("AI_SCAN")}
                className={`min-h-11 sm:min-h-[auto] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  creationMode === "AI_SCAN"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Quét từ ảnh chụp (AI)</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("PRESET_TEMPLATE")}
                className={`min-h-11 sm:min-h-[auto] py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  creationMode === "PRESET_TEMPLATE"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                <span>Phòng mẫu ví dụ có sẵn</span>
              </button>
            </div>

            {/* TAB 1: PHÂN TÍCH TỪ ẢNH CHỤP THỰC TẾ (AI) */}
            {creationMode === "AI_SCAN" ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên phòng:</label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Ví dụ: Phòng khách Bác Nam (Căn hộ 502)"
                    className="min-h-11 sm:min-h-[auto] w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Tải ảnh căn phòng thực tế */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Ảnh chụp căn phòng thực tế:
                    </label>
                    {uploadedPhotoUrl && (
                      <span className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Đã tải ảnh lên</span>
                      </span>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />

                  {!uploadedPhotoUrl ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/20 hover:bg-teal-50/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 text-center text-slate-600 hover:text-teal-700 group"
                    >
                      <div className="p-3 rounded-2xl bg-teal-100 text-teal-700 group-hover:scale-105 transition-transform">
                        <Camera className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-800 group-hover:text-teal-700">
                          Bấm để tải ảnh chụp phòng lên
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Hỗ trợ định dạng JPG, PNG hoặc WebP
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="min-h-11 sm:min-h-[auto] mt-1 px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-[11px] shadow-sm hover:bg-teal-700 transition flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        <span>Chọn ảnh từ máy</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden border border-teal-300 bg-slate-900 group">
                        <img
                          src={uploadedPhotoUrl}
                          alt="Ảnh phòng đã chọn"
                          className="w-full h-32 object-cover"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="min-h-11 sm:min-h-[auto] px-2.5 py-1 rounded-lg bg-white/95 text-slate-800 text-[11px] font-bold shadow hover:bg-white transition flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" />
                            <span>Đổi ảnh khác</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedPhotoUrl(null);
                              setUploadedPhotoFile(null);
                            }}
                            className="min-h-11 sm:min-h-[auto] px-2.5 py-1 rounded-lg bg-rose-600/90 text-white text-[11px] font-bold shadow hover:bg-rose-600 transition flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            <span>Gỡ bỏ</span>
                          </button>
                        </div>
                        <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-medium text-slate-200 flex items-center gap-1">
                          <ImageIcon className="h-3 w-3 text-teal-400" />
                          <span className="truncate max-w-[200px]">
                            {uploadedPhotoFile?.name || "Ảnh phòng chụp"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Banner giải thích minh bạch: Tránh hiểu lầm */}
                <div className="p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-teal-950 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Tự động phân tích từ ảnh:</strong> Trí tuệ nhân tạo sẽ quét nhận diện toàn bộ đồ nội thất, chướng ngại vật và bố cục không gian trực tiếp từ hình ảnh chụp thực tế để tái dựng phòng 3D (không áp đặt đồ nội thất mẫu định sẵn).
                  </div>
                </div>

                {/* Nút hành động */}
                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="min-h-11 sm:min-h-[auto] px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!uploadedPhotoUrl) {
                        fileInputRef.current?.click();
                        return;
                      }
                      setShowCreateModal(false);
                      setShowScannerWizard(true);
                    }}
                    className="min-h-11 sm:min-h-[auto] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>
                      {uploadedPhotoUrl ? "Bắt đầu AI quét & dựng 3D" : "Chọn ảnh để quét AI"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: KHỞI TẠO TỪ PHÒNG MẪU VÍ DỤ CÓ SẴN (PRESET TEMPLATE) */
              <form onSubmit={handleCreateRoom} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên phòng:</label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Ví dụ: Phòng ngủ mẫu (Thử nghiệm)"
                    className="min-h-11 sm:min-h-[auto] w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Chọn phòng mẫu ví dụ có sẵn (Template tham khảo):
                  </label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value as any)}
                    className="min-h-11 sm:min-h-[auto] w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="BEDROOM">
                      Ví dụ mẫu 1: Phòng ngủ tiêu chuẩn (Có sẵn giường, tab đầu giường, thảm lót)
                    </option>
                    <option value="BATHROOM">
                      Ví dụ mẫu 2: Nhà vệ sinh tiêu chuẩn (Có sẵn bồn cầu, khay tắm, thiếu thanh vịn)
                    </option>
                    <option value="LIVING_ROOM">
                      Ví dụ mẫu 3: Phòng khách tiêu chuẩn (Có sẵn sofa, bàn trà thấp, lối đi)
                    </option>
                  </select>
                </div>

                {/* Banner ghi chú phòng mẫu */}
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <strong>Phòng mẫu tham khảo:</strong> Chế độ này nạp sẵn một không gian mẫu định sẵn để bạn thử nghiệm các tính năng can thiệp & mô phỏng an toàn khi chưa có ảnh thực tế.
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Dài (m):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newLength}
                      onChange={(e) => setNewLength(parseFloat(e.target.value) || 5)}
                      className="min-h-11 sm:min-h-[auto] w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Rộng (m):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newWidth}
                      onChange={(e) => setNewWidth(parseFloat(e.target.value) || 4)}
                      className="min-h-11 sm:min-h-[auto] w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-600 mb-1">Cao (m):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newHeight}
                      onChange={(e) => setNewHeight(parseFloat(e.target.value) || 2.8)}
                      className="min-h-11 sm:min-h-[auto] w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="min-h-11 sm:min-h-[auto] px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="min-h-11 sm:min-h-[auto] px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20"
                  >
                    {isSubmitting ? "Đang tạo..." : "Khởi tạo phòng mẫu 3D"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* AI Room Scanner Modal */}
      {showScannerWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto">
          <div className="max-w-5xl w-full relative my-auto">
            <button
              onClick={() => setShowScannerWizard(false)}
              className="min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <X className="h-5 w-5" />
            </button>
            <AiRoomScannerWizard
              initialRoomName={newRoomName.trim() || undefined}
              initialPhotoUrl={uploadedPhotoUrl || undefined}
              onComplete={() => {
                setShowScannerWizard(false);
                fetchRooms();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

