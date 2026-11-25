"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ClipboardCheck,
  Home,
  Bed,
  Bath,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bot,
  ShieldCheck,
  AlertTriangle,
  FileDown,
  RotateCcw,
  Eye,
  Camera,
  Layers,
  ChevronRight,
  Info,
  Maximize2,
  Trash2,
  RefreshCw,
  Send,
  Sliders,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SurveyQuestion, StructuredAnswer, RoomProfile, SurveyFindingItem, NLPInterpretationProposal } from "@/lib/survey/types";
import { getQuestionById } from "@/lib/survey/questionBank";

export default function AIGuidedSurveyPage() {
  // Survey and Room Selection
  const [surveys, setSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<{
    room: any;
    answersMap: Record<string, StructuredAnswer>;
    nextQuestion: SurveyQuestion | null;
    progress: any;
    profile: RoomProfile | null;
    findings: any[];
    photos: any[];
  } | null>(null);

  // Question & Interaction State
  const [currentQuestion, setCurrentQuestion] = useState<SurveyQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<any>(null);
  const [dimensionLength, setDimensionLength] = useState<string>("");
  const [dimensionWidth, setDimensionWidth] = useState<string>("");
  const [multiSelected, setMultiSelected] = useState<string[]>([]);
  const [freeTextValue, setFreeTextValue] = useState<string>("");

  // Natural Language Input Mode
  const [nlpInput, setNlpInput] = useState<string>("");
  const [isInterpretingNlp, setIsInterpretingNlp] = useState<boolean>(false);
  const [nlpProposal, setNlpProposal] = useState<NLPInterpretationProposal | null>(null);
  const [showNlpProposalModal, setShowNlpProposalModal] = useState<boolean>(false);

  // Status & Notification
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveNotification, setSaveNotification] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<"profile" | "findings" | "photos">("profile");

  // Modals
  const [showNewSurveyModal, setShowNewSurveyModal] = useState<boolean>(false);
  const [newSurveyName, setNewSurveyName] = useState<string>("");
  const [newSurveyResident, setNewSurveyResident] = useState<string>("");
  const [newSurveyRooms, setNewSurveyRooms] = useState<string[]>(["BEDROOM", "BATHROOM"]);

  const [showAddRoomModal, setShowAddRoomModal] = useState<boolean>(false);
  const [newRoomType, setNewRoomType] = useState<string>("BEDROOM");
  const [newRoomName, setNewRoomName] = useState<string>("");

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportData, setExportData] = useState<any>(null);

  // Real private image upload state (Task BUG-01 fix — no hardcoded mock simulateVision)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoConsent, setPhotoConsent] = useState<boolean>(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  // Load Surveys List
  const loadSurveys = useCallback(async () => {
    try {
      const res = await fetch("/api/surveys");
      const json = await res.json();
      if (json.success && json.surveys) {
        setSurveys(json.surveys);

        if (json.surveys.length > 0) {
          // If no active survey yet or current active was deleted, pick first
          setActiveSurvey((prev: any) => {
            const match = prev ? json.surveys.find((s: any) => s.id === prev.id) : null;
            return match || json.surveys[0];
          });
        } else {
          // Auto create initial demo survey
          const initRes = await fetch("/api/surveys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: "Nhà ở ông bà — Khảo sát an toàn mẫu",
              targetResident: "Người cao tuổi 75 tuổi, đi lại chậm",
              roomTypes: ["BEDROOM", "BATHROOM"],
            }),
          });
          const initJson = await initRes.json();
          if (initJson.success) {
            setSurveys([initJson.survey]);
            setActiveSurvey(initJson.survey);
          }
        }
      }
    } catch (err) {
      console.error("Lỗi nạp danh sách khảo sát:", err);
    }
  }, []);

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  // When active survey changes, pick active room
  useEffect(() => {
    if (activeSurvey && activeSurvey.rooms && activeSurvey.rooms.length > 0) {
      if (!activeRoomId || !activeSurvey.rooms.some((r: any) => r.id === activeRoomId)) {
        setActiveRoomId(activeSurvey.rooms[0].id);
      }
    } else {
      setActiveRoomId(null);
      setRoomData(null);
    }
  }, [activeSurvey, activeRoomId]);

  // Load Room Survey State
  const loadRoomState = useCallback(async (surveyId: string, roomId: string) => {
    try {
      const res = await fetch(`/api/surveys/${surveyId}/rooms/${roomId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setRoomData(json.data);

        // Set current question
        const nextQ = json.data.nextQuestion;
        setCurrentQuestion(nextQ);

        // Prepopulate inputs if answered already
        if (nextQ) {
          const existingAns = json.data.answersMap[nextQ.questionId];
          if (existingAns) {
            initInputsForQuestion(nextQ, existingAns.value);
          } else {
            resetInputsForQuestion(nextQ);
          }
        }
      }
    } catch (err) {
      console.error("Lỗi nạp trạng thái phòng:", err);
    }
  }, []);

  useEffect(() => {
    if (activeSurvey?.id && activeRoomId) {
      loadRoomState(activeSurvey.id, activeRoomId);
    }
  }, [activeSurvey?.id, activeRoomId, loadRoomState]);

  // Input helper
  const initInputsForQuestion = (q: SurveyQuestion, val: any) => {
    if (q.answerType === "YES_NO" || q.answerType === "SINGLE_CHOICE") {
      setSelectedAnswer(val);
    } else if (q.answerType === "DIMENSIONS") {
      if (val && typeof val === "object") {
        setDimensionLength(val.lengthM ? String(val.lengthM) : "");
        setDimensionWidth(val.widthM ? String(val.widthM) : "");
        setSelectedAnswer(val.isUnknown ? "UNKNOWN" : null);
      }
    } else if (q.answerType === "MULTI_CHOICE") {
      setMultiSelected(Array.isArray(val) ? val : []);
    } else if (q.answerType === "TEXT") {
      setFreeTextValue(typeof val === "string" ? val : "");
    }
    setNlpInput("");
  };

  const resetInputsForQuestion = (q: SurveyQuestion) => {
    setSelectedAnswer(null);
    setDimensionLength("");
    setDimensionWidth("");
    setMultiSelected([]);
    setFreeTextValue("");
    setNlpInput("");
  };

  // Submit Answer
  const submitAnswer = async (valToSubmit: any, source: string = "USER_SELECTED") => {
    if (!activeSurvey || !activeRoomId || !currentQuestion) return;

    setIsSaving(true);
    setSaveNotification("Đang lưu câu trả lời...");

    try {
      const res = await fetch(`/api/surveys/${activeSurvey.id}/rooms/${activeRoomId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.questionId,
          value: valToSubmit,
          answerSource: source,
          confirmationStatus: "CONFIRMED",
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSaveNotification("✓ Đã lưu câu trả lời & cập nhật hồ sơ phòng");
        setTimeout(() => setSaveNotification(null), 2500);

        // Refresh room state
        await loadRoomState(activeSurvey.id, activeRoomId);
        // Refresh survey list to update badge statuses
        const listRes = await fetch("/api/surveys");
        const listJson = await listRes.json();
        if (listJson.success) setSurveys(listJson.surveys);
      }
    } catch (err) {
      console.error("Lỗi khi lưu câu trả lời:", err);
      setSaveNotification("❌ Không thể lưu câu trả lời. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Natural Language interpretation
  const handleInterpretNlp = async () => {
    if (!currentQuestion || !nlpInput.trim()) return;

    setIsInterpretingNlp(true);
    try {
      const res = await fetch("/api/surveys/interpret-nlp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: currentQuestion.questionId,
          userInput: nlpInput.trim(),
        }),
      });

      const json = await res.json();
      if (json.success && json.proposal) {
        setNlpProposal(json.proposal);
        setShowNlpProposalModal(true);
      }
    } catch (err) {
      console.error("Lỗi phân tích NLP:", err);
    } finally {
      setIsInterpretingNlp(false);
    }
  };

  // Confirm NLP proposal
  const handleConfirmNlpProposal = () => {
    if (nlpProposal && nlpProposal.extractedValue !== null) {
      setShowNlpProposalModal(false);
      submitAnswer(nlpProposal.extractedValue, "NLP_EXTRACTED");
    }
  };

  // Go to previous question
  const handleGoBack = () => {
    if (!roomData || !currentQuestion) return;
    const applicableQuestions = Object.keys(roomData.answersMap)
      .map((qid) => getQuestionById(qid))
      .filter((q): q is SurveyQuestion => q !== undefined)
      .sort((a, b) => a.priority - b.priority);

    const currentIndex = applicableQuestions.findIndex((q) => q.questionId === currentQuestion.questionId);
    if (currentIndex > 0) {
      const prevQ = applicableQuestions[currentIndex - 1];
      setCurrentQuestion(prevQ);
      initInputsForQuestion(prevQ, roomData.answersMap[prevQ.questionId]?.value);
    }
  };

  // Select question from answer history
  const handleJumpToQuestion = (qId: string) => {
    const targetQ = getQuestionById(qId);
    if (targetQ && roomData) {
      setCurrentQuestion(targetQ);
      initInputsForQuestion(targetQ, roomData.answersMap[qId]?.value);
    }
  };

  // Create new survey
  const handleCreateSurvey = async () => {
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSurveyName.trim() || undefined,
          targetResident: newSurveyResident.trim() || undefined,
          roomTypes: newSurveyRooms,
          consentGiven: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowNewSurveyModal(false);
        setNewSurveyName("");
        setNewSurveyResident("");
        await loadSurveys();
        setActiveSurvey(json.survey);
        if (json.survey.rooms?.length > 0) {
          setActiveRoomId(json.survey.rooms[0].id);
        }
      }
    } catch (err) {
      console.error("Lỗi tạo khảo sát:", err);
    }
  };

  // Add room
  const handleAddRoom = async () => {
    if (!activeSurvey) return;
    try {
      const res = await fetch(`/api/surveys/${activeSurvey.id}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: newRoomType,
          name: newRoomName.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowAddRoomModal(false);
        setNewRoomName("");
        await loadSurveys();
        setActiveRoomId(json.room.id);
      }
    } catch (err) {
      console.error("Lỗi thêm phòng:", err);
    }
  };

  // Export survey
  const handleOpenExport = async () => {
    if (!activeSurvey) return;
    try {
      const res = await fetch(`/api/surveys/${activeSurvey.id}/export`);
      const json = await res.json();
      if (json.success) {
        setExportData(json.export);
        setShowExportModal(true);
      }
    } catch (err) {
      console.error("Lỗi xuất khảo sát:", err);
    }
  };

  // Real private photo upload -> /api/vision/images -> attach private fileUrl to survey room
  const handleUploadPhoto = async () => {
    if (!activeSurvey || !activeRoomId || !photoFile) return;
    if (!photoConsent) {
      setPhotoError("Vui lòng xác nhận sự đồng ý lưu ảnh trong hồ sơ gia đình trước khi tải lên.");
      return;
    }
    setIsUploadingPhoto(true);
    setPhotoError(null);
    try {
      const formData = new FormData();
      formData.append("file", photoFile);
      formData.append("roomId", activeRoomId);
      formData.append("consent", "true");
      const uploadRes = await fetch("/api/vision/images", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadJson.image?.fileUrl) {
        setPhotoError(uploadJson.error || "Không thể tải ảnh lên kho riêng tư.");
        return;
      }

      const attachRes = await fetch(`/api/surveys/${activeSurvey.id}/rooms/${activeRoomId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUrl: uploadJson.image.fileUrl,
          caption: `Ảnh khảo sát thực tế (${photoFile.name})`,
          consent: true,
        }),
      });
      const attachJson = await attachRes.json().catch(() => ({}));
      if (!attachRes.ok || !attachJson.success) {
        setPhotoError(attachJson.error || "Không thể đính kèm ảnh vào phòng khảo sát.");
        return;
      }
      setPhotoFile(null);
      await loadRoomState(activeSurvey.id, activeRoomId);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Lỗi kết nối khi tải ảnh.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <RefreshCw className="w-3 h-3 animate-spin" /> Đang khảo sát
          </span>
        );
      case "NEEDS_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <AlertTriangle className="w-3 h-3" /> Cần xác nhận
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Chưa bắt đầu
          </span>
        );
    }
  };

  const currentRoom = activeSurvey?.rooms?.find((r: any) => r.id === activeRoomId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">
                SafeHome AI Guided Survey
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Khảo sát thích ứng thông minh
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Chuyển hóa thông tin người dùng thành hồ sơ phòng số hóa và phát hiện nguy cơ té ngã theo thời gian thực
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveNotification && (
            <div className="text-xs font-medium px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 animate-fade-in flex items-center gap-1.5 shadow-sm">
              <Check className="w-3.5 h-3.5 text-teal-600" />
              {saveNotification}
            </div>
          )}

          <button
            onClick={handleOpenExport}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-300"
          >
            <FileDown className="w-4 h-4 text-slate-600" />
            Xuất dữ liệu JSON
          </button>

          <Link
            href="/digital-twin"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            Mô hình 3D Digital Twin
          </Link>
        </div>
      </div>

      {/* 3-Panel Main Workspace */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* ========================================================= */}
        {/* PANEL 1: LEFT NAVIGATOR (3 columns)                       */}
        {/* ========================================================= */}
        <div className="col-span-12 lg:col-span-3 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Survey Selector / Creator */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Hồ sơ nhà ở
              </span>
              <button
                onClick={() => setShowNewSurveyModal(true)}
                className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-200 transition-colors"
              >
                <Plus className="w-3 h-3" /> Tạo mới
              </button>
            </div>

            <div className="relative">
              <select
                value={activeSurvey?.id || ""}
                onChange={(e) => {
                  const s = surveys.find((item) => item.id === e.target.value);
                  if (s) setActiveSurvey(s);
                }}
                className="w-full text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    🏡 {s.name}
                  </option>
                ))}
              </select>
            </div>

            {activeSurvey && (
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>Đối tượng: {activeSurvey.targetResident || "Người cao tuổi"}</span>
                <span>{activeSurvey.rooms?.length || 0} phòng</span>
              </div>
            )}
          </div>

          {/* Rooms Navigation List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Các phòng khảo sát
              </span>
              <button
                onClick={() => setShowAddRoomModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Thêm phòng
              </button>
            </div>

            {activeSurvey?.rooms?.map((r: any) => {
              const isSelected = r.id === activeRoomId;
              const Icon = r.roomType === "BEDROOM" ? Bed : Bath;
              const isRoomCompleted = r.status === "COMPLETED";

              return (
                <div
                  key={r.id}
                  onClick={() => setActiveRoomId(r.id)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2",
                    isSelected
                      ? "bg-teal-50/70 border-teal-500 shadow-sm ring-1 ring-teal-500/50"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm",
                          isSelected
                            ? "bg-teal-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {r.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.roomType === "BEDROOM" ? "Phòng ngủ" : "Nhà vệ sinh"}
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(r.status)}
                  </div>

                  {/* Progress bar inside card if active */}
                  {isSelected && roomData?.progress && (
                    <div className="mt-1 pt-2 border-t border-teal-100">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                        <span>Tiến độ khảo sát</span>
                        <span className="font-bold text-teal-700">
                          {roomData.progress.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-600 rounded-full transition-all duration-300"
                          style={{ width: `${roomData.progress.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Answer History Quick Jump */}
            {roomData && Object.keys(roomData.answersMap).length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Lịch sử câu đã trả lời ({Object.keys(roomData.answersMap).length})
                </span>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {Object.entries(roomData.answersMap).map(([qid, ans]) => {
                    const qObj = getQuestionById(qid);
                    if (!qObj) return null;
                    const isCurrent = currentQuestion?.questionId === qid;

                    return (
                      <div
                        key={qid}
                        onClick={() => handleJumpToQuestion(qid)}
                        className={cn(
                          "px-2.5 py-1.5 text-xs rounded-lg flex items-center justify-between cursor-pointer transition-colors border",
                          isCurrent
                            ? "bg-teal-100 border-teal-300 text-teal-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        )}
                      >
                        <span className="truncate max-w-[180px]">
                          {qObj.priority}. {qObj.questionText}
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Summary & Privacy Guarantee */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-teal-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Bảo mật & Không thu thập y tế nhạy cảm
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              SafeHome chỉ lưu trữ các thông số môi trường không gian sống nhằm hỗ trợ phòng ngừa ngã.
            </p>
          </div>
        </div>

        {/* ========================================================= */}
        {/* PANEL 2: CENTER AI GUIDED CONVERSATION (5 columns)        */}
        {/* ========================================================= */}
        <div className="col-span-12 lg:col-span-5 bg-slate-50/70 border-r border-slate-200 flex flex-col h-full overflow-hidden">
          {/* Header of center panel */}
          <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                AI
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {currentRoom ? currentRoom.name : "Khảo sát AI"}
                </h2>
                <div className="text-xs text-slate-500">
                  Hỏi từng câu thích ứng • Tự động loại trừ câu hỏi dư thừa
                </div>
              </div>
            </div>

            {roomData?.progress && (
              <div className="text-right">
                <span className="text-xs font-bold text-teal-700">
                  {roomData.progress.answeredCount} / {roomData.progress.totalApplicable} câu
                </span>
                <span className="text-[11px] text-slate-400 block">
                  ({roomData.progress.progressPercent}% hoàn thành)
                </span>
              </div>
            )}
          </div>

          {/* Central Conversation / Question Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* If Room is completed and no current question */}
            {roomData?.progress?.isComplete && !currentQuestion ? (
              <div className="bg-white rounded-2xl p-8 border border-emerald-200 shadow-sm text-center flex flex-col items-center gap-4 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Khảo Sát Phòng Đã Hoàn Thành!
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 max-w-md">
                    Hệ thống đã thu thập đầy đủ các dữ kiện môi trường của {currentRoom?.name}.
                    Hồ sơ không gian sống đã được số hóa và kiểm tra sàng lọc nguy cơ.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full max-w-sm mt-2 text-left">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Tổng câu trả lời</span>
                    <div className="text-base font-bold text-slate-800">
                      {roomData.progress.answeredCount} câu
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500">Mối nguy ghi nhận</span>
                    <div className="text-base font-bold text-amber-700">
                      {roomData.findings.length} vấn đề
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full max-w-md">
                  <button
                    onClick={() => {
                      if (roomData.room.roomType) {
                        const firstQ = getQuestionById(roomData.room.roomType === "BEDROOM" ? "BED_001" : "BATH_001");
                        if (firstQ) {
                          setCurrentQuestion(firstQ);
                          initInputsForQuestion(firstQ, roomData.answersMap[firstQ.questionId]?.value);
                        }
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Xem lại câu trả lời
                  </button>

                  <Link
                    href="/digital-twin"
                    className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Eye className="w-4 h-4" /> Dựng mô hình 3D
                  </Link>
                </div>
              </div>
            ) : currentQuestion ? (
              <div className="space-y-6">
                {/* AI Assistant Question Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex-1 bg-white rounded-2xl rounded-tl-sm p-5 border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-semibold text-teal-700 uppercase tracking-wider">
                        Hạng mục: {currentQuestion.category} • Câu {currentQuestion.priority}
                      </span>
                      {currentQuestion.required && (
                        <span className="text-amber-600 font-medium">Bắt buộc</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {currentQuestion.questionText}
                    </h3>
                    {currentQuestion.helpText && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed flex items-start gap-1.5">
                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        {currentQuestion.helpText}
                      </p>
                    )}
                  </div>
                </div>

                {/* Question Input Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
                  {/* TYPE: YES_NO */}
                  {currentQuestion.answerType === "YES_NO" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentQuestion.options?.map((opt) => {
                        const isChosen = selectedAnswer === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => setSelectedAnswer(opt.value)}
                            className={cn(
                              "p-3.5 rounded-xl border text-left transition-all flex items-start justify-between",
                              isChosen
                                ? "bg-teal-50 border-teal-500 text-teal-900 ring-2 ring-teal-500/20 shadow-sm font-semibold"
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <span className="text-sm">{opt.label}</span>
                            {isChosen && <Check className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* TYPE: SINGLE_CHOICE */}
                  {currentQuestion.answerType === "SINGLE_CHOICE" && (
                    <div className="space-y-2">
                      {currentQuestion.options?.map((opt) => {
                        const isChosen = selectedAnswer === opt.value;
                        return (
                          <div
                            key={opt.value}
                            onClick={() => setSelectedAnswer(opt.value)}
                            className={cn(
                              "p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                              isChosen
                                ? "bg-teal-50 border-teal-500 text-teal-900 ring-1 ring-teal-500 shadow-sm font-semibold"
                                : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <span className="text-sm">{opt.label}</span>
                            {isChosen && <Check className="w-4 h-4 text-teal-600" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TYPE: MULTI_CHOICE */}
                  {currentQuestion.answerType === "MULTI_CHOICE" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentQuestion.options?.map((opt) => {
                        const isChecked = multiSelected.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              if (opt.isUnknown) {
                                setMultiSelected(["CHUA_RO"]);
                              } else {
                                const clean = multiSelected.filter((v) => v !== "CHUA_RO");
                                if (isChecked) {
                                  setMultiSelected(clean.filter((v) => v !== opt.value));
                                } else {
                                  setMultiSelected([...clean, opt.value]);
                                }
                              }
                            }}
                            className={cn(
                              "p-3 rounded-xl border text-left text-sm transition-all flex items-center justify-between",
                              isChecked
                                ? "bg-teal-50 border-teal-500 text-teal-900 font-semibold"
                                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <span>{opt.label}</span>
                            <div
                              className={cn(
                                "w-4 h-4 rounded border flex items-center justify-center",
                                isChecked
                                  ? "bg-teal-600 border-teal-600 text-white"
                                  : "border-slate-300"
                              )}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* TYPE: DIMENSIONS */}
                  {currentQuestion.answerType === "DIMENSIONS" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Chiều dài (mét)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="30"
                            placeholder="Ví dụ: 4.5"
                            value={dimensionLength}
                            onChange={(e) => {
                              setDimensionLength(e.target.value);
                              setSelectedAnswer(null);
                            }}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-1">
                            Chiều rộng (mét)
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max="30"
                            placeholder="Ví dụ: 3.5"
                            value={dimensionWidth}
                            onChange={(e) => {
                              setDimensionWidth(e.target.value);
                              setSelectedAnswer(null);
                            }}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnswer("UNKNOWN");
                          setDimensionLength("");
                          setDimensionWidth("");
                        }}
                        className={cn(
                          "w-full text-xs font-medium py-2 rounded-lg border transition-colors",
                          selectedAnswer === "UNKNOWN"
                            ? "bg-slate-200 border-slate-400 text-slate-800 font-bold"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        Tôi chưa đo / Chưa rõ kích thước chính xác
                      </button>
                    </div>
                  )}

                  {/* TYPE: TEXT */}
                  {currentQuestion.answerType === "TEXT" && (
                    <div>
                      <textarea
                        rows={3}
                        placeholder="Nhập ghi chú hoặc mô tả bổ sung của bạn tại đây..."
                        value={freeTextValue}
                        onChange={(e) => setFreeTextValue(e.target.value)}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Natural Language Free-text Option */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Hoặc trả lời tự nhiên bằng tiếng Việt:
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ví dụ: Có một cái thảm nhỏ cạnh giường nhưng hay bị trượt..."
                        value={nlpInput}
                        onChange={(e) => setNlpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleInterpretNlp();
                        }}
                        className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleInterpretNlp}
                        disabled={!nlpInput.trim() || isInterpretingNlp}
                        className="px-3 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50 text-xs font-medium rounded-lg border border-teal-200 flex items-center gap-1 transition-colors"
                      >
                        {isInterpretingNlp ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Send className="w-3 h-3" />
                        )}
                        AI Trích xuất
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons: Back, Skip, Next */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
                    </button>

                    <div className="flex items-center gap-2">
                      {!currentQuestion.required && (
                        <button
                          type="button"
                          onClick={() => submitAnswer("SKIPPED", "USER_SELECTED")}
                          className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          Bỏ qua
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                          let finalVal: any = null;
                          if (currentQuestion.answerType === "YES_NO" || currentQuestion.answerType === "SINGLE_CHOICE") {
                            finalVal = selectedAnswer;
                          } else if (currentQuestion.answerType === "DIMENSIONS") {
                            if (selectedAnswer === "UNKNOWN") {
                              finalVal = { lengthM: null, widthM: null, isUnknown: true };
                            } else {
                              finalVal = {
                                lengthM: parseFloat(dimensionLength) || null,
                                widthM: parseFloat(dimensionWidth) || null,
                                isUnknown: false,
                              };
                            }
                          } else if (currentQuestion.answerType === "MULTI_CHOICE") {
                            finalVal = multiSelected;
                          } else if (currentQuestion.answerType === "TEXT") {
                            finalVal = freeTextValue;
                          }

                          if (finalVal !== null && finalVal !== undefined) {
                            submitAnswer(finalVal, "USER_SELECTED");
                          }
                        }}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                      >
                        {isSaving ? "Đang lưu..." : "Xác nhận & Tiếp tục"}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                Vui lòng chọn phòng khảo sát ở bảng bên trái để tiếp tục.
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PANEL 3: RIGHT ROOM PROFILE & FINDINGS (4 columns)        */}
        {/* ========================================================= */}
        <div className="col-span-12 lg:col-span-4 bg-white flex flex-col h-full overflow-hidden border-l border-slate-200">
          {/* Tabs */}
          <div className="border-b border-slate-200 bg-slate-50/70 p-2 flex gap-1">
            <button
              onClick={() => setRightPanelTab("profile")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5",
                rightPanelTab === "profile"
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Layers className="w-3.5 h-3.5" /> Hồ sơ phòng
            </button>
            <button
              onClick={() => setRightPanelTab("findings")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 relative",
                rightPanelTab === "findings"
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" /> Mối nguy ({roomData?.findings?.length || 0})
              {roomData?.findings && roomData.findings.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-2" />
              )}
            </button>
            <button
              onClick={() => setRightPanelTab("photos")}
              className={cn(
                "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5",
                rightPanelTab === "photos"
                  ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Camera className="w-3.5 h-3.5" /> Ảnh & AI
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: STRUCTURED ROOM PROFILE */}
            {rightPanelTab === "profile" && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>Độ đầy đủ hồ sơ (Completeness)</span>
                    <span className="font-bold text-teal-700">
                      {roomData?.profile?.completenessScore || 0}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full transition-all duration-300"
                      style={{ width: `${roomData?.profile?.completenessScore || 0}%` }}
                    />
                  </div>
                </div>

                {roomData?.profile ? (
                  <div className="space-y-3 text-xs">
                    {/* Dimensions */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1 flex items-center justify-between">
                        <span>📐 Kích thước không gian</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-normal">
                          {roomData.profile.dimensions.measurementConfidenceType}
                        </span>
                      </div>
                      <div className="text-slate-600">
                        {roomData.profile.dimensions.lengthM && roomData.profile.dimensions.widthM
                          ? `${roomData.profile.dimensions.lengthM}m (Dài) × ${roomData.profile.dimensions.widthM}m (Rộng)`
                          : "Chưa rõ kích thước chính xác (Dùng kích thước mô phỏng chuẩn)"}
                      </div>
                    </div>

                    {/* Floor & Slip */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">
                        🧱 Tình trạng sàn nhà
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <div>Vật liệu: {roomData.profile.floor.material}</div>
                        <div>
                          Sàn thường xuyên ướt:{" "}
                          <span className={roomData.profile.floor.isWetReported ? "text-amber-600 font-semibold" : ""}>
                            {roomData.profile.floor.isWetReported === true ? "Có" : roomData.profile.floor.isWetReported === false ? "Không" : "Chưa rõ"}
                          </span>
                        </div>
                        <div>
                          Cảm giác trơn trượt:{" "}
                          <span className={roomData.profile.floor.isSlipperyReported ? "text-red-600 font-semibold" : ""}>
                            {roomData.profile.floor.isSlipperyReported === true ? "Có trơn trượt" : roomData.profile.floor.isSlipperyReported === false ? "Không trơn" : "Chưa rõ"}
                          </span>
                        </div>
                        {roomData.profile.floor.levelDifferenceReported && (
                          <div className="text-amber-600 font-medium">
                            ⚠️ Có gờ bậc chênh cao tại lối vào (~5cm)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lighting */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">
                        💡 Chiếu sáng & Ban đêm
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <div>
                          Ánh sáng ban đêm:{" "}
                          <span className={roomData.profile.lighting.adequateAtNight === false ? "text-red-600 font-semibold" : ""}>
                            {roomData.profile.lighting.adequateAtNight === true ? "Đủ sáng" : roomData.profile.lighting.adequateAtNight === false ? "Thiếu sáng / Tối" : "Chưa rõ"}
                          </span>
                        </div>
                        <div>
                          Đèn ngủ đầu giường:{" "}
                          <span>
                            {roomData.profile.lighting.nightLightPresent === true ? "Có" : roomData.profile.lighting.nightLightPresent === false ? "Không có" : "Chưa rõ"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rugs & Cables */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200">
                      <div className="font-bold text-slate-800 mb-1">
                        🧶 Thảm & Dây điện
                      </div>
                      <div className="space-y-1 text-slate-600">
                        <div>
                          Thảm trải sàn:{" "}
                          <span>{roomData.profile.rugs.present === true ? "Có thảm" : roomData.profile.rugs.present === false ? "Không có" : "Chưa rõ"}</span>
                        </div>
                        {roomData.profile.rugs.present && (
                          <div>
                            Cố định chống trượt:{" "}
                            <span className={roomData.profile.rugs.secured === false ? "text-red-600 font-semibold" : "text-emerald-600"}>
                              {roomData.profile.rugs.secured === true ? "Đã cố định" : "Chưa cố định"}
                            </span>
                          </div>
                        )}
                        <div>
                          Dây điện trên lối đi:{" "}
                          <span className={roomData.profile.electricalCables.onWalkway ? "text-red-600 font-semibold" : ""}>
                            {roomData.profile.electricalCables.onWalkway === true ? "Có dây điện" : roomData.profile.electricalCables.onWalkway === false ? "Không có" : "Chưa rõ"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Grab Bars (Bathroom) */}
                    {roomData.profile.roomType === "BATHROOM" && (
                      <div className="p-3 bg-white rounded-xl border border-slate-200">
                        <div className="font-bold text-slate-800 mb-1">
                          🚿 Thanh tay vịn hỗ trợ
                        </div>
                        <div className="space-y-1 text-slate-600">
                          <div>
                            Trang bị tay vịn:{" "}
                            <span className={roomData.profile.grabBars.present === false ? "text-amber-600 font-semibold" : ""}>
                              {roomData.profile.grabBars.present === true ? "Đã có" : roomData.profile.grabBars.present === false ? "Chưa có" : "Chưa rõ"}
                            </span>
                          </div>
                          {roomData.profile.grabBars.present && (
                            <div>Vị trí: {roomData.profile.grabBars.locations.join(", ") || "Chưa rõ"}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Hồ sơ phòng sẽ tự động số hóa ngay sau khi bạn trả lời các câu hỏi.
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCREENING FINDINGS */}
            {rightPanelTab === "findings" && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 mb-2">
                  Quy tắc sàng lọc môi trường minh bạch đối chiếu tài liệu WHO, CDC & Bộ Y tế:
                </div>

                {roomData?.findings && roomData.findings.length > 0 ? (
                  roomData.findings.map((f: any) => {
                    const isHigh = f.priority === "CAN_UU_TIEN_KIEM_TRA";
                    return (
                      <div
                        key={f.id || f.ruleId}
                        className={cn(
                          "p-3 rounded-xl border space-y-2 text-xs",
                          isHigh ? "bg-red-50/60 border-red-200" : "bg-amber-50/60 border-amber-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold",
                              isHigh ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                            )}
                          >
                            {isHigh ? "Cần ưu tiên kiểm tra" : "Nên xem xét cải thiện"}
                          </span>
                          <span className="text-[10px] text-slate-400">{f.ruleId}</span>
                        </div>

                        <div className="font-bold text-slate-900 leading-snug">
                          {f.title}
                        </div>

                        <div className="text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200/60">
                          {f.observedEvidence}
                        </div>

                        <div className="text-slate-700">
                          <span className="font-semibold text-slate-800">Khuyến nghị: </span>
                          {f.recommendation}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <div className="text-xs font-bold text-slate-800">
                      Chưa ghi nhận mối nguy môi trường đáng kể
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Các yếu tố được khảo sát hiện tại nằm trong mức độ an toàn hoặc đang chờ khảo sát tiếp.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: PHOTOS & AI VISION */}
            {rightPanelTab === "photos" && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-teal-600" />
                    Ảnh chụp phòng thực tế (Tùy chọn)
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Tải ảnh từ máy (JPEG, PNG, WebP) vào kho riêng tư của tài khoản. Để phân tích vật thể bằng AI Vision cần chuyển sang trang Thị giác AI.
                  </p>
                  <div className="mt-2.5 space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Chọn tệp ảnh phòng thực tế"
                      onChange={(e) => {
                        setPhotoFile(e.target.files?.[0] || null);
                        setPhotoError(null);
                      }}
                      className="block w-full text-xs text-slate-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-teal-50 file:text-teal-800 file:font-semibold"
                    />
                    <label className="flex items-start gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={photoConsent}
                        onChange={(e) => setPhotoConsent(e.target.checked)}
                        className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>Tôi xác nhận có quyền sử dụng ảnh và đồng ý lưu trong hồ sơ khảo sát riêng tư.</span>
                    </label>
                    {photoError && (
                      <div role="alert" className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5">
                        {photoError}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={!photoFile || !photoConsent || isUploadingPhoto}
                      className="w-full px-3 py-2 bg-teal-700 text-white font-medium rounded-lg text-xs hover:bg-teal-800 disabled:opacity-50"
                    >
                      {isUploadingPhoto ? "Đang tải..." : "Tải ảnh vào phòng khảo sát"}
                    </button>
                  </div>
                </div>

                {roomData?.photos && roomData.photos.length > 0 ? (
                  <div className="space-y-3">
                    {roomData.photos.map((p: any) => {
                      let detections: string[] = [];
                      if (p.detectedObjects) {
                        try {
                          detections = JSON.parse(p.detectedObjects);
                        } catch {
                          // keep empty
                        }
                      }
                      return (
                        <div key={p.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                          <img
                            src={p.fileUrl}
                            alt="Room photo"
                            className="w-full h-36 object-cover rounded-lg bg-slate-100"
                          />
                          {p.caption && <div className="text-slate-600">{p.caption}</div>}

                          {detections.length > 0 && (
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                              <span className="font-semibold text-blue-800 block mb-1">
                                🤖 AI Vision gợi ý (Cần xác nhận):
                              </span>
                              <ul className="list-disc pl-4 space-y-0.5 text-blue-700 text-[11px]">
                                {detections.map((d, i) => (
                                  <li key={i}>{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    Chưa có ảnh nào được tải lên cho phòng này.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Integration Actions at Bottom of Panel 3 */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
            <Link
              href="/ai-assistant"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
            >
              <Bot className="w-3.5 h-3.5 text-teal-600" />
              Hỏi Trợ lý Copilot về phòng này
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: PROPOSE NLP CONFIRMATION                           */}
      {/* ========================================================= */}
      {showNlpProposalModal && nlpProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Xác nhận câu trả lời AI trích xuất
                </h3>
                <p className="text-xs text-slate-500">
                  Độ tin cậy: {Math.round(nlpProposal.confidenceScore * 100)}%
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="text-slate-500">
                Ý kiến bạn nhập: <span className="text-slate-800 italic">"{nlpInput}"</span>
              </div>
              <div className="text-teal-900 font-semibold bg-teal-50 p-2.5 rounded-lg border border-teal-200">
                Giá trị đề xuất:{" "}
                <span className="font-bold">
                  {typeof nlpProposal.extractedValue === "object"
                    ? JSON.stringify(nlpProposal.extractedValue)
                    : String(nlpProposal.extractedValue)}
                </span>
              </div>
              <div className="text-slate-600 text-[11px]">{nlpProposal.rationale}</div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNlpProposalModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Hủy / Tự chọn lại
              </button>
              <button
                type="button"
                onClick={handleConfirmNlpProposal}
                className="flex-1 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
              >
                Xác nhận & Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREATE NEW SURVEY                                  */}
      {/* ========================================================= */}
      {showNewSurveyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Khởi tạo hồ sơ khảo sát nhà ở mới
            </h3>
            <p className="text-xs text-slate-500">
              Nhập tên định danh và các phòng dự kiến khảo sát an toàn môi trường.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên hoặc biệt danh nhà ở
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhà phố ông bà - Q1"
                  value={newSurveyName}
                  onChange={(e) => setNewSurveyName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Thông tin đối tượng người sử dụng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Người cao tuổi 75 tuổi, đi lại chậm"
                  value={newSurveyResident}
                  onChange={(e) => setNewSurveyResident(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Chọn các phòng cần khảo sát ban đầu:
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (newSurveyRooms.includes("BEDROOM")) {
                        setNewSurveyRooms(newSurveyRooms.filter((r) => r !== "BEDROOM"));
                      } else {
                        setNewSurveyRooms([...newSurveyRooms, "BEDROOM"]);
                      }
                    }}
                    className={cn(
                      "flex-1 p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5",
                      newSurveyRooms.includes("BEDROOM")
                        ? "bg-teal-50 border-teal-500 text-teal-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    <Bed className="w-3.5 h-3.5" /> Phòng ngủ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (newSurveyRooms.includes("BATHROOM")) {
                        setNewSurveyRooms(newSurveyRooms.filter((r) => r !== "BATHROOM"));
                      } else {
                        setNewSurveyRooms([...newSurveyRooms, "BATHROOM"]);
                      }
                    }}
                    className={cn(
                      "flex-1 p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5",
                      newSurveyRooms.includes("BATHROOM")
                        ? "bg-teal-50 border-teal-500 text-teal-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    )}
                  >
                    <Bath className="w-3.5 h-3.5" /> Nhà vệ sinh
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowNewSurveyModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleCreateSurvey}
                className="flex-1 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
              >
                Tạo khảo sát
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD ROOM                                           */}
      {/* ========================================================= */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-slate-200 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Thêm phòng khảo sát
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Loại phòng
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="BEDROOM">Phòng ngủ</option>
                  <option value="BATHROOM">Nhà vệ sinh</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Tên phòng
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Phòng ngủ tầng 2"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddRoom}
                className="flex-1 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
              >
                Thêm phòng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: EXPORT DATA                                        */}
      {/* ========================================================= */}
      {showExportModal && exportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-slate-200 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileDown className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Xuất dữ liệu khảo sát có cấu trúc (JSON)
                </h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Dữ liệu này được chuẩn hóa để nạp vào động cơ đánh giá rủi ro, phân tích Before/After hoặc dựng hình 3D.
            </p>

            <div className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono">
              <pre>{JSON.stringify(exportData, null, 2)}</pre>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `SafeHome_Survey_${exportData.surveyId}.json`;
                  a.click();
                }}
                className="py-2 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <FileDown className="w-3.5 h-3.5" /> Tải về máy (.JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

