"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";

interface SavedRoom {
  id: string;
  name: string;
  roomType: "BEDROOM" | "BATHROOM" | "LIVING_ROOM";
  dimensions: { width: number; length: number; height: number };
  projectName: string;
  targetResident: string;
  objectsCount: number;
  lightingLevel: number;
  isWet?: boolean;
  isSlipResistant?: boolean;
  safetyScore: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State for creating new room
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomType, setNewRoomType] = useState<"BEDROOM" | "BATHROOM" | "LIVING_ROOM">("BEDROOM");
  const [newWidth, setNewWidth] = useState(4.0);
  const [newLength, setNewLength] = useState(5.0);
  const [newHeight, setNewHeight] = useState(2.8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all saved simulation rooms
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/simulations");
      const json = await res.json();
      if (json.success && json.data) {
        setSavedRooms(json.data);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách phòng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // Handle open in 3D Digital Twin
  const handleOpenIn3D = (roomId: string) => {
    switchRoom(roomId);
    router.push("/digital-twin");
  };

  // Handle Delete
  const handleDelete = async (roomId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xóa phòng mô phỏng 3D này không?")) return;

    try {
      const res = await fetch(`/api/simulations/${roomId}`, { method: "DELETE" });
      if (res.ok) {
        setSavedRooms(savedRooms.filter((r) => r.id !== roomId));
      }
    } catch (err) {
      console.error("Lỗi xóa phòng:", err);
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
        fetchRooms();
      }
    } catch (err) {
      console.error("Lỗi tạo phòng:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered rooms
  const filteredRooms = savedRooms.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.projectName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "ALL" || r.roomType === filterType;
    return matchesSearch && matchesType;
  });

  const totalRooms = savedRooms.length;
  const avgScore =
    totalRooms > 0
      ? Math.round(savedRooms.reduce((acc, r) => acc + r.safetyScore, 0) / totalRooms)
      : 70;
  const totalResolved = savedRooms.reduce((acc, r) => acc + r.hazardsResolved, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
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
            className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Compass className="h-4 w-4 text-teal-600" />
            <span>Chạy 7 Bước Mới</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition active:scale-95"
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
            <div className="text-lg font-black text-emerald-600">{avgScore}/100</div>
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
            className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Loại phòng:
          </span>
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "BEDROOM", label: "Phòng ngủ" },
            { id: "BATHROOM", label: "Nhà vệ sinh" },
            { id: "LIVING_ROOM", label: "Phòng khách" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
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
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs"
          >
            + Tạo phòng mới ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRooms.map((room) => {
            const isHighSafety = room.safetyScore >= 80;
            const isMedSafety = room.safetyScore >= 60;

            return (
              <div
                key={room.id}
                onClick={() => handleOpenIn3D(room.id)}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between cursor-pointer group hover:border-teal-300"
              >
                <div className="space-y-3">
                  {/* Top Bar: Room Type & Actions */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        room.roomType === "BEDROOM"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : room.roomType === "BATHROOM"
                          ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {room.roomType === "BEDROOM"
                        ? "Phòng ngủ"
                        : room.roomType === "BATHROOM"
                        ? "Nhà vệ sinh"
                        : "Phòng khách"}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {room.isCustom && (
                        <button
                          onClick={(e) => handleDelete(room.id, e)}
                          title="Xóa phòng này"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
                        {room.safetyScore}/100
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
                        style={{ width: `${room.safetyScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Hazard Count Indicator */}
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>
                      Đã khắc phục: <strong className="text-emerald-600">{room.hazardsResolved}</strong>
                    </span>
                    <span>
                      Còn lại: <strong className="text-amber-600">{room.hazardsRemaining}</strong>
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
                      router.push("/reports");
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-[11px] flex items-center gap-1"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-900">Khởi Tạo Phòng Mô Phỏng 3D Mới</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên phòng:</label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ví dụ: Phòng ngủ Bác Nam (Tầng 2)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại phòng:</label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="BEDROOM">Phòng ngủ (Có giường, tab, thảm)</option>
                  <option value="BATHROOM">Nhà vệ sinh (Có bồn cầu, khay tắm)</option>
                  <option value="LIVING_ROOM">Phòng khách (Có sofa, bàn trà)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Dài (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newLength}
                    onChange={(e) => setNewLength(parseFloat(e.target.value) || 5)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Rộng (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newWidth}
                    onChange={(e) => setNewWidth(parseFloat(e.target.value) || 4)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Cao (m):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newHeight}
                    onChange={(e) => setNewHeight(parseFloat(e.target.value) || 2.8)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md shadow-teal-600/20"
                >
                  {isSubmitting ? "Đang tạo..." : "Khởi tạo 3D"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

