"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Eye,
  BookOpen,
  Info,
  Wrench,
  GitCompare,
  Download,
  Share2,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText,
  X,
  Printer,
  Compass,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { explainHazardFinding, FindingExplanation } from "@/lib/risk/explanationEngine";
import { compareAssessments } from "@/lib/risk/comparisonEngine";
import { generateAssessmentReport } from "@/lib/risk/assessmentManager";
import {
  AssessmentSnapshot,
  RiskFinding,
  BeforeAfterComparisonResult,
  FindingPriority,
} from "@/lib/risk/types";

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "#e11d48",   // rose-600
  MEDIUM: "#d97706", // amber-600
  LOW: "#0d9488",    // teal-600
  UNKNOWN: "#64748b", // slate-500
};

export default function RiskAssessmentDashboardPage() {
  const room = useSimulationStore(state => state.rooms.find(r => r.id === state.currentRoomId) || state.rooms[0]);
  if (room.evidenceStatus === "PHOTO_DRAFT") return (
    <div className="p-6 space-y-4" data-testid="risk-photo-draft">
      <h1 className="text-xl font-bold">Chưa đủ dữ liệu đánh giá nguy cơ</h1>
      <p>Bản dựng ảnh chỉ ước lượng hình học. Cần khảo sát và xác minh thực trạng trước khi tính điểm hoặc so sánh can thiệp.</p>
      <Link href="/ai-guided-survey" className="text-teal-700 underline">Bổ sung khảo sát thực tế</Link>
    </div>
  );
  return <SimulationRiskDashboard key={room.id} />;
}

