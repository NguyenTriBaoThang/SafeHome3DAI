"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Home,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Box,
  Bot,
  Sliders,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { RoomViewer } from "@/components/three/RoomViewer";

const CATEGORY_COLORS: Record<string, string> = {
  LOOSE_RUG: "#ef4444",
  CABLE_CROSSING: "#f97316",
  POOR_LIGHTING: "#eab308",
  WET_FLOOR: "#06b6d4",
  MISSING_GRAB_BAR: "#8b5cf6",
  OBSTACLE_ROUTE: "#ec4899",
  CLUTTERED_PATH: "#64748b",
  DANGEROUS_OBJECT_PLACEMENT: "#f43f5e",
};

const CATEGORY_NAMES: Record<string, string> = {
  LOOSE_RUG: "Thảm trơn trượt",
  CABLE_CROSSING: "Dây điện chắn lối",
  POOR_LIGHTING: "Thiếu ánh sáng",
  WET_FLOOR: "Sàn ướt trơn",
  MISSING_GRAB_BAR: "Thiếu thanh vịn",
  OBSTACLE_ROUTE: "Vật cản lối đi",
  CLUTTERED_PATH: "Đồ đạc bừa bộn",
  DANGEROUS_OBJECT_PLACEMENT: "Góc nhọn sát giường",
};

export default function DashboardPage() {
  const {
    rooms,
    currentRoomId,
    getCurrentRoom,
    currentAssessment,
    baselineAssessments,
    scenarioHistory,
    switchRoom,
    comparison,
  } = useSimulationStore();

  const currentRoom = getCurrentRoom();
  const currentFindings = currentAssessment?.findings || [];
  const safetyScore = currentAssessment?.safetyScore || 70;

  // Donut chart: Hazard breakdown by category
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of currentFindings) {
      counts[f.hazardType] = (counts[f.hazardType] || 0) + 1;
    }
    return Object.entries(counts).map(([type, value]) => ({
      name: CATEGORY_NAMES[type] || type,
      value,
      color: CATEGORY_COLORS[type] || "#3b82f6",
    }));
  }, [currentFindings]);

  // Bar chart: Hazards across all configured rooms
  const roomHazardsData = useMemo(() => {
    return rooms.map((r) => {
      const base = baselineAssessments[r.id];
      const count = base ? base.findings.length : 0;
      return {
        room: r.name.split("(")[0].trim(),
        hazards: count,
      };
    });
  }, [rooms, baselineAssessments]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner with Demo Data Notice */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-teal-700 to-sky-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-teal-100">
            <span className="h-2 w-2 rounded-full bg-teal-300 animate-pulse" />
            <span>Mô phỏng mẫu (Synthetic Demo Dataset) — Bộ Y tế &amp; CDC STEADI</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">
            SafeHome 3D AI — Tổng quan An toàn Môi trường
          </h1>
          <p className="text-xs sm:text-sm text-teal-100 max-w-2xl leading-relaxed">
            Hệ sinh thái Digital Twin kết hợp AI giải trình giúp gia đình phát hiện, phân tích và chủ động cải tạo các nguy cơ gây té ngã cho người cao tuổi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <Link
            href="/digital-twin"
            className="px-4 py-2.5 rounded-xl bg-white text-teal-800 font-bold text-xs shadow-md hover:bg-teal-50 transition flex items-center gap-1.5"
          >
            <Box className="h-4 w-4" />
            <span>Khám phá 3D</span>
          </Link>
          <Link
            href="/scenario-simulator"
            className="px-4 py-2.5 rounded-xl bg-teal-600/80 hover:bg-teal-600 text-white font-bold text-xs backdrop-blur-md transition flex items-center gap-1.5 border border-white/20"
          >
            <Sliders className="h-4 w-4" />
            <span>Chạy kịch bản</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Rooms */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Home className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Không gian thiết lập</div>
            <div className="text-xl font-black text-slate-800">{rooms.length} phòng</div>
            <div className="text-[10px] text-teal-600 font-medium">Đang xem: {currentRoom.name.split("(")[0]}</div>
          </div>
        </div>

        {/* Card 2: Current Hazards */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Nguy cơ phát hiện</div>
            <div className="text-xl font-black text-slate-800">{currentFindings.length} điểm</div>
            <div className="text-[10px] text-rose-600 font-medium">
              {currentFindings.filter((f) => f.severityCategory === "HIGH").length} mức ưu tiên cao
            </div>
          </div>
        </div>

        {/* Card 3: Safety Score */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Chỉ số an toàn (0-100)</div>
            <div className="text-xl font-black text-slate-800">{safetyScore} / 100</div>
            <div className="text-[10px] text-slate-500 font-medium">Chỉ số ước lượng giáo dục</div>
          </div>
        </div>

        {/* Card 4: Modifications & Scenarios */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Kịch bản đã lưu</div>
            <div className="text-xl font-black text-slate-800">{scenarioHistory.length} kịch bản</div>
            <div className="text-[10px] text-amber-600 font-medium">
              Đã khắc phục: {comparison ? comparison.resolved.length : 0} nguy cơ
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive 3D Preview + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 3D Simulation Quick View */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-teal-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Mô phỏng 3D Digital Twin trực quan
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tương tác xoay, zoom, nhấp chọn đồ vật và xem vị trí nguy cơ trực tiếp trong không gian
                </p>
              </div>
            </div>

            <Link
              href="/digital-twin"
              className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>Mở rộng</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="h-[380px] rounded-2xl overflow-hidden border border-slate-100">
            <RoomViewer />
          </div>
        </div>

        {/* Right Col: Charts & Category Distribution */}
        <div className="space-y-6">
          {/* Donut Chart: Hazard by Category */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Phân loại nguy cơ hiện tại
            </h3>
            {categoryData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Không có nguy cơ nào trong phòng hiện tại.
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
              {categoryData.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span>{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{cat.value} điểm</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar Chart: Hazards by Room */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Mật độ nguy cơ theo phòng
            </h3>
            <div className="h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomHazardsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="room" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="hazards" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: AI Recommendations & Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority AI Recommendations */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-teal-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Khuyến nghị ưu tiên từ AI RAG
              </h3>
            </div>
            <Link
              href="/ai-assistant"
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>Hỏi trợ lý</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {currentFindings.slice(0, 3).map((f, i) => (
              <div
                key={f.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3"
              >
                <div className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 font-bold text-xs flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{f.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">{f.recommendationText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System & Resident Safety Profile */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-sky-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Hồ sơ người cao tuổi &amp; Chuẩn tham chiếu
            </h3>
          </div>

          <div className="p-3 rounded-2xl bg-sky-50/60 border border-sky-100 text-xs text-slate-700 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Đối tượng:</span>
              <span className="font-bold">Bác Nam (75 tuổi)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Đặc điểm vận động:</span>
              <span className="font-medium">Thoái hóa khớp gối, bước chân lê</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thị lực:</span>
              <span className="font-medium">Giảm thích ứng bóng tối, cần tối thiểu 150 Lux</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bộ tiêu chuẩn áp dụng:</span>
              <span className="font-medium">CDC STEADI, WHO Step Safety, Bộ Y tế VN</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            * Hệ thống phân tích không gian dựa trên mô hình hình học 3D thời gian thực và các quy tắc chuyên môn đã được xác thực.
          </p>
        </div>
      </div>
    </div>
  );
}

