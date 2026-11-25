"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Save,
  RotateCcw,
  Sparkles,
  Camera,
  Upload,
  Box,
  Sliders,
  FileText,
  Printer,
  Download,
  Info,
  Layers,
  ShieldCheck,
  Zap,
  Eye,
  Check,
  X,
  Play,
  HelpCircle,
  BookOpen,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { normalizeRoomStateToAssessmentInput } from "@/lib/risk/inputAdapter";
import { RiskFinding } from "@/lib/risk/types";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";
import type { DetectionCategory, VisionClarificationQuestion, VisionDetection } from "@/lib/vision/types";
import {
  averageConfidence,
  bboxToPercentStyle,
  initialWorkflowDetections,
  patchWorkflowDetection,
  runWorkflowVision,
} from "@/lib/vision/workflowVision";

// Workflow Steps
const WORKFLOW_STEPS = [
  { step: 1, id: "PROFILE", title: "1. Hồ sơ khảo sát", desc: "Thông tin gia đình & phòng" },
  { step: 2, id: "COLLECTION", title: "2. Thu thập dữ liệu", desc: "Kích thước & checklist nguy cơ" },
  { step: 3, id: "VISION", title: "3. Thị giác AI", desc: "Nhận diện & kiểm định không gian" },
  { step: 4, id: "DIGITAL_TWIN", title: "4. Bản sao số 3D", desc: "Dựng hình & tương tác vật thể" },
  { step: 5, id: "ASSESSMENT", title: "5. Đánh giá nguy cơ", desc: "8 Quy tắc an toàn & XAI" },
  { step: 6, id: "SIMULATION", title: "6. Mô phỏng cải thiện", desc: "Thử nghiệm can thiệp & What-if" },
  { step: 7, id: "REPORT", title: "7. Kế hoạch & Báo cáo", desc: "So sánh Trước/Sau & Xuất PDF" },
];

