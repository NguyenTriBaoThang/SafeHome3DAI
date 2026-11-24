"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  Info,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useSimulationStore } from "@/stores/useSimulationStore";

export default function AnalyticsPage() {
  const {
    rooms,
    currentRoomId,
    getCurrentRoom,
    baselineAssessments,
    currentAssessment,
    comparison,
    scenarioHistory,
  } = useSimulationStore();

  const currentRoom = getCurrentRoom();
  const baseline = baselineAssessments[currentRoom.id];

  const baselineCount = baseline?.findings.length || 0;
  const currentCount = currentAssessment?.findings.length || 0;
  const resolvedCount = comparison?.resolved.length || 0;
  const remainingCount = currentCount;
  const newCount = comparison?.newlyIntroduced.length || 0;

  // Comparison Bar Chart Data
  const beforeAfterData = [
    {
      category: "Nguy cơ cao (High)",
      "Hiện trạng gốc (Baseline)": baseline?.findings.filter((f) => f.severityCategory === "HIGH").length || 0,
      "Sau can thiệp (Current)": currentAssessment?.findings.filter((f) => f.severityCategory === "HIGH").length || 0,
    },
    {
      category: "Mức Trung bình (Med)",
      "Hiện trạng gốc (Baseline)": baseline?.findings.filter((f) => f.severityCategory === "MEDIUM").length || 0,
      "Sau can thiệp (Current)": currentAssessment?.findings.filter((f) => f.severityCategory === "MEDIUM").length || 0,
    },
    {
      category: "Mức Thấp (Low)",
      "Hiện trạng gốc (Baseline)": baseline?.findings.filter((f) => f.severityCategory === "LOW").length || 0,
      "Sau can thiệp (Current)": currentAssessment?.findings.filter((f) => f.severityCategory === "LOW").length || 0,
    },
  ];

  // Room Summary Data
  const roomComparisonData = useMemo(() => {
    return rooms.map((r) => {
      const base = baselineAssessments[r.id];
      return {
        room: r.name.split("(")[0].trim(),
        "Nguy cơ ban đầu": base?.findings.length || 0,
        "Điểm an toàn": base?.safetyScore ?? null,
      };
    });
  }, [rooms, baselineAssessments]);

  if (currentRoom.evidenceStatus === "PHOTO_DRAFT") return (
    <div className="p-6 space-y-4 text-slate-700">
      <h1 className="text-xl font-bold">Chưa thể đối sánh an toàn thực tế</h1>
      <p>Bản dựng ảnh chỉ ước lượng hình học. Cần khảo sát và đo tại nhà trước khi kết luận hiệu quả can thiệp.</p>
      <Link href="/ai-guided-survey" className="block text-teal-700 underline">Hoàn thành khảo sát tại nhà</Link>
      <Link href="/reports" className="block text-teal-700 underline">Mở báo cáo hiện có</Link>
    </div>
  );
  const beforeScore = baseline?.safetyScore ?? null, afterScore = currentAssessment?.safetyScore ?? null;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-teal-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Phân Tích Đối Sánh Trước &amp; Sau Can Thiệp
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Đánh giá hiệu quả loại bỏ nguy cơ môi trường qua các bước mô phỏng và cải tạo không gian
          </p>
        </div>

        <Link
          href="/reports"
          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 self-start md:self-auto"
        >
          <span>Xuất báo cáo chi tiết</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Resolved */}
        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Nguy cơ đã giải quyết</div>
            <div className="text-2xl font-black text-emerald-600">{resolvedCount} điểm</div>
            <div className="text-[10px] text-emerald-700 font-medium">Đã khắc phục thành công</div>
          </div>
        </div>

        {/* Remaining */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Nguy cơ còn tồn đọng</div>
            <div className="text-2xl font-black text-amber-600">{remainingCount} điểm</div>
            <div className="text-[10px] text-slate-500 font-medium">Cần hoàn thiện tiếp</div>
          </div>
        </div>

        {/* Newly introduced */}
        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Nguy cơ mới phát sinh</div>
            <div className="text-2xl font-black text-rose-600">{newCount} điểm</div>
            <div className="text-[10px] text-slate-500 font-medium">Do kê xê dịch vật dụng</div>
          </div>
        </div>

        {/* Score Delta */}
        <div className="p-4 rounded-2xl bg-white border border-teal-200 shadow-sm flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400">Chỉ số an toàn cải thiện</div>
            <div className="text-2xl font-black text-teal-700">
              {beforeScore == null || afterScore == null ? "Chưa đủ dữ liệu" : `+${Math.max(0, afterScore - beforeScore)}đ`}
            </div>
            <div className="text-[10px] text-teal-600 font-medium">
              {beforeScore == null || afterScore == null ? "Cần dữ kiện trước và sau can thiệp" : `Từ ${beforeScore} lên ${afterScore}đ`}
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Before vs After grouped Bar Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Đối sánh số lượng nguy cơ theo phân cấp (Trước vs Sau)
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Đơn vị: Điểm nguy cơ</span>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={beforeAfterData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Hiện trạng gốc (Baseline)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Sau can thiệp (Current)" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Overview Comparison */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Chỉ số các phòng chức năng
            </h3>
            <span className="text-[11px] font-medium text-slate-400">Hồ sơ nhà mẫu</span>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomComparisonData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                <XAxis dataKey="room" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Nguy cơ ban đầu" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Điểm an toàn" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Modification Log & Explanations */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
          Lịch sử can thiệp &amp; Tiến trình tối ưu môi trường sống
        </h3>

        <div className="space-y-3">
          {scenarioHistory.map((h, i) => (
            <div
              key={h.id}
              className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{h.name}</h4>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(h.timestamp).toLocaleString("vi-VN")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <span className="font-semibold text-slate-600">
                  {h.assessment.totalHazards} nguy cơ
                </span>
                <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-black">
                  {h.assessment.safetyScore} / 100 điểm
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-2xl bg-slate-100 text-[11px] text-slate-500 leading-normal flex items-start gap-2">
          <Info className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
          <span>
            <strong>Ghi chú chuyên môn:</strong> Điểm số an toàn là chỉ số đánh giá thực nghiệm (heuristic index) hỗ trợ định lượng việc tuân thủ các quy tắc thiết kế an toàn. Điểm số này không đồng nghĩa với xác suất lâm sàng loại bỏ hoàn toàn khả năng ngã của một cá nhân cụ thể.
          </span>
        </div>
      </div>
    </div>
  );
}