function SimulationRiskDashboard() {
  const {
    rooms,
    currentRoomId,
    getCurrentRoom,
    switchRoom,
    fixObject,
    focusOnLocation,
  } = useSimulationStore();

  const currentRoom = getCurrentRoom();

  // Evaluated Snapshot from pure deterministic rule engine
  const [snapshot, setSnapshot] = useState<AssessmentSnapshot>(() =>
    evaluateRoomHazards(currentRoom)
  );

  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [selectedFindingForAi, setSelectedFindingForAi] = useState<RiskFinding | null>(null);
  const [aiExplanation, setAiExplanation] = useState<FindingExplanation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Before/After comparison modal state
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<BeforeAfterComparisonResult | null>(null);

  // Report export modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);

  // When room changes or user triggers re-assessment
  const handleReassess = (roomToEvaluate = currentRoom) => {
    const newSnapshot = evaluateRoomHazards(roomToEvaluate);
    setSnapshot(newSnapshot);
  };

  const handleRoomSwitch = (roomId: string) => {
    switchRoom(roomId);
    const targetRoom = rooms.find((r) => r.id === roomId) || currentRoom;
    handleReassess(targetRoom);
  };

  // Open AI RAG explanation modal
  const handleExplainFinding = (finding: RiskFinding) => {
    setSelectedFindingForAi(finding);
    setIsAiLoading(true);
    try {
      const explanation = explainHazardFinding(finding);
      setAiExplanation(explanation);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Open Before/After comparison
  const handleOpenComparison = () => {
    // Generate an improved intervention room to compare
    const baselineSnapshot = snapshot;

    // Simulate an improved intervention state:
    // e.g. thảm được cố định, dây điện được nẹp, thảm chống trượt được đặt, đèn ngủ được bật
    const interventionInput = JSON.parse(JSON.stringify(snapshot.input));
    if (interventionInput.rugs?.items) {
      interventionInput.rugs.items.forEach((r: any) => {
        r.isSecured = true;
        r.edgesCurled = false;
      });
    }
    if (interventionInput.cables) {
      interventionInput.cables.crossingWalkway = false;
      interventionInput.cables.items.forEach((c: any) => {
        c.hasCordCover = true;
      });
    }
    if (interventionInput.lighting) {
      interventionInput.lighting.nightLightPresent = true;
      interventionInput.lighting.nighttimeLux = 110;
      interventionInput.lighting.pathLightToBathroom = true;
    }
    if (interventionInput.floor) {
      interventionInput.floor.isSlipResistant = true;
      interventionInput.floor.hasNonSlipMat = true;
    }
    if (interventionInput.grabBars) {
      interventionInput.grabBars.count = 2;
      interventionInput.grabBars.toiletGrabBarPresent = true;
      interventionInput.grabBars.showerGrabBarPresent = true;
    }
    if (interventionInput.obstacles) {
      interventionInput.obstacles.walkwayClearWidthM = 0.95;
      interventionInput.obstacles.present = false;
    }

    const interventionSnapshot = evaluateRoomHazards(interventionInput);
    interventionSnapshot.snapshotType = "INTERVENTION";

    const comp = compareAssessments(baselineSnapshot, interventionSnapshot);
    setComparisonResult(comp);
    setComparisonModalOpen(true);
  };

  // Filtered findings list
  const filteredFindings = useMemo(() => {
    if (filterSeverity === "ALL") return snapshot.findings;
    return snapshot.findings.filter((f) => f.severityCategory === filterSeverity);
  }, [snapshot, filterSeverity]);

  // Data for Charts
  const priorityChartData = useMemo(() => {
    return [
      { name: "Ưu tiên Cao", value: snapshot.highPriorityCount, key: "HIGH" },
      { name: "Ưu tiên Vừa", value: snapshot.mediumPriorityCount, key: "MEDIUM" },
      { name: "Ưu tiên Thấp", value: snapshot.lowPriorityCount, key: "LOW" },
      { name: "Cần xác minh", value: snapshot.needsVerificationCount, key: "UNKNOWN" },
    ].filter((d) => d.value > 0);
  }, [snapshot]);

  const categoryBarData = useMemo(() => {
    const catMap: Record<string, number> = {
      "Thảm sàn": 0,
      "Dây điện": 0,
      "Lối đi": 0,
      "Chiếu sáng": 0,
      "Sàn ướt": 0,
      "Tay vịn": 0,
      "Gờ bậc": 0,
      "Tầm với": 0,
    };

    snapshot.findings.forEach((f) => {
      if (f.ruleId === "RISK-001") catMap["Thảm sàn"]++;
      else if (f.ruleId === "RISK-002") catMap["Dây điện"]++;
      else if (f.ruleId === "RISK-003") catMap["Lối đi"]++;
      else if (f.ruleId === "RISK-004") catMap["Chiếu sáng"]++;
      else if (f.ruleId === "RISK-005") catMap["Sàn ướt"]++;
      else if (f.ruleId === "RISK-006") catMap["Tay vịn"]++;
      else if (f.ruleId === "RISK-007") catMap["Gờ bậc"]++;
      else if (f.ruleId === "RISK-008") catMap["Tầm với"]++;
    });

    return Object.entries(catMap).map(([name, count]) => ({
      name,
      "Số mối nguy": count,
    }));
  }, [snapshot]);

  const scoreColor =
    snapshot.safetyScore >= 80
      ? "text-teal-600"
      : snapshot.safetyScore >= 60
      ? "text-amber-600"
      : "text-rose-600";

  const scoreBadgeBg =
    snapshot.safetyScore >= 80
      ? "bg-teal-50 border-teal-200 text-teal-700"
      : snapshot.safetyScore >= 60
      ? "bg-amber-50 border-amber-200 text-amber-700"
      : "bg-rose-50 border-rose-200 text-rose-700";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  SafeHome Risk Intelligence
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                  Version 1.0.0
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Động cơ đánh giá và giải thích mối nguy môi trường nhà ở theo tiêu chuẩn WHO 2021 &amp; CDC STEADI
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Room Switcher */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs">
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => handleRoomSwitch(r.id)}
                className={`min-h-11 sm:min-h-[auto] px-3 py-1.5 rounded-lg font-bold transition ${
                  currentRoom.id === r.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {r.name.split("(")[0].trim()}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleReassess()}
            className="min-h-11 sm:min-h-[auto] px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
            title="Đánh giá lại các quy tắc dựa trên dữ liệu mới nhất"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Đánh giá lại</span>
          </button>

          <button
            onClick={handleOpenComparison}
            className="min-h-11 sm:min-h-[auto] px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <GitCompare className="h-3.5 w-3.5" />
            <span>So sánh Trước / Sau</span>
          </button>

          <Link
            href="/risk-assessment/traceability"
            className="min-h-11 sm:min-h-[auto] px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Compass className="h-3.5 w-3.5 text-teal-400" />
            <span>Bản đồ truy xuất nguồn gốc</span>
          </Link>

          <button
            onClick={() => setReportModalOpen(true)}
            className="min-h-11 sm:min-h-[auto] px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Xuất báo cáo</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Safety Score Card */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Điểm an toàn phòng
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${scoreBadgeBg}`}>
              {snapshot.safetyScore >= 80 ? "Khá an toàn" : snapshot.safetyScore >= 60 ? "Cần cải thiện" : "Mức độ rủi ro cao"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-black ${scoreColor}`}>{snapshot.safetyScore}</span>
            <span className="text-xs text-slate-400 font-bold">/ 100 điểm</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div
              className={`h-full transition-all duration-500 ${
                snapshot.safetyScore >= 80 ? "bg-teal-500" : snapshot.safetyScore >= 60 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${snapshot.safetyScore}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Chỉ số gợi ý giáo dục, không phải tỷ lệ y khoa</p>
        </div>

        {/* Detected Hazards */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mối nguy kích hoạt
            </span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600">{snapshot.detectedCount}</span>
            <span className="text-xs text-slate-400">/ {snapshot.totalRulesEvaluated} quy tắc thẩm định</span>
          </div>
          <p className="text-xs text-slate-600 mt-3 font-medium">
            Tại không gian: <span className="font-bold text-slate-900">{snapshot.roomName}</span>
          </p>
        </div>

        {/* High Priority Hazards */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cần ưu tiên kiểm tra
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              Khẩn thiết
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-700">{snapshot.highPriorityCount}</span>
            <span className="text-xs text-slate-400">vị trí</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Nguy cơ tương quan cao với chấn thương nặng ở người già
          </p>
        </div>

        {/* Needs Verification */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cần xác minh thêm
            </span>
            <HelpCircle className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-700">{snapshot.needsVerificationCount}</span>
            <span className="text-xs text-slate-400">yếu tố</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Hệ thống không đoán mò khi thiếu dữ liệu khảo sát
          </p>
        </div>
      </div>

      {/* Analytics Visualizations (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Donut Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Phân bổ mức độ ưu tiên
            </h2>
            <span className="text-[11px] text-slate-400">Deterministic Policy</span>
          </div>
          <div className="h-48 w-full flex items-center justify-center">
            {priorityChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {priorityChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={PRIORITY_COLORS[entry.key] || "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                    formatter={(value) => <span className="text-slate-700 font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400 text-center py-8">
                Tất cả quy tắc đều ở trạng thái an toàn
              </div>
            )}
          </div>
        </div>

        {/* Hazard Category Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Phân bố mối nguy theo nhóm danh mục
            </h2>
            <span className="text-[11px] text-slate-400">8 Quy tắc kiểm định</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="Số mối nguy" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Findings Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: `Tất cả (${snapshot.findings.length})` },
              { id: "HIGH", label: `Ưu tiên Cao (${snapshot.highPriorityCount})` },
              { id: "MEDIUM", label: `Ưu tiên Vừa (${snapshot.mediumPriorityCount})` },
              { id: "LOW", label: `Ưu tiên Thấp (${snapshot.lowPriorityCount})` },
              { id: "UNKNOWN", label: `Cần xác minh (${snapshot.needsVerificationCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterSeverity(tab.id)}
                className={`min-h-11 sm:min-h-[auto] px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  filterSeverity === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Hiển thị {filteredFindings.length} kết quả
          </span>
        </div>

        {/* Findings List */}
        {filteredFindings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-teal-600 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">
              Không phát hiện mối nguy nào trong danh mục đã chọn!
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không gian phòng hiện tại đáp ứng tốt các quy tắc an toàn đã kiểm định hoặc không có mối nguy ở mức độ này.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredFindings.map((finding) => {
              const isHigh = finding.severityCategory === "HIGH";
              const isMedium = finding.severityCategory === "MEDIUM";

              return (
                <div
                  key={finding.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition ${
                    isHigh
                      ? "border-rose-200 hover:border-rose-300"
                      : isMedium
                      ? "border-amber-200 hover:border-amber-300"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isHigh
                            ? "bg-rose-100 text-rose-600"
                            : isMedium
                            ? "bg-amber-100 text-amber-600"
                            : "bg-teal-100 text-teal-600"
                        }`}
                      >
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                            {finding.ruleId}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900">
                            {finding.title}
                          </h3>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Nhóm phân loại: <span className="font-semibold text-slate-600">{finding.hazardType}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isHigh
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : isMedium
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                        }`}
                      >
                        {isHigh ? "Ưu tiên Cao" : isMedium ? "Ưu tiên Vừa" : "Ưu tiên Thấp"}
                      </span>

                      {/* AI Explain Button */}
                      <button
                        onClick={() => handleExplainFinding(finding)}
                        className="min-h-11 sm:min-h-[auto] px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 flex items-center gap-1 transition shadow-sm"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        <span>Xem giải thích AI</span>
                      </button>

                      {/* 3D Action if target object */}
                      {finding.targetObjectId && (
                        <button
                          onClick={() => {
                            fixObject(finding.targetObjectId!);
                            handleReassess();
                          }}
                          className="min-h-11 sm:min-h-[auto] px-3 py-1 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 flex items-center gap-1 transition"
                          title="Áp dụng biện pháp khắc phục trên mô hình 3D"
                        >
                          <Wrench className="h-3.5 w-3.5 text-teal-600" />
                          <span>Xử lý trong 3D</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {finding.description}
                  </p>

                  {/* Traceable Evidence Box */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-500 shrink-0 min-w-[130px]">
                        Bằng chứng ghi nhận:
                      </span>
                      <span className="font-semibold text-slate-800">
                        {finding.evidence.measuredValue}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-500 shrink-0 min-w-[130px]">
                        Ngưỡng tiêu chuẩn:
                      </span>
                      <span className="text-slate-700 font-mono text-[11px]">
                        {finding.evidence.threshold}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-slate-500 shrink-0 min-w-[130px]">
                        Cơ chế nguy hại:
                      </span>
                      <span className="text-slate-600 leading-relaxed">
                        {finding.evidence.rationale}
                      </span>
                    </div>
                  </div>

                  {/* Actionable Recommendation Bar */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start gap-2 text-teal-800">
                      <BookOpen className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Khuyến nghị khắc phục:</strong> {finding.recommendationText}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400">
                      <span>Dẫn chứng:</span>
                      {finding.referenceIds.map((refId) => (
                        <span key={refId} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-semibold">
                          {refId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Catalog of All 8 Deterministic Rules */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Danh mục 8 quy tắc kiểm định an toàn môi trường (Risk Rule Registry v1.0.0)
            </h2>
          </div>
          <Link
            href="/risk-assessment/traceability"
            className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
          >
            <span>Xem đồ thị truy xuất nguồn gốc đầy đủ</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {snapshot.ruleEvaluations.map((ev) => {
            const isDetected = ev.state === "DETECTED";
            const isNeedVerify = ev.state === "NEEDS_VERIFICATION";
            const isNotApplicable = ev.state === "NOT_APPLICABLE";

            return (
              <div
                key={ev.ruleId}
                className={`p-3.5 rounded-xl border space-y-2 transition ${
                  isDetected
                    ? "bg-rose-50/50 border-rose-200"
                    : isNeedVerify
                    ? "bg-amber-50/50 border-amber-200"
                    : isNotApplicable
                    ? "bg-slate-50 border-slate-200 opacity-60"
                    : "bg-teal-50/40 border-teal-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-slate-700">
                    {ev.ruleId}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      isDetected
                        ? "bg-rose-100 text-rose-700"
                        : isNeedVerify
                        ? "bg-amber-100 text-amber-700"
                        : isNotApplicable
                        ? "bg-slate-200 text-slate-600"
                        : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    {isDetected
                      ? "Phát hiện"
                      : isNeedVerify
                      ? "Chưa rõ"
                      : isNotApplicable
                      ? "Không áp dụng"
                      : "An toàn"}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 line-clamp-2">
                  {ev.ruleName}
                </h4>
                <p className="text-[10px] text-slate-500 line-clamp-2">
                  {ev.priorityRationale}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================= */}
      {/* MODAL 1: AI RAG EXPLANATION DRAWER / MODAL                        */}
      {/* ================================================================= */}
      {selectedFindingForAi && aiExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Giải thích chuyên sâu từ AI Copilot &amp; Dẫn chứng RAG
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Mã quy tắc: {aiExplanation.ruleId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFindingForAi(null)}
                className="min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Clinical Rationale Box */}
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Cơ sở sinh học &amp; Y học người cao tuổi
                </span>
              </div>
              <p className="text-xs text-purple-950 leading-relaxed font-medium">
                {aiExplanation.clinicalRationale}
              </p>
            </div>

            {/* Environmental Mechanism */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Cơ chế gây ngã tại không gian sống
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed p-3 bg-slate-50 rounded-xl border border-slate-100">
                {aiExplanation.environmentalMechanism}
              </p>
            </div>

            {/* Actionable Steps */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Các bước can thiệp khuyến nghị
              </h4>
              <ul className="space-y-1.5">
                {aiExplanation.actionableGuidance.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                    <span className="h-5 w-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Verified Citations List */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tài liệu dẫn chứng y tế thẩm định
              </h4>
              <div className="space-y-2">
                {aiExplanation.citations.map((cite) => (
                  <div
                    key={cite.citationNumber}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        [{cite.citationNumber}] {cite.organization} ({cite.publicationYear})
                      </span>
                      <a
                        href={cite.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-teal-600 hover:text-teal-700 flex items-center gap-1 font-bold"
                      >
                        <span>Xem nguồn</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {cite.documentTitle} — {cite.section}
                    </div>
                    <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-100 mt-1">
                      "{cite.supportingExcerpt}"
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Medical Disclaimer */}
            <p className="text-[10px] text-slate-400 italic text-center pt-2">
              {aiExplanation.disclaimer}
            </p>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: BEFORE / AFTER ASSESSMENT COMPARISON                     */}
      {/* ================================================================= */}
      {comparisonModalOpen && comparisonResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <GitCompare className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    So sánh Trước &amp; Sau Can Thiệp (Before / After Snapshot)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân tích hiệu quả cải thiện môi trường không gian {comparisonResult.roomName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setComparisonModalOpen(false)}
                className="min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Improvement Metrics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm trước can thiệp</div>
                <div className="text-2xl font-black text-rose-600 mt-1">{comparisonResult.beforeScore}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-center">
                <div className="text-[10px] font-bold text-teal-700 uppercase">Điểm sau can thiệp</div>
                <div className="text-2xl font-black text-teal-700 mt-1">{comparisonResult.afterScore}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                <div className="text-[10px] font-bold text-indigo-700 uppercase">Mức độ tăng điểm</div>
                <div className="text-2xl font-black text-indigo-700 mt-1">+{comparisonResult.scoreDelta}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Nguy cơ đã giải quyết</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{comparisonResult.summary.resolvedCount} điểm</div>
              </div>
            </div>

            {/* Detailed Comparison Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Mã quy tắc &amp; Tiêu đề</th>
                    <th className="py-2.5 px-3">Trước can thiệp</th>
                    <th className="py-2.5 px-3">Sau can thiệp</th>
                    <th className="py-2.5 px-3">Phân loại thay đổi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {comparisonResult.evaluationsComparison.map((item) => {
                    const isResolved = item.comparisonCategory === "RESOLVED_IN_MODEL";
                    const isPersistent = item.comparisonCategory === "PERSISTENT";

                    return (
                      <tr key={item.ruleId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded mr-1.5">
                            {item.ruleId}
                          </span>
                          <span className="font-bold text-slate-800">{item.ruleName}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5">{item.explanation}</p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.beforeState === "DETECTED"
                                ? "bg-rose-100 text-rose-700"
                                : item.beforeState === "NEEDS_VERIFICATION"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-teal-100 text-teal-700"
                            }`}
                          >
                            {item.beforeState}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.afterState === "DETECTED"
                                ? "bg-rose-100 text-rose-700"
                                : item.afterState === "NEEDS_VERIFICATION"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-teal-100 text-teal-700"
                            }`}
                          >
                            {item.afterState}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isResolved
                                ? "bg-emerald-100 text-emerald-800"
                                : isPersistent
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {isResolved
                              ? "✓ Đã khắc phục"
                              : isPersistent
                              ? "Chưa can thiệp"
                              : item.comparisonCategory}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setComparisonModalOpen(false)}
                className="min-h-11 sm:min-h-[auto] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition"
              >
                Đóng đối chiếu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 3: EXPORT & PRINTABLE REPORT MODAL                         */}
      {/* ================================================================= */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Báo Cáo Đánh Giá Mối Nguy Môi Trường &amp; Kế Hoạch Khắc Phục
                  </h3>
                  <p className="text-xs text-slate-400">
                    SafeHome Risk Intelligence Report • {snapshot.roomName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReportModalOpen(false)}
                className="min-h-11 min-w-11 sm:min-h-[auto] sm:min-w-[auto] p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Printable Preview Content */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs text-slate-800">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <div className="text-sm font-black text-slate-900">SAFEHOME 3D AI — NHÀ AN TOÀN, TUỔI GIÀ AN TÂM</div>
                  <div className="text-[10px] text-slate-500">Báo cáo chuẩn hóa định dạng số cho gia đình &amp; người chăm sóc</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-slate-500">Ngày lập: {new Date().toLocaleDateString("vi-VN")}</div>
                  <div className="text-[10px] font-bold text-teal-700">Điểm an toàn: {snapshot.safetyScore}/100</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1">
                  1. Tóm tắt tình trạng không gian ({snapshot.roomName})
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  Đã thẩm định 8 quy tắc hình học không gian và môi trường. Phát hiện{" "}
                  <strong>{snapshot.detectedCount} mối nguy</strong> cần xử lý, trong đó có{" "}
                  <strong className="text-rose-600">{snapshot.highPriorityCount} mối nguy ưu tiên cao (khẩn thiết)</strong>.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2">
                  2. Danh mục hành động khắc phục cụ thể
                </h4>
                <div className="space-y-2">
                  {snapshot.recommendations.map((rec, i) => (
                    <div key={rec.id} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          {i + 1}. {rec.title}
                        </span>
                        <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                          Chi phí: {rec.estimatedCost}
                        </span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                        {rec.practicalSteps.map((st, sIdx) => (
                          <li key={sIdx}>{st}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[10px] text-slate-400">
                SafeHome Risk Intelligence v1.0.0 • Dẫn chiếu WHO 2021 &amp; CDC STEADI
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generateAssessmentReport(snapshot), null, 2));
                    const downloadAnchor = document.createElement("a");
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `SafeHome-Risk-Report-${snapshot.roomId}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                  }}
                  className="min-h-11 sm:min-h-[auto] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Tải tệp JSON</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="min-h-11 sm:min-h-[auto] px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>In báo cáo</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