export default function WorkflowPage() {
  const {
    rooms,
    currentRoomId,
    switchRoom,
    updateObjectPosition,
    addSafetyDevice,
    fixObject,
    runSimulation,
    restoreBaseline,
    currentAssessment,
    comparison,
    selectObject,
    focusOnLocation,
  } = useSimulationStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [workflowStatus, setWorkflowStatus] = useState("CREATED");
  const [projectId, setProjectId] = useState<string>("proj-safehome-2026");
  const [surveyId, setSurveyId] = useState<string>("survey-live-01");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Step 1: Profile State
  const [projectName, setProjectName] = useState("Cải tạo an toàn nhà Bác Nam - Căn hộ 502");
  const [residentProfile, setResidentProfile] = useState(
    "Bác Nam (75 tuổi), thoái hóa khớp gối độ 2, giảm thị lực ban đêm, đi lại cần điểm tựa vững."
  );
  const [roomType, setRoomType] = useState<"BEDROOM" | "BATHROOM" | "LIVINGROOM">("BEDROOM");
  const mode: "DEMO" | "REAL" = "DEMO";

  const RESIDENT_QUICK_TAGS = [
    "Thoái hóa khớp gối độ 2",
    "Giảm thị lực ban đêm",
    "Dậy vệ sinh 2 lần/đêm",
    "Đi lại cần điểm tựa vững",
    "Tiền sử từng trượt chân ngã",
  ];

  const handleToggleTag = (tag: string) => {
    if (residentProfile.includes(tag)) {
      setResidentProfile((prev) =>
        prev
          .replace(new RegExp(`,?\\s*${tag}\\.?`, "gi"), "")
          .trim()
      );
    } else {
      setResidentProfile((prev) =>
        prev ? `${prev.replace(/[\.\s]+$/, "")}, ${tag}.` : `${tag}.`
      );
    }
  };

  // Step 2: Collection State
  const [dimensions, setDimensions] = useState({ length: 4.5, width: 3.5, height: 2.8 });
  const [checklist, setChecklist] = useState({
    wetFloor: false,
    looseRug: true,
    cablesOnWalkway: true,
    dimLighting: true,
    thresholdStep: false,
    missingGrabBar: true,
  });
  // Step 3: Vision state. Starts empty: no detections, nothing confirmed, no stock photo.
  const [visionFile, setVisionFile] = useState<File | null>(null);
  const [visionImageUrl, setVisionImageUrl] = useState<string | null>(null);
  const [visionConsent, setVisionConsent] = useState(false);
  const [visionStatus, setVisionStatus] = useState<"idle" | "analyzing" | "done" | "no_consent" | "unknown">("idle");
  const [visionMessage, setVisionMessage] = useState<string | null>(null);
  const [visionDemo, setVisionDemo] = useState(false);
  const [visionDetections, setVisionDetections] = useState<VisionDetection[]>(initialWorkflowDetections());
  const [visionClarifications, setVisionClarifications] = useState<VisionClarificationQuestion[]>([]);
  const [editingDetection, setEditingDetection] = useState<{ id: string; label: string; category: DetectionCategory } | null>(null);

  const visionRoomId = `workflow-${surveyId}-${roomType.toLowerCase()}`;

  const handleVisionFile = (file: File | undefined) => {
    if (!file) return;
    if (visionImageUrl) URL.revokeObjectURL(visionImageUrl);
    setVisionFile(file);
    setVisionImageUrl(URL.createObjectURL(file));
    setVisionDetections(initialWorkflowDetections());
    setVisionClarifications([]);
    setVisionStatus("idle");
    setVisionMessage(null);
  };

  const handleRunVision = async () => {
    if (!visionFile) return;
    setVisionStatus("analyzing");
    setVisionMessage(null);
    const outcome = await runWorkflowVision({
      file: visionFile,
      roomId: visionRoomId,
      roomType,
      consent: visionConsent,
    });
    if (outcome.kind === "ok") {
      setVisionDetections(outcome.detections);
      setVisionClarifications(outcome.clarifications);
      setVisionDemo(outcome.demo);
      setVisionStatus("done");
    } else {
      setVisionDetections([]);
      setVisionClarifications([]);
      setVisionStatus(outcome.kind);
      setVisionMessage(outcome.message);
    }
  };

  const handleDetectionAction = async (
    det: VisionDetection,
    body: { verificationStatus: "CONFIRMED" | "REJECTED" | "CORRECTED"; userLabel?: string; category?: DetectionCategory }
  ) => {
    try {
      const saved = await patchWorkflowDetection(det.id, body);
      setVisionDetections((prev) => prev.map((d) => (d.id === det.id ? { ...d, ...saved } : d)));
      setEditingDetection(null);
      setVisionMessage(null);
    } catch (error) {
      setVisionMessage(error instanceof Error ? error.message : "Không lưu được thao tác xác nhận.");
    }
  };

  const handleAnswerClarification = async (q: VisionClarificationQuestion, value: string) => {
    try {
      const res = await fetch(`/api/vision/clarifications/${encodeURIComponent(q.id)}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: value }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || "Không lưu được câu trả lời.");
      setVisionClarifications((prev) =>
        prev.map((x) => (x.id === q.id ? { ...x, status: "ANSWERED", userResponse: value } : x))
      );
    } catch (error) {
      setVisionMessage(error instanceof Error ? error.message : "Không lưu được câu trả lời.");
    }
  };

  const visionAvgConfidence = averageConfidence(visionDetections);
  const confirmedCount = visionDetections.filter(
    (d) => d.verificationStatus === "CONFIRMED" || d.verificationStatus === "CORRECTED"
  ).length;

  // Step 5: Selected Finding & Explanation Modal
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);
  const [showRAGModal, setShowRAGModal] = useState(false);

  // Sync Room selection with Room Type & default dimensions
  useEffect(() => {
    if (roomType === "BATHROOM" && currentRoomId !== "room-bathroom-01") {
      switchRoom("room-bathroom-01");
      setDimensions({ length: 2.4, width: 1.8, height: 2.6 });
    } else if (roomType === "BEDROOM" && currentRoomId !== "room-bedroom-01") {
      switchRoom("room-bedroom-01");
      setDimensions({ length: 4.5, width: 3.5, height: 2.8 });
    } else if (roomType === "LIVINGROOM" && currentRoomId !== "room-living-01") {
      switchRoom("room-living-01");
      setDimensions({ length: 6.0, width: 5.4, height: 2.8 });
    }
  }, [roomType]);

  // Run initial simulation if not run yet
  useEffect(() => {
    runSimulation();
  }, [currentStep]);

  // Handle Save State
  const handleSaveState = async () => {
    setIsSaving(true);
    try {
      const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0];
      const res = await fetch("/api/workflow/save-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          surveyId,
          projectName,
          residentInfo: residentProfile,
          roomType,
          currentStep,
          workflowStatus,
          dimensions,
          checklist,
          sceneObjects: currentRoom.objects,
          assessmentResult: currentAssessment,
          comparisonResult: comparison,
        }),
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Next / Prev step navigation with state transition
  const handleNextStep = () => {
    if (currentStep < 7) {
      const next = currentStep + 1;
      setCurrentStep(next);

      // Transition state machine
      if (next === 2) setWorkflowStatus("SURVEY_IN_PROGRESS");
      if (next === 3) setWorkflowStatus("SURVEY_COMPLETED");
      if (next === 4) setWorkflowStatus("SCENE_READY");
      if (next === 5) {
        setWorkflowStatus("ASSESSED");
        runSimulation();
      }
      if (next === 6) setWorkflowStatus("SIMULATION_IN_PROGRESS");
      if (next === 7) setWorkflowStatus("REPORT_READY");

      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const currentRoom = rooms.find((r) => r.id === currentRoomId) || rooms[0];
  const findings = currentAssessment?.findings || [];
  const safetyScore = currentAssessment?.safetyScore ?? null;
  const scoreLabel = safetyScore == null ? "Chưa đủ dữ liệu" : `${safetyScore}/100`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 1. Header Banner & Guided Stepper */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Top Title & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Hành trình Đánh giá An toàn Nhà ở</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-extrabold uppercase">
                    7 Bước Khép Kín
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  {projectName} • Bước {currentStep}/7: {WORKFLOW_STEPS[currentStep - 1].title}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {savedSuccess && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Đã lưu trạng thái!
                </span>
              )}

              <Link
                href="/ai-guided-survey"
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
              >
                <Save className="h-3.5 w-3.5 text-teal-600" />
                <span>Mở khảo sát thực tế</span>
              </Link>

              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Quay lại</span>
              </button>

              <button
                onClick={handleNextStep}
                disabled={currentStep === 7}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-40"
              >
                <span>{currentStep === 7 ? "Đã hoàn tất" : "Tiếp tục"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 7-Step Interactive Progress Bar */}
          <div className="pt-2 border-t border-slate-100">
            {/* Progress line */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-teal-700 font-bold">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                Tiến độ: Bước {currentStep}/7 — {WORKFLOW_STEPS[currentStep - 1].title.split(".")[1].trim()}
              </span>
              <span>{Math.round((currentStep / 7) * 100)}% Hoàn tất</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {WORKFLOW_STEPS.map((s) => {
                const isPast = currentStep > s.step;
                const isCurrent = currentStep === s.step;

                return (
                  <button
                    key={s.step}
                    onClick={() => setCurrentStep(s.step)}
                    className={`text-left p-2.5 rounded-xl transition-all border flex items-center gap-2.5 relative group ${
                      isCurrent
                        ? "bg-teal-50/90 border-teal-500 shadow-sm ring-2 ring-teal-500/20"
                        : isPast
                        ? "bg-emerald-50/50 border-emerald-200/90 hover:bg-emerald-50 text-slate-700"
                        : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    }`}
                  >
                    {/* Circle badge */}
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all ${
                        isCurrent
                          ? "bg-teal-600 text-white shadow-xs"
                          : isPast
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      }`}
                    >
                      {isPast ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : s.step}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          isCurrent
                            ? "text-teal-700 font-black"
                            : isPast
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        Bước {s.step}
                      </div>
                      <div
                        className={`text-xs font-bold truncate ${
                          isCurrent ? "text-slate-900" : isPast ? "text-slate-700" : "text-slate-500"
                        }`}
                      >
                        {s.title.split(".")[1].trim()}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Step Content Container */}
      <p role="note" className="mx-auto max-w-7xl px-6 py-3 text-sm text-amber-900 bg-amber-50">Quy trình minh họa: thông tin người ở, ảnh, nhận diện, checklist và điểm dưới đây là dữ liệu mẫu. Để lưu dữ liệu gia đình, hãy mở khảo sát thực tế.</p>
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ========================================================================= */}
        {/* STEP 1: TẠO HỒ SƠ KHẢO SÁT */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                <span>Bước 1: Khởi Tạo Hồ Sơ Khảo Sát Không Gian Sống</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thiết lập thông tin dự án, đối tượng người cao tuổi và lựa chọn không gian phòng cần thẩm định an toàn.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Project & Resident Info (7 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên dự án / Căn hộ khảo sát:
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50"
                    placeholder="Ví dụ: Khảo sát căn hộ gia đình Bác Nam"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Hồ sơ thể trạng người cao tuổi (Target Resident):
                    </label>
                    <span className="text-[10px] text-slate-400">Nhấp thẻ bên dưới để chèn nhanh</span>
                  </div>
                  <textarea
                    rows={3}
                    value={residentProfile}
                    onChange={(e) => setResidentProfile(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none bg-slate-50/50 leading-relaxed"
                    placeholder="Mô tả tuổi tác, thị lực, khả năng giữ thăng bằng..."
                  />

                  {/* Quick Clickable Health Condition Tags */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {RESIDENT_QUICK_TAGS.map((tag) => {
                      const isIncluded = residentProfile.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition flex items-center gap-1 ${
                            isIncluded
                              ? "bg-teal-100 text-teal-800 border border-teal-300 font-bold"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                          }`}
                        >
                          <span>{isIncluded ? "✓" : "+"}</span>
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chế độ dữ liệu khảo sát:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => { window.location.href = "/ai-guided-survey"; }}
                      className={`p-3.5 rounded-xl border text-left transition ${
                        false
                          ? "bg-teal-50 border-teal-400 text-teal-950 font-bold ring-2 ring-teal-500/15"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Khảo sát Thực Tế</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Nhập số đo phòng &amp; tải ảnh chụp thật</div>
                    </button>
                    <button
                      type="button"
                      className={`p-3.5 rounded-xl border text-left transition ${
                        mode === "DEMO"
                          ? "bg-teal-50 border-teal-400 text-teal-950 font-bold ring-2 ring-teal-500/15"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">Dữ liệu Mẫu (Demo)</span>
                        {mode === "DEMO" && <span className="h-2 w-2 rounded-full bg-teal-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">Tự động nạp kịch bản phòng tiêu chuẩn</div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Room Selection (3 Rooms) & Clinical Guidelines (6 cols) */}
              <div className="lg:col-span-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Chọn không gian phòng khảo sát trọng tâm (3 phòng có sẵn):
                  </label>
                  <div className="space-y-2.5">
                    {/* Room 1: Bedroom */}
                    <button
                      type="button"
                      onClick={() => setRoomType("BEDROOM")}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                        roomType === "BEDROOM"
                          ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg shrink-0">
                          🛏️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Phòng Ngủ Người Cao Tuổi</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              4.5m × 3.5m (15.8m²)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Trọng tâm: Mép giường cao, thảm chân lỏng lẻo &amp; dây điện sạc sàn.
                          </div>
                        </div>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${roomType === "BEDROOM" ? "bg-teal-600 ring-4 ring-teal-100" : "bg-slate-300"}`} />
                    </button>

                    {/* Room 2: Bathroom */}
                    <button
                      type="button"
                      onClick={() => setRoomType("BATHROOM")}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                        roomType === "BATHROOM"
                          ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center text-lg shrink-0">
                          🚿
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Phòng Tắm &amp; Nhà Vệ Sinh</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              2.4m × 1.8m (4.3m²)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Trọng tâm: Sàn ướt trơn trượt, thiếu thanh vịn bồn cầu, gờ cửa cao.
                          </div>
                        </div>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${roomType === "BATHROOM" ? "bg-teal-600 ring-4 ring-teal-100" : "bg-slate-300"}`} />
                    </button>

                    {/* Room 3: Living Room */}
                    <button
                      type="button"
                      onClick={() => setRoomType("LIVINGROOM")}
                      className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between gap-3 ${
                        roomType === "LIVINGROOM"
                          ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                          : "bg-slate-50/70 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg shrink-0">
                          🛋️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">Phòng Khách Sinh Hoạt Chung</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              6.0m × 5.4m (32.4m²)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Trọng tâm: Lối đi chung, bàn trà góc nhọn, thảm sofa &amp; chướng ngại vật.
                          </div>
                        </div>
                      </div>
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${roomType === "LIVINGROOM" ? "bg-teal-600 ring-4 ring-teal-100" : "bg-slate-300"}`} />
                    </button>
                  </div>
                </div>

                {/* Medical & Engineering Standard Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50/60 to-sky-50/60 border border-teal-100 space-y-1.5 text-xs text-slate-600">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
                    <span>Cơ sở y tế đối chiếu: CDC STEADI (2019) &amp; WHO (2021)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Theo thống kê dịch tễ học, hơn <strong>60% các vụ té ngã</strong> ở người cao tuổi diễn ra trong lộ trình từ phòng ngủ sang nhà vệ sinh vào ban đêm khi độ rọi dưới 50 Lux và thiếu điểm bám tay.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Configuration Summary & Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Đã chọn:</span>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold text-xs">
                  {roomType === "BEDROOM"
                    ? "Phòng Ngủ (4.5m × 3.5m)"
                    : roomType === "BATHROOM"
                    ? "Nhà Vệ Sinh / Tắm (2.4m × 1.8m)"
                    : "Phòng Khách (6.0m × 5.4m)"}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs">
                  Chế độ: Dữ liệu mẫu minh họa
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveState}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5 text-teal-600" />
                  <span>{isSaving ? "Đang lưu..." : "Lưu nháp"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-teal-600/25 flex items-center gap-2 transition active:scale-95"
                >
                  <span>Bắt đầu khảo sát (Sang bước 2)</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: THU THẬP DỮ LIỆU NHÀ Ở */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-teal-600" />
                <span>Bước 2: Thu Thập Kích Thước &amp; Checklist Nguy Cơ Môi Trường</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Khai báo thông số phòng và trả lời checklist nhanh để hệ thống xây dựng mô hình rủi ro.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Dimensions & Photo */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">
                  1. Kích thước phòng thực tế (mét)
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Chiều dài (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.length}
                      onChange={(e) => setDimensions({ ...dimensions, length: parseFloat(e.target.value) || 4 })}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Chiều rộng (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.width}
                      onChange={(e) => setDimensions({ ...dimensions, width: parseFloat(e.target.value) || 3 })}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Chiều cao (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={dimensions.height}
                      onChange={(e) => setDimensions({ ...dimensions, height: parseFloat(e.target.value) || 2.8 })}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400 mb-2">
                    2. Hình ảnh không gian khảo sát
                  </h3>
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 text-center">
                    <Camera className="h-8 w-8 text-teal-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-700">Ảnh phòng được tải ở Bước 3 (Thị giác AI)</p>
                    <p className="text-[11px] text-slate-400">
                      Chỉ gửi cho AI khi bạn đồng ý. Có thể bỏ qua và dùng checklist bên phải.
                    </p>
                  </div>
                  {visionImageUrl && (
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={visionImageUrl}
                        alt="Ảnh phòng đã chọn"
                        className="h-20 w-32 object-contain bg-slate-900 rounded-xl border border-slate-200 shadow-sm"
                      />
                      <span className="text-xs font-medium text-slate-500">Ảnh bạn đã chọn ở Bước 3</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Risk Checklist */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider text-slate-400">
                  3. Checklist Mối Nguy Môi Trường Trực Quan
                </h3>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Có thảm trải sàn lỏng lẻo / chưa dán keo chống trượt?
                    </span>
                    <input
                      type="checkbox"
                      checked={checklist.looseRug}
                      onChange={(e) => setChecklist({ ...checklist, looseRug: e.target.checked })}
                      className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Có dây điện, dây sạc thiết bị chạy ngang lối đi?
                    </span>
                    <input
                      type="checkbox"
                      checked={checklist.cablesOnWalkway}
                      onChange={(e) => setChecklist({ ...checklist, cablesOnWalkway: e.target.checked })}
                      className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Ánh sáng ban đêm từ giường vào nhà vệ sinh có quá tối (&lt;50 Lux)?
                    </span>
                    <input
                      type="checkbox"
                      checked={checklist.dimLighting}
                      onChange={(e) => setChecklist({ ...checklist, dimLighting: e.target.checked })}
                      className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Sàn nhà vệ sinh có hay bị ẩm ướt hoặc thiếu thảm cao su chống trượt?
                    </span>
                    <input
                      type="checkbox"
                      checked={checklist.wetFloor}
                      onChange={(e) => setChecklist({ ...checklist, wetFloor: e.target.checked })}
                      className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Thiếu thanh tay vịn trợ lực an toàn gần bồn cầu / buồng tắm?
                    </span>
                    <input
                      type="checkbox"
                      checked={checklist.missingGrabBar}
                      onChange={(e) => setChecklist({ ...checklist, missingGrabBar: e.target.checked })}
                      className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>Xác nhận dữ liệu (Sang Thị giác AI)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: THỊ GIÁC AI VÀ XÁC NHẬN KHÔNG GIAN */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Camera className="h-5 w-5 text-teal-600" />
                <span>Bước 3: Gợi ý AI từ ảnh &amp; xác nhận của bạn</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                AI chỉ đưa ra gợi ý vật thể (ước lượng từ ảnh). Mỗi gợi ý chỉ được tính khi bạn chấp nhận, sửa hoặc loại.
                Bạn có thể bỏ qua AI và dùng checklist ở Bước 2.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="relative rounded-2xl border border-slate-200 bg-slate-900 min-h-[240px] flex items-center justify-center p-2">
                  {visionImageUrl ? (
                    // Wrapper hugs the object-contain image so percent bboxes map onto the real picture.
                    <div className="relative inline-block max-w-full">
                      <img
                        src={visionImageUrl}
                        alt="Ảnh phòng cần phân tích"
                        className="block max-h-[420px] max-w-full w-auto h-auto object-contain"
                      />
                      {visionStatus === "done" &&
                        visionDetections
                          .filter((d) => d.verificationStatus !== "REJECTED")
                          .map((d) => {
                            const accepted = d.verificationStatus === "CONFIRMED" || d.verificationStatus === "CORRECTED";
                            return (
                              <div
                                key={d.id}
                                style={bboxToPercentStyle(d.bbox)}
                                className={`absolute border-2 pointer-events-none ${
                                  accepted ? "border-emerald-400 bg-emerald-400/10" : "border-amber-400 bg-amber-400/10 border-dashed"
                                }`}
                              >
                                <span className="absolute -top-4 left-0 bg-slate-800 text-white text-[9px] font-bold px-1 rounded whitespace-nowrap">
                                  {d.userLabel || d.originalLabel}
                                  {accepted ? "" : " (chờ xác nhận)"}
                                </span>
                              </div>
                            );
                          })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 text-center px-4">Chưa có ảnh. Chọn ảnh phòng của bạn bên dưới.</p>
                  )}
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Chọn ảnh phòng"
                  onChange={(e) => handleVisionFile(e.target.files?.[0])}
                  className="block w-full text-xs"
                />
                <label className="flex items-start gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={visionConsent}
                    onChange={(e) => setVisionConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Tôi đồng ý lưu ảnh và gửi ảnh tới nhà cung cấp AI bên thứ ba để nhận diện vật thể. Tránh ảnh có người
                    hoặc thông tin riêng tư.
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRunVision}
                    disabled={!visionFile || !visionConsent || visionStatus === "analyzing"}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs"
                  >
                    {visionStatus === "analyzing" ? "Đang phân tích..." : visionStatus === "unknown" ? "Thử lại" : "Phân tích ảnh bằng AI"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                  >
                    Bỏ qua AI, dùng checklist
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {visionMessage && (
                  <div role="alert" className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900">
                    {visionMessage}
                    {visionStatus !== "idle" && visionStatus !== "done" && (
                      <div className="mt-1 font-semibold">
                        Kết quả nhận diện: chưa xác định. Không có vật thể nào được suy đoán thay cho AI.
                      </div>
                    )}
                  </div>
                )}
                {visionDemo && (
                  <div role="status" className="p-3 rounded-xl border border-amber-400 bg-amber-100 text-xs font-bold text-amber-900">
                    DEMO: dữ liệu minh họa, không phải kết quả phân tích ảnh của bạn.
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Gợi ý AI ({visionDetections.length}) • đã xác nhận {confirmedCount}
                  </h3>
                  {visionAvgConfidence !== null && (
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Điểm tham khảo của mô hình, chưa hiệu chuẩn: TB {(visionAvgConfidence * 100).toFixed(0)}%
                    </span>
                  )}
                </div>

                {visionStatus === "done" && visionDetections.length === 0 && (
                  <p className="text-xs text-slate-500">AI không đề xuất vật thể nào. Hãy dùng checklist ở Bước 2.</p>
                )}

                <div className="space-y-2">
                  {visionDetections.map((det) => {
                    const accepted = det.verificationStatus === "CONFIRMED" || det.verificationStatus === "CORRECTED";
                    const rejected = det.verificationStatus === "REJECTED";
                    const editing = editingDetection?.id === det.id;
                    return (
                      <div key={det.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-slate-800">{det.userLabel || det.originalLabel}</div>
                            <div className="text-[10px] text-slate-400">
                              Điểm tham khảo của mô hình, chưa hiệu chuẩn: {(det.confidence * 100).toFixed(0)}% •{" "}
                              {accepted ? "đã xác nhận" : rejected ? "đã loại" : "chờ xác nhận"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleDetectionAction(det, { verificationStatus: "CONFIRMED" })}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> Chấp nhận
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setEditingDetection({ id: det.id, label: det.userLabel || det.originalLabel, category: det.category })
                              }
                              className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold"
                            >
                              Sửa nhãn
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDetectionAction(det, { verificationStatus: "REJECTED" })}
                              className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold flex items-center gap-1"
                            >
                              <X className="h-3 w-3" /> Loại
                            </button>
                          </div>
                        </div>
                        {editing && editingDetection && (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label="Loại vật thể"
                              value={editingDetection.category}
                              onChange={(e) =>
                                setEditingDetection({
                                  ...editingDetection,
                                  category: e.target.value as DetectionCategory,
                                  label: CATEGORY_TAXONOMY[e.target.value as DetectionCategory].vietnameseName,
                                })
                              }
                              className="text-xs rounded border border-slate-300 px-1 py-1"
                            >
                              {Object.values(CATEGORY_TAXONOMY).map((c) => (
                                <option key={c.category} value={c.category}>
                                  {c.vietnameseName}
                                </option>
                              ))}
                            </select>
                            <input
                              aria-label="Nhãn"
                              value={editingDetection.label}
                              maxLength={200}
                              onChange={(e) => setEditingDetection({ ...editingDetection, label: e.target.value })}
                              className="text-xs rounded border border-slate-300 px-2 py-1 flex-1 min-w-[120px]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleDetectionAction(det, {
                                  verificationStatus: "CORRECTED",
                                  userLabel: editingDetection.label,
                                  category: editingDetection.category,
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-teal-600 text-white text-[10px] font-bold"
                            >
                              Lưu
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {visionClarifications.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-teal-600" />
                      <span>Câu hỏi làm rõ (AI không tự trả lời thay bạn):</span>
                    </div>
                    {visionClarifications.map((q) => (
                      <div key={q.id} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                        <p className="font-semibold text-amber-900">{q.questionText}</p>
                        <div className="flex flex-wrap gap-2">
                          {q.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              aria-pressed={q.userResponse === opt.value}
                              onClick={() => handleAnswerClarification(q, opt.value)}
                              className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                                q.userResponse === opt.value
                                  ? "bg-teal-600 text-white border-teal-700"
                                  : "bg-white text-slate-700 border-slate-200"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>Dựng mô hình phòng (mô phỏng gần đúng)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: DIGITAL TWIN 3D */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Box className="h-5 w-5 text-teal-600" />
                  <span>Bước 4: Mô hình phòng (mô phỏng gần đúng)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Không gian 3D được tự động dựng từ số đo và đồ vật đã xác nhận. Bạn có thể tương tác, xoay góc và thêm thiết bị an toàn.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => addSafetyDevice("grab_bar_toilet")}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>+ Thêm tay vịn Inox</span>
                </button>
                <button
                  onClick={() => addSafetyDevice("anti_slip_mat")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>+ Thêm thảm chống trượt</span>
                </button>
                <button
                  onClick={restoreBaseline}
                  className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                  title="Khôi phục trạng thái ban đầu"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Embedded 3D Canvas with Non-Overlapping Clustered Markers */}
            <div className="h-[480px] w-full rounded-2xl overflow-hidden shadow-inner border border-slate-800">
              <RoomViewer />
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>Chạy Đánh Giá Nguy Cơ AI (Sang bước 5)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: ĐÁNH GIÁ NGUY CƠ */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <span>Bước 5: Thẩm Định Nguy Cơ Môi Trường (Risk Intelligence)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Đánh giá xác định theo 8 Quy tắc An toàn Lão khoa (CDC STEADI &amp; WHO 2021).
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-sm">
                  <span>Chỉ số an toàn: </span>
                  <span className="text-amber-400 text-sm font-black">{scoreLabel}</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                  {findings.length} Phát hiện nguy cơ
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Findings List */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Danh sách nguy cơ phát hiện ({findings.length})
                </h3>

                {findings.map((f, idx) => (
                  <div
                    key={f.id || idx}
                    onClick={() => {
                      setSelectedFinding(f);
                      if (f.targetObjectId) {
                        selectObject(f.targetObjectId);
                        const obj = currentRoom.objects.find((o) => o.id === f.targetObjectId);
                        if (obj) focusOnLocation(obj.position);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedFinding?.id === f.id
                        ? "bg-teal-50/80 border-teal-400 ring-2 ring-teal-500/20 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          f.severityCategory === "HIGH"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {f.severityCategory === "HIGH" ? "Nguy cơ cao (HIGH)" : "Cần lưu ý (MEDIUM)"}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">{f.detectionRuleId}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800">{f.title}</h4>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{f.description}</p>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-teal-700 font-semibold flex items-center gap-1">
                        👉 Nhấp để focus camera 3D
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFinding(f);
                          setShowRAGModal(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                      >
                        <BookOpen className="h-3.5 w-3.5" /> Giải thích Y khoa (RAG)
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3D Focus Preview */}
              <div className="flex flex-col space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tiêu điểm 3D tương tác
                </h3>
                <div className="h-[380px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                  <RoomViewer />
                </div>
                <p className="text-[11px] text-slate-500 text-center">
                  Nhấp chọn bất kỳ nguy cơ nào ở danh sách bên trái để camera tự động lướt đến vật thể tương ứng.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>Mô Phỏng Cải Thiện Không Gian (Sang bước 6)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: MÔ PHỎNG CẢI THIỆN (WHAT-IF SCENARIOS) */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="border-b border-slate-100 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-teal-600" />
                  <span>Bước 6: Mô Phỏng Cải Thiện Môi Trường (Scenario Simulator)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Thử nghiệm thay đổi vị trí đồ đạc, dán băng dính thảm, lắp tay vịn và xem điểm an toàn được tính toán lại ngay lập tức.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => restoreBaseline()}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Khôi phục ban đầu
                </button>
              </div>
            </div>

            {/* Quick-Fix Action Buttons */}
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 space-y-3">
              <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <span>Thao tác khắc phục nhanh bằng 1 cú nhấp (Quick-Fix Actions):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => {
                    const rug = currentRoom.objects.find((o) => o.category === "RUG");
                    if (rug) fixObject(rug.id);
                  }}
                  className="p-3 rounded-xl bg-white border border-teal-200 hover:border-teal-400 hover:shadow-sm text-left transition"
                >
                  <div className="text-xs font-bold text-slate-800">1. Dán cố định thảm</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Dán keo chống trượt viền thảm</div>
                </button>

                <button
                  onClick={() => {
                    const cable = currentRoom.objects.find((o) => o.category === "CABLE");
                    if (cable) fixObject(cable.id);
                  }}
                  className="p-3 rounded-xl bg-white border border-teal-200 hover:border-teal-400 hover:shadow-sm text-left transition"
                >
                  <div className="text-xs font-bold text-slate-800">2. Thu nẹp luồn dây điện</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Nẹp dây điện sát vách tường</div>
                </button>

                <button
                  onClick={() => addSafetyDevice("grab_bar_toilet")}
                  className="p-3 rounded-xl bg-white border border-teal-200 hover:border-teal-400 hover:shadow-sm text-left transition"
                >
                  <div className="text-xs font-bold text-slate-800">3. Lắp thanh tay vịn Inox</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Chịu tải 250 lbs theo ADA</div>
                </button>

                <button
                  onClick={() => addSafetyDevice("night_light")}
                  className="p-3 rounded-xl bg-white border border-teal-200 hover:border-teal-400 hover:shadow-sm text-left transition"
                >
                  <div className="text-xs font-bold text-slate-800">4. Thêm đèn cảm biến đêm</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Tự bật sáng khi có chuyển động</div>
                </button>
              </div>
            </div>

            {/* 3D Canvas */}
            <div className="h-[440px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
              <RoomViewer />
            </div>

            {/* Real-time Recalculated Score Card */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-slate-400">Kết quả thẩm định lại (Real-time Reassessment):</div>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-2 mt-0.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{safetyScore == null ? "Chưa đủ dữ kiện để kết luận hiệu quả can thiệp" : `Chỉ số mô phỏng hiện tại: ${scoreLabel}`}</span>
                  {comparison && comparison.scoreDelta > 0 && (
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/50">
                      +{comparison.scoreDelta} điểm
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
                  Đã giải quyết: <span className="font-bold text-emerald-400">{comparison?.resolved.length || 0}</span> nguy cơ
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700">
                  Còn tồn tại: <span className="font-bold text-amber-400">{comparison?.remaining.length || 0}</span> nguy cơ
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <span>So Sánh &amp; Xuất Kế Hoạch Báo Cáo (Bước 7)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: SO SÁNH VÀ BÁO CÁO KẾ HOẠCH HÀNH ĐỘNG */}
        {/* ========================================================================= */}
        {currentStep === 7 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in print:p-0 print:border-none print:shadow-none">
            {/* Action Bar (Print / Export) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 print:hidden">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <span>Bước 7: Báo Cáo Thẩm Định &amp; Kế Hoạch Cải Tạo An Toàn</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Tổng hợp so sánh Trước/Sau can thiệp và danh mục hành động thực tế cho gia đình.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const data = {
                      mode: "DEMO",
                      project: projectName,
                      resident: residentProfile,
                      room: currentRoom.name,
                      safetyScore,
                      comparison,
                      date: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `SafeHome-Report-${currentRoom.id}.json`;
                    a.click();
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="h-4 w-4 text-slate-600" />
                  <span>Xuất JSON</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-1.5 transition"
                >
                  <Printer className="h-4 w-4" />
                  <span>In / Lưu PDF Báo Cáo</span>
                </button>
              </div>
            </div>

            {/* Printable Report Document */}
            <div className="space-y-6">
              {/* Header Box */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-900 to-slate-900 text-white space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">
                      Báo Cáo Hoạch Định An Toàn Không Gian Sống
                    </h3>
                    <p className="text-xs text-teal-200 mt-0.5">Dự án: {projectName}</p>
                  </div>
                  <span className="text-[10px] font-mono bg-teal-800/80 px-2 py-1 rounded text-teal-100">
                    ID: {surveyId}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 pt-2 border-t border-teal-800/80 flex flex-wrap gap-4">
                  <span>Đối tượng: <strong>{residentProfile}</strong></span>
                  <span>Phòng: <strong>{currentRoom.name}</strong></span>
                  <span>Kích thước: <strong>{dimensions.length}m × {dimensions.width}m</strong></span>
                </div>
              </div>

              {/* Side-by-Side Comparison Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                  <div className="text-xs font-bold text-rose-900 flex items-center justify-between">
                    <span>HIỆN TRẠNG BAN ĐẦU (BASELINE)</span>
                    <span className="text-sm font-black text-rose-700">{comparison?.baselineScore || 38}/100</span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    Phát hiện các nguy cơ: thảm trải sàn chưa dán cố định, dây điện chạy ngang lối đi đêm, thiếu thanh tay vịn.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                  <div className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                    <span>SAU KHI CẢI THIỆN MÔ PHỎNG</span>
                    <span className="text-sm font-black text-emerald-700">{scoreLabel}</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Đã dán thảm, luồn nẹp dây điện vào chân tường, bổ sung thanh tay vịn Inox và đèn cảm biến đêm.
                  </p>
                </div>
              </div>

              {/* Actionable Implementation Plan */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Kế Hoạch Hành Động Thực Tế Ngoài Đời Thực
                </h4>

                <div className="space-y-2.5">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-800">Dán băng dính cố định toàn bộ mép thảm trải sàn</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Dùng băng dính chuyên dụng 2 mặt dán chặt 4 mép thảm xuống nền gạch hoặc lót tấm cao su chống trượt giác hút bên dưới.
                      </p>
                      <span className="text-[10px] font-bold text-teal-700 mt-1 inline-block">
                        Chi phí ước tính: Dưới 50.000 VNĐ • Thời gian: 15 phút
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-800">Luồn dây điện vào ống ghen / nẹp bán nguyệt áp sát chân tường</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Tuyệt đối không để dây sạc điện thoại hay dây quạt vắt ngang lối đi từ giường ra cửa phòng.
                      </p>
                      <span className="text-[10px] font-bold text-teal-700 mt-1 inline-block">
                        Chi phí ước tính: 30.000 - 80.000 VNĐ • Thời gian: 30 phút
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-800">Khoan lắp thanh tay vịn Inox 304 cạnh bồn cầu và buồng tắm</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Theo tiêu chuẩn ADA &amp; CDC STEADI, thanh tay vịn phải bắt nở vít vào tường gạch chắc chắn, chịu lực tỳ đè tối thiểu 250 lbs (~113 kg).
                      </p>
                      <span className="text-[10px] font-bold text-teal-700 mt-1 inline-block">
                        Chi phí ước tính: 250.000 - 450.000 VNĐ/thanh • Thời gian: 1 giờ
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                      4
                    </span>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-slate-800">Lắp đèn ngủ cảm biến chuyển động chân tường (Độ rọi &gt; 80 Lux)</div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Cắm đèn ở ổ điện cách mặt sàn 30cm trên lối đi ra nhà vệ sinh để tự động phát sáng khi người cao tuổi đặt chân xuống giường.
                      </p>
                      <span className="text-[10px] font-bold text-teal-700 mt-1 inline-block">
                        Chi phí ước tính: 80.000 - 150.000 VNĐ • Thời gian: Cắm dùng ngay
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-normal">
                <strong>Tuyên bố miễn trừ trách nhiệm y tế:</strong> Báo cáo này được tạo bởi hệ thống SafeHome 3D AI phục vụ mục đích giáo dục nhận thức và lập kế hoạch cải tạo môi trường sống trong gia đình. Báo cáo không cấu thành chẩn đoán y khoa, không thay thế cho đánh giá chuyên môn của bác sĩ vật lý trị liệu hay kỹ sư an toàn công trình.
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-between print:hidden">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Quay lại
              </button>
              <button
                onClick={() => {
                  setCurrentStep(1);
                  setWorkflowStatus("CREATED");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Bắt đầu khảo sát phòng mới</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RAG Medical Explanation Modal */}
      {showRAGModal && selectedFinding && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-700">
                <BookOpen className="h-5 w-5" />
                <h3 className="font-bold text-sm text-slate-900">Giải thích Y khoa &amp; Bằng chứng RAG</h3>
              </div>
              <button
                onClick={() => setShowRAGModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-700">Mối nguy: </span>
                <span className="text-slate-900 font-semibold">{selectedFinding.title}</span>
                <p className="text-[11px] text-slate-600 mt-1">{selectedFinding.description}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Cơ sở khoa học từ CDC STEADI &amp; WHO 2021:</span>
                </div>
                <p className="text-indigo-900 leading-relaxed text-[11px]">
                  Người cao tuổi thường có biên độ nâng chân thấp khi di chuyển ban đêm. Bất kỳ nếp gấp thảm hoặc dây cáp nào cao hơn 0.6cm cũng tạo thành lực cản đột ngột, làm lệch trọng tâm cơ thể và gây té ngã trực diện. Ngoài ra, việc dùng bồn rửa mặt thay cho tay vịn dễ dẫn đến gãy bản lề sứ gây chấn thương nặng.
                </p>
                <div className="text-[10px] text-indigo-700 font-mono pt-1 border-t border-indigo-200/60">
                  Nguồn: WHO (2021) Section 4.2 • CDC STEADI Environmental Assessment (2019)
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowRAGModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
