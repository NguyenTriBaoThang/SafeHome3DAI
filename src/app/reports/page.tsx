"use client";

import React from "react";
import {
  FileText,
  Printer,
  Download,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Building,
  User,
  Calendar,
  BookOpen,
  Info,
} from "lucide-react";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

export default function ReportsPage() {
  const {
    getCurrentRoom,
    currentAssessment,
    baselineAssessments,
    comparison,
    rooms,
  } = useSimulationStore();

  const room = getCurrentRoom();
  const baseline = baselineAssessments[room.id];
  const findings = currentAssessment?.findings || [];
  const score = currentAssessment?.safetyScore || 70;

  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const reportData = {
      project: "SafeHome 3D AI — Chương trình an toàn nhà ở người cao tuổi",
      resident: "Bác Nam (75 tuổi) - Hà Nội",
      room: {
        id: room.id,
        name: room.name,
        dimensions: room.dimensions,
        lightingLevel: room.lightingLevel,
        isWet: room.isWet,
        isSlipResistant: room.isSlipResistant,
      },
      assessmentDate: new Date().toISOString(),
      safetyScore: score,
      findings: findings,
      comparison: comparison,
      references: CURATED_KNOWLEDGE_SOURCES,
      disclaimer:
        "Báo cáo mang tính chất giáo dục và hoạch định an toàn môi trường vật lý, không thay thế chẩn đoán y khoa.",
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Bao-Cao-An-Toan-SafeHome-${room.id}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-600" />
          <div>
            <h1 className="text-sm font-bold text-slate-800">
              Xuất Báo Cáo Thẩm Định &amp; Đề Xuất Cải Tạo An Toàn
            </h1>
            <p className="text-[11px] text-slate-500">
              Định dạng tối ưu hóa cho in ấn (Browser Print / Lưu file PDF) hoặc xuất dữ liệu JSON
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Download className="h-4 w-4" />
            <span>Xuất JSON</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition"
          >
            <Printer className="h-4 w-4" />
            <span>In / Lưu PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Document Container */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-md space-y-8 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 text-teal-700 font-black text-xl tracking-tight">
              <ShieldCheck className="h-7 w-7 text-teal-600" />
              <span>SafeHome 3D AI</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Báo Cáo Khảo Sát &amp; Đề Xuất Giảm Thiểu Nguy Cơ Té Ngã Cho Người Cao Tuổi
            </p>
          </div>

          <div className="text-right text-xs space-y-1 text-slate-500">
            <div>
              <strong>Mã báo cáo:</strong> RPT-{Date.now().toString().slice(-6)}
            </div>
            <div className="flex items-center gap-1 justify-end">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date().toLocaleDateString("vi-VN")}</span>
            </div>
          </div>
        </div>

        {/* Profile & Property Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
          <div className="space-y-1.5">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Thông tin đối tượng
            </div>
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
              <User className="h-3.5 w-3.5 text-teal-600" />
              <span>Bác Nam (75 tuổi) — Hà Nội</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Đặc điểm: Thoái hóa khớp gối độ 2, giảm thị lực ban đêm, thường dậy đi vệ sinh lúc 2h và 5h sáng.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Không gian khảo sát 3D
            </div>
            <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
              <Building className="h-3.5 w-3.5 text-teal-600" />
              <span>{room.name}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kích thước: {room.dimensions.width}m x {room.dimensions.length}m | Chiếu sáng: {room.lightingLevel} Lux | Sàn: {room.floorMaterial}
            </p>
          </div>
        </div>

        {/* Executive Score Summary */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-teal-50/70 border border-teal-100">
          <div>
            <div className="text-xs font-bold text-teal-900">
              Chỉ số an toàn môi trường hiện tại:
            </div>
            <p className="text-[11px] text-teal-700 mt-0.5">
              Đã đánh giá qua 8 quy tắc hình học không gian xác định.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-black text-teal-800 font-mono">
              {score} <span className="text-sm font-semibold text-teal-600">/ 100</span>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                score >= 80
                  ? "bg-emerald-100 text-emerald-800"
                  : score >= 60
                  ? "bg-amber-100 text-amber-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {score >= 80 ? "Đạt chuẩn an toàn" : score >= 60 ? "Cần cải thiện" : "Nguy cơ cao"}
            </span>
          </div>
        </div>

        {/* Hazard Findings Table */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Danh mục các điểm nguy cơ phát hiện ({findings.length})
          </h2>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3">Nguy cơ</th>
                  <th className="p-3">Mức ưu tiên</th>
                  <th className="p-3">Bằng chứng hình học</th>
                  <th className="p-3">Quy chuẩn áp dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {findings.length > 0 ? (
                  findings.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50">
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{f.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {f.description}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            f.severityCategory === "HIGH"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {f.severityCategory}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600">
                        {f.evidence.measuredValue}
                      </td>
                      <td className="p-3 text-[11px] text-teal-700 font-mono">
                        {f.detectionRuleId}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      Không có nguy cơ nào được ghi nhận. Không gian đạt tiêu chuẩn an toàn!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prioritized Actionable Recommendations */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            2. Đề xuất giải pháp cải tạo &amp; Chi phí ước tính
          </h2>

          <div className="space-y-3">
            {findings.map((f, i) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl border border-slate-200 bg-white space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-teal-800">
                    Giải pháp #{i + 1}: {f.title}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Ước tính:{" "}
                    {f.hazardType === "LOOSE_RUG"
                      ? "Dưới 100.000 VNĐ"
                      : f.hazardType === "CABLE_CROSSING"
                      ? "50.000 - 150.000 VNĐ"
                      : f.hazardType === "MISSING_GRAB_BAR"
                      ? "350.000 - 700.000 VNĐ"
                      : "100.000 - 300.000 VNĐ"}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {f.recommendationText}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* References */}
        <div className="space-y-2 pt-4 border-t border-slate-200 text-xs">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            3. Tài liệu đối chiếu chuyên môn (References)
          </h2>
          <ul className="list-disc list-inside text-[11px] text-slate-500 space-y-1">
            <li>Tổ chức Y tế Thế giới (WHO) — Step Safety: Global Report on Falls Prevention (2021)</li>
            <li>CDC Hoa Kỳ — STEADI: Check for Safety Home Fall Prevention Guidelines (2023)</li>
            <li>Bộ Y tế Việt Nam — Hướng dẫn phòng ngừa tai nạn thương tích ở người cao tuổi (2020)</li>
          </ul>
        </div>

        {/* Mandatory Educational & Medical Disclaimer */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed space-y-1">
          <div className="font-bold text-slate-700 flex items-center gap-1.5">
            <Info className="h-4 w-4 text-teal-600" />
            <span>Tuyên bố giới hạn &amp; Miễn trừ trách nhiệm y tế:</span>
          </div>
          <p>
            Báo cáo này được tự động xuất bởi hệ thống SafeHome 3D AI phục vụ cho mục đích hoạch định, giáo dục và hỗ trợ cải tạo môi trường sống vật lý. Báo cáo không cấu thành chẩn đoán y khoa, không thay thế cho việc thăm khám của bác sĩ chuyên khoa hoặc kiểm định kỹ thuật xây dựng tại hiện trường.
          </p>
        </div>
      </div>
    </div>
  );
}

