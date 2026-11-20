"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit3,
  PlusCircle,
  Sparkles,
  RefreshCw,
  Sliders,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  BookOpen,
  Download,
  ChevronRight,
  HelpCircle,
  Trash2,
  Check,
  X,
  Compass,
  ArrowRight,
  SlidersHorizontal,
  Bot,
  ExternalLink,
  Info,
} from "lucide-react";
import { CATEGORY_TAXONOMY } from "@/lib/vision/taxonomy";
import {
  DetectionCategory,
  VisionDetection,
  VisionObservation,
  VisionClarificationQuestion,
  ViewpointType,
  NormalizedBoundingBox,
} from "@/lib/vision/types";
import { explainHazardFinding, FindingExplanation } from "@/lib/risk/explanationEngine";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { AssessmentSnapshot } from "@/lib/risk/types";

// Default mock room image for instant zero-setup demonstration
const DEFAULT_DEMO_BEDROOM =
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_DEMO_BATHROOM =
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop";

export default function AiVisionStudioPage() {
  const [activeRoomId, setActiveRoomId] = useState<string>("room-bedroom-1");
  const [activeRoomType, setActiveRoomType] = useState<"BEDROOM" | "BATHROOM">("BEDROOM");
  const [selectedViewpoint, setSelectedViewpoint] = useState<ViewpointType>("ENTRANCE");

  // Image list
  const [images, setImages] = useState<
    Array<{
      id: string;
      fileUrl: string;
      viewpoint: ViewpointType;
      caption?: string;
    }>
  >([
    {
      id: "img-demo-bed",
      fileUrl: DEFAULT_DEMO_BEDROOM,
      viewpoint: "ENTRANCE",
      caption: "Góc nhìn toàn cảnh phòng ngủ từ cửa",
    },
  ]);
  const [selectedImageId, setSelectedImageId] = useState<string>("img-demo-bed");

  // Detections & Observations state
  const [detections, setDetections] = useState<VisionDetection[]>([]);
  const [observations, setObservations] = useState<VisionObservation[]>([]);
  const [clarifications, setClarifications] = useState<VisionClarificationQuestion[]>([]);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"OBJECTS" | "CONCERNS" | "CLARIFY" | "RISK">("OBJECTS");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>("Đã sẵn sàng");

  // Canvas / Workspace interactions
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [drawCategory, setDrawCategory] = useState<DetectionCategory>("rug");

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Edit Label Modal
  const [editModalDetection, setEditModalDetection] = useState<VisionDetection | null>(null);
  const [newLabelInput, setNewLabelInput] = useState<string>("");
  const [newCategorySelect, setNewCategorySelect] = useState<DetectionCategory>("rug");

  // Copilot RAG Explanation modal
  const [copilotModalOpen, setCopilotModalOpen] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<FindingExplanation | null>(null);

  // Risk Reassessment State
  const [riskSnapshot, setRiskSnapshot] = useState<AssessmentSnapshot | null>(null);

  const selectedImage = images.find((img) => img.id === selectedImageId) || images[0];

  // Run initial analysis on first load
  useEffect(() => {
    handleRunAnalysis(selectedImage.id, activeRoomId, activeRoomType);
  }, [activeRoomType]);

  // Switch Room
  const handleSelectRoom = (roomId: string, type: "BEDROOM" | "BATHROOM") => {
    setActiveRoomId(roomId);
    setActiveRoomType(type);
    const demoUrl = type === "BEDROOM" ? DEFAULT_DEMO_BEDROOM : DEFAULT_DEMO_BATHROOM;
    const newImgId = `img-demo-${type.toLowerCase()}`;
    const newImgs = [
      {
        id: newImgId,
        fileUrl: demoUrl,
        viewpoint: "ENTRANCE" as ViewpointType,
        caption: type === "BEDROOM" ? "Toàn cảnh phòng ngủ" : "Toàn cảnh nhà vệ sinh",
      },
    ];
    setImages(newImgs);
    setSelectedImageId(newImgId);
  };

  // Run AI Vision Analysis API
  const handleRunAnalysis = async (imgId: string, rId: string, rType: string) => {
    setIsAnalyzing(true);
    setSyncStatus("Đang phân tích hình ảnh AI...");
    try {
      const res = await fetch(`/api/vision/images/${imgId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: rId, roomType: rType, viewpoint: selectedViewpoint }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDetections(data.data.detections || []);
        setObservations(data.data.observations || []);
        setClarifications(data.data.clarifications || []);
        setSyncStatus("Phân tích hoàn tất — Chờ người dùng xác nhận");
      }
    } catch (err) {
      console.error(err);
      setSyncStatus("Lỗi phân tích hình ảnh");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Upload Photo handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("roomId", activeRoomId);
    formData.append("viewpoint", selectedViewpoint);
    formData.append("caption", `Ảnh chụp góc ${selectedViewpoint}`);

    setIsAnalyzing(true);
    setSyncStatus("Đang tải ảnh và kiểm tra bảo mật...");
    try {
      const res = await fetch("/api/vision/images", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data) {
        const newImg = {
          id: data.data.id,
          fileUrl: data.data.fileUrl,
          viewpoint: data.data.viewpoint,
          caption: data.data.caption,
        };
        setImages((prev) => [newImg, ...prev]);
        setSelectedImageId(newImg.id);
        await handleRunAnalysis(newImg.id, activeRoomId, activeRoomType);
      } else {
        alert(data.error || "Lỗi tải ảnh lên.");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi kết nối khi tải ảnh.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Camera Capture
  const handleStartCamera = async () => {
    setCameraError(null);
    setCameraModalOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError(
        "Không thể truy cập camera. Vui lòng kiểm tra quyền cấp phép trên trình duyệt hoặc sử dụng tính năng tải ảnh từ máy tính."
      );
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      handleCloseCamera();

      const formData = new FormData();
      formData.append("file", blob, `camera_capture_${Date.now()}.jpg`);
      formData.append("roomId", activeRoomId);
      formData.append("viewpoint", selectedViewpoint);
      formData.append("caption", "Ảnh chụp trực tiếp từ camera");

      setIsAnalyzing(true);
      try {
        const res = await fetch("/api/vision/images", { method: "POST", body: formData });
        const data = await res.json();
        if (data.success && data.data) {
          const newImg = {
            id: data.data.id,
            fileUrl: data.data.fileUrl,
            viewpoint: data.data.viewpoint,
            caption: data.data.caption,
          };
          setImages((prev) => [newImg, ...prev]);
          setSelectedImageId(newImg.id);
          await handleRunAnalysis(newImg.id, activeRoomId, activeRoomType);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    }, "image/jpeg", 0.92);
  };

  const handleCloseCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  // Verification Actions (Confirm, Correct, Reject)
  const handleConfirmDetection = async (detId: string) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === detId ? { ...d, verificationStatus: "CONFIRMED" } : d))
    );
    try {
      await fetch(`/api/vision/detections/${detId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "CONFIRMED" }),
      });
    } catch {}
  };

  const handleRejectDetection = async (detId: string) => {
    setDetections((prev) =>
      prev.map((d) => (d.id === detId ? { ...d, verificationStatus: "REJECTED" } : d))
    );
    try {
      await fetch(`/api/vision/detections/${detId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "REJECTED" }),
      });
    } catch {}
  };

  const handleOpenEditLabel = (det: VisionDetection) => {
    setEditModalDetection(det);
    setNewLabelInput(det.userLabel || det.originalLabel);
    setNewCategorySelect(det.category);
  };

  const handleSaveEditLabel = async () => {
    if (!editModalDetection) return;
    const detId = editModalDetection.id;
    setDetections((prev) =>
      prev.map((d) =>
        d.id === detId
          ? {
              ...d,
              category: newCategorySelect,
              userLabel: newLabelInput,
              verificationStatus: "CORRECTED",
            }
          : d
      )
    );
    try {
      await fetch(`/api/vision/detections/${detId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategorySelect,
          userLabel: newLabelInput,
          verificationStatus: "CORRECTED",
        }),
      });
    } catch {}
    setEditModalDetection(null);
  };

  // Answer Clarification Question
  const handleAnswerClarification = async (questionId: string, answerValue: string) => {
    setClarifications((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, status: "ANSWERED", userResponse: answerValue } : q))
    );

    try {
      await fetch(`/api/vision/clarifications/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answerValue }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Sync to Survey and Re-assess Risk
  const handleSyncAndReassess = async () => {
    setSyncStatus("Đang đồng bộ hồ sơ phòng & chạy Động cơ Nguy cơ...");
    try {
      await fetch(`/api/vision/rooms/${activeRoomId}/sync-survey`, { method: "POST" });
      const res = await fetch(`/api/vision/rooms/${activeRoomId}/reassess`, { method: "POST" });
      const data = await res.json();
      if (data.success && data.data) {
        setRiskSnapshot(data.data);
        setActiveTab("RISK");
        setSyncStatus("Đã cập nhật kết quả Đánh giá Nguy cơ!");
      }
    } catch (e) {
      console.error(e);
      setSyncStatus("Lỗi đồng bộ hồ sơ");
    }
  };

  // Open Copilot RAG Explanation for first finding
  const handleOpenCopilotForRisk = () => {
    if (riskSnapshot && riskSnapshot.findings.length > 0) {
      const finding = riskSnapshot.findings[0];
      const explanation = explainHazardFinding(finding);
      setAiExplanation(explanation);
      setCopilotModalOpen(true);
    } else {
      // Create explanation for current observations
      const mockFinding = {
        id: "vis-risk-001",
        ruleId: activeRoomType === "BEDROOM" ? "RISK-001" : "RISK-005",
        title: activeRoomType === "BEDROOM" ? "Thảm trải sàn chưa cố định mép" : "Sàn nhà vệ sinh trơn trượt",
        hazardType: activeRoomType === "BEDROOM" ? "LOOSE_RUG" : "WET_FLOOR",
        description: "Phát hiện qua hình ảnh AI Vision kết hợp xác nhận của gia đình.",
        severityCategory: "HIGH" as any,
        evidence: {
          measuredValue: "Quan sát thị giác",
          threshold: "Mặt sàn an toàn",
          rationale: "Trượt ngã do bề mặt kém ma sát",
          sourceFields: ["rugs.present"],
        },
        recommendationText: "Khắc phục cố định mép hoặc đặt thảm cao su giác hút.",
        status: "ACTIVE" as any,
        referenceIds: ["SRC_WHO_2021", "SRC_CDC_STEADI_2023"],
        traceabilityTrail: [],
      };
      setAiExplanation(explainHazardFinding(mockFinding));
      setCopilotModalOpen(true);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 text-teal-700">
              <Camera className="h-6 w-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  SafeHome Vision Intelligence Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                  Multimodal AI
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Phân tích hình ảnh hiện trường, nhận diện vật thể &amp; đối chiếu an toàn môi trường cho người cao tuổi
              </p>
            </div>
          </div>
        </div>

        {/* Room Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 text-xs font-bold">
            <button
              onClick={() => handleSelectRoom("room-bedroom-1", "BEDROOM")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeRoomType === "BEDROOM"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Phòng ngủ chính
            </button>
            <button
              onClick={() => handleSelectRoom("room-bathroom-1", "BATHROOM")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeRoomType === "BATHROOM"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Nhà vệ sinh tầng 1
            </button>
          </div>

          <button
            onClick={() => handleRunAnalysis(selectedImage.id, activeRoomId, activeRoomType)}
            disabled={isAnalyzing}
            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isAnalyzing ? "animate-spin" : ""}`} />
            <span>Phân tích lại</span>
          </button>

          <Link
            href="/risk-assessment"
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
            <span>Bảng Đánh Giá Nguy Cơ</span>
          </Link>
        </div>
      </div>

      {/* Main 3-Panel Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ============================================================= */}
        {/* LEFT PANEL: IMAGE GALLERY & CAPTURE (3 cols)                  */}
        {/* ============================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-teal-600" />
                <span>Thư viện ảnh phòng ({images.length}/5)</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">Tối đa 5 ảnh</span>
            </div>

            {/* Viewpoint Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Góc chụp hiện tại
              </label>
              <select
                value={selectedViewpoint}
                onChange={(e) => setSelectedViewpoint(e.target.value as ViewpointType)}
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 outline-none focus:border-teal-500"
              >
                <option value="ENTRANCE">Toàn cảnh từ cửa ra vào</option>
                <option value="OPPOSITE_CORNER">Góc đối diện phòng</option>
                <option value="WALKWAY">Tập trung lối đi chính</option>
                <option value="CLOSE_UP">Chụp cận cảnh vật thể</option>
                <option value="OTHER">Góc nhìn khác</option>
              </select>
            </div>

            {/* Upload & Camera Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="cursor-pointer px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center justify-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-teal-600" />
                <span>Tải ảnh</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleStartCamera}
                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Camera className="h-3.5 w-3.5 text-indigo-600" />
                <span>Mở Camera</span>
              </button>
            </div>

            {/* Guidelines Hint */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-700 flex items-center gap-1">
                <Info className="h-3 w-3 text-teal-600" />
                <span>Hướng dẫn chụp chuẩn:</span>
              </div>
              <p>• Chụp toàn cảnh từ cửa bao quát cả mặt sàn và chân giường/bồn cầu.</p>
              <p>• Bật đủ đèn để AI nhận diện rõ vật cản và dây điện.</p>
            </div>

            {/* Thumbnails List */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              {images.map((img) => {
                const isSelected = img.id === selectedImageId;
                return (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImageId(img.id)}
                    className={`p-2 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-teal-50/60 border-teal-500 ring-2 ring-teal-500/20 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img
                      src={img.fileUrl}
                      alt="Room preview"
                      className="w-14 h-11 object-cover rounded-lg bg-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 truncate">
                          {img.viewpoint === "ENTRANCE"
                            ? "Cửa vào"
                            : img.viewpoint === "WALKWAY"
                            ? "Lối đi"
                            : "Cận cảnh"}
                        </span>
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-teal-500" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {img.caption || "Ảnh hiện trường"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ============================================================= */}
        {/* CENTER PANEL: VISION WORKSPACE & BOUNDING BOX CANVAS (6 cols) */}
        {/* ============================================================= */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
            {/* Toolbar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Ảnh đang soi xét ({selectedImage.viewpoint})
                </span>
                <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded">
                  {detections.length} vật thể phát hiện
                </span>
              </div>

              {/* View & Box Toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowBoxes(!showBoxes)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    showBoxes
                      ? "bg-teal-50 border-teal-200 text-teal-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                  title="Bật/Tắt khung bao bounding box"
                >
                  Khung bao
                </button>
                <button
                  onClick={() => setShowLabels(!showLabels)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    showLabels
                      ? "bg-teal-50 border-teal-200 text-teal-800"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}
                  title="Bật/Tắt nhãn tên vật thể"
                >
                  Nhãn tên
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.25))}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                  title="Phóng to"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                  title="Khôi phục góc nhìn"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Interactive Image Container with SVG Overlay */}
            <div className="relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center min-h-[380px] max-h-[520px]">
              <div
                className="relative transition-transform duration-200 origin-center inline-block max-w-full"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  src={selectedImage.fileUrl}
                  alt="Room Analysis"
                  className="max-h-[500px] w-auto object-contain block mx-auto select-none rounded-lg"
                />

                {/* SVG Bounding Boxes Overlay */}
                {showBoxes && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-auto"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {detections.map((det) => {
                      const isSelected = det.id === selectedDetectionId;
                      const isConfirmed = det.verificationStatus === "CONFIRMED";
                      const isRejected = det.verificationStatus === "REJECTED";
                      const isCorrected = det.verificationStatus === "CORRECTED";

                      const strokeColor = isRejected
                        ? "#f43f5e"
                        : isConfirmed
                        ? "#10b981"
                        : isCorrected
                        ? "#3b82f6"
                        : "#f59e0b";

                      const w = (det.bbox.xMax - det.bbox.xMin) * 100;
                      const h = (det.bbox.yMax - det.bbox.yMin) * 100;

                      return (
                        <g
                          key={det.id}
                          className="cursor-pointer group"
                          onClick={() => setSelectedDetectionId(det.id)}
                        >
                          {/* Box Rect */}
                          <rect
                            x={det.bbox.xMin * 100}
                            y={det.bbox.yMin * 100}
                            width={w}
                            height={h}
                            rx={0.8}
                            fill={strokeColor}
                            fillOpacity={isSelected ? 0.25 : 0.08}
                            stroke={strokeColor}
                            strokeWidth={isSelected ? 0.8 : 0.4}
                            strokeDasharray={isRejected ? "1.5,1.5" : undefined}
                            className="transition-all"
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Clean HTML Labels Overlay (Free from SVG scaling distortion) */}
                {showBoxes && showLabels && (
                  <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden select-none">
                    {detections.map((det) => {
                      const isSelected = det.id === selectedDetectionId;
                      const isConfirmed = det.verificationStatus === "CONFIRMED";
                      const isRejected = det.verificationStatus === "REJECTED";
                      const isCorrected = det.verificationStatus === "CORRECTED";

                      const strokeColor = isRejected
                        ? "#f43f5e"
                        : isConfirmed
                        ? "#10b981"
                        : isCorrected
                        ? "#3b82f6"
                        : "#f59e0b";

                      const leftPct = det.bbox.xMin * 100;
                      const topPct = det.bbox.yMin * 100;
                      const isNearTop = topPct < 7;

                      const labelText =
                        det.userLabel ||
                        CATEGORY_TAXONOMY[det.category]?.vietnameseName ||
                        det.originalLabel;

                      return (
                        <div
                          key={`label-${det.id}`}
                          style={{
                            position: "absolute",
                            left: `${Math.max(1, Math.min(88, leftPct))}%`,
                            top: `${Math.max(1, Math.min(94, topPct))}%`,
                            transform: isNearTop ? "translateY(4px)" : "translateY(-100%)",
                          }}
                          onClick={() => setSelectedDetectionId(det.id)}
                          className="pointer-events-auto cursor-pointer z-10 transition-all"
                        >
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white shadow-xs whitespace-nowrap transition-all ${
                              isSelected
                                ? "scale-105 ring-2 ring-white/90 shadow-md font-extrabold"
                                : "opacity-90 hover:opacity-100 hover:scale-102"
                            }`}
                            style={{ backgroundColor: strokeColor }}
                          >
                            <span>{labelText}</span>
                            <span className="opacity-85 text-[9px] font-medium">
                              ({Math.round(det.confidence * 100)}%)
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Selected Detection Action Card */}
            {selectedDetectionId && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                {(() => {
                  const sel = detections.find((d) => d.id === selectedDetectionId);
                  if (!sel) return null;
                  const tax = CATEGORY_TAXONOMY[sel.category];

                  return (
                    <>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {sel.userLabel || tax?.vietnameseName || sel.originalLabel}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                            Độ tin cậy AI: {Math.round(sel.confidence * 100)}%
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sel.verificationStatus === "CONFIRMED"
                                ? "bg-emerald-100 text-emerald-800"
                                : sel.verificationStatus === "REJECTED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {sel.verificationStatus === "CONFIRMED"
                              ? "Đã xác nhận"
                              : sel.verificationStatus === "REJECTED"
                              ? "Đã loại bỏ"
                              : "Chờ xác nhận"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tọa độ chuẩn hóa: [{sel.bbox.xMin}, {sel.bbox.yMin}, {sel.bbox.xMax}, {sel.bbox.yMax}]
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleConfirmDetection(sel.id)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition"
                        >
                          <Check className="h-3 w-3" />
                          <span>Đúng</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditLabel(sel)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center gap-1 transition"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Sửa nhãn</span>
                        </button>
                        <button
                          onClick={() => handleRejectDetection(sel.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1 transition"
                        >
                          <X className="h-3 w-3" />
                          <span>Sai</span>
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* RIGHT PANEL: AI INSIGHTS & HUMAN-IN-THE-LOOP (3 cols)         */}
        {/* ============================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
            {/* Tabs */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 text-[11px] font-bold">
              <button
                onClick={() => setActiveTab("OBJECTS")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  activeTab === "OBJECTS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Vật thể ({detections.length})
              </button>
              <button
                onClick={() => setActiveTab("CONCERNS")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  activeTab === "CONCERNS" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Mối nguy ({observations.length})
              </button>
              <button
                onClick={() => setActiveTab("CLARIFY")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  activeTab === "CLARIFY" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Xác minh ({clarifications.filter((c) => c.status === "PENDING").length})
              </button>
              <button
                onClick={() => setActiveTab("RISK")}
                className={`flex-1 py-1.5 rounded-lg text-center transition ${
                  activeTab === "RISK" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Đánh giá
              </button>
            </div>

            {/* TAB 1: DETECTED OBJECTS */}
            {activeTab === "OBJECTS" && (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {detections.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Chưa có vật thể nào được nhận diện.
                  </div>
                ) : (
                  detections.map((det) => {
                    const isSelected = det.id === selectedDetectionId;
                    const tax = CATEGORY_TAXONOMY[det.category];
                    const isConfirmed = det.verificationStatus === "CONFIRMED";
                    const isRejected = det.verificationStatus === "REJECTED";

                    return (
                      <div
                        key={det.id}
                        onClick={() => setSelectedDetectionId(det.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition space-y-1.5 ${
                          isSelected
                            ? "bg-teal-50/70 border-teal-500 shadow-sm"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {det.userLabel || tax?.vietnameseName || det.originalLabel}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {Math.round(det.confidence * 100)}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <span
                            className={`font-semibold ${
                              isConfirmed
                                ? "text-emerald-700"
                                : isRejected
                                ? "text-rose-700"
                                : "text-amber-700"
                            }`}
                          >
                            {isConfirmed
                              ? "✓ Đã xác nhận"
                              : isRejected
                              ? "✕ Đã từ chối"
                              : "Chờ xem xét"}
                          </span>

                          <div className="flex items-center gap-1">
                            {!isConfirmed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmDetection(det.id);
                                }}
                                className="p-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                title="Xác nhận đúng"
                              >
                                <Check className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditLabel(det);
                              }}
                              className="p-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                              title="Sửa nhãn"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                            {!isRejected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectDetection(det.id);
                                }}
                                className="p-1 rounded bg-rose-100 text-rose-800 hover:bg-rose-200"
                                title="Từ chối"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: POTENTIAL CONCERNS */}
            {activeTab === "CONCERNS" && (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {observations.map((obs) => (
                  <div
                    key={obs.id}
                    className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>{obs.observationType.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      {obs.description}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Yếu tố bất định: {obs.uncertaintyType}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: CLARIFICATION QUESTIONS */}
            {activeTab === "CLARIFY" && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                <div className="text-[11px] text-slate-500 font-medium">
                  AI đặt câu hỏi làm rõ các chi tiết hình ảnh chưa thể khẳng định 100%:
                </div>

                {clarifications.map((q) => {
                  const isAnswered = q.status === "ANSWERED";

                  return (
                    <div
                      key={q.id}
                      className={`p-3 rounded-xl border text-xs space-y-2.5 transition ${
                        isAnswered
                          ? "bg-slate-50 border-slate-200 opacity-70"
                          : "bg-teal-50/40 border-teal-200"
                      }`}
                    >
                      <div className="flex items-start gap-1.5">
                        <HelpCircle className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-slate-900 leading-snug">
                            {q.questionText}
                          </div>
                          {q.helpText && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {q.helpText}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-1.5 pl-5">
                        {q.options.map((opt) => {
                          const isSelected = q.userResponse === opt.value;

                          return (
                            <button
                              key={opt.value}
                              onClick={() => handleAnswerClarification(q.id, opt.value)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition border flex items-center justify-between ${
                                isSelected
                                  ? "bg-teal-600 text-white border-teal-600 font-bold"
                                  : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isSelected && <Check className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleSyncAndReassess}
                  className="w-full mt-2 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Cập nhật &amp; Đánh giá Nguy cơ</span>
                </button>
              </div>
            )}

            {/* TAB 4: RISK ASSESSMENT ENGINE RESULTS */}
            {activeTab === "RISK" && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {riskSnapshot ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        Điểm an toàn phòng ({riskSnapshot.roomName})
                      </div>
                      <div className="text-3xl font-black text-rose-600 mt-1">
                        {riskSnapshot.safetyScore}
                        <span className="text-xs text-slate-400 font-normal"> / 100</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Phát hiện {riskSnapshot.detectedCount} mối nguy kích hoạt
                      </div>
                    </div>

                    <div className="space-y-2">
                      {riskSnapshot.findings.map((f) => (
                        <div
                          key={f.id}
                          className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/50 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-900">{f.title}</span>
                            <span className="font-mono text-[9px] font-bold text-rose-700">
                              {f.ruleId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            {f.description}
                          </p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleOpenCopilotForRisk}
                      className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-1.5"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>Giải thích bằng SafeHome Copilot</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-slate-400">
                      Chưa kích hoạt tính toán rủi ro từ hình ảnh này.
                    </p>
                    <button
                      onClick={handleSyncAndReassess}
                      className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition"
                    >
                      Đồng bộ &amp; Đánh giá ngay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          <span className="font-bold text-slate-700">Trạng thái xử lý:</span>
          <span className="text-slate-500">{syncStatus}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncAndReassess}
            className="px-3.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 transition flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-teal-600" />
            <span>Đồng bộ Khảo sát AI</span>
          </button>

          <Link
            href="/risk-assessment"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center gap-1.5"
          >
            <span>Mở Bảng Đánh Giá Nguy Cơ</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: CAMERA LIVE CAPTURE VIEWFINDER                       */}
      {/* ============================================================= */}
      {cameraModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Chụp ảnh phòng từ Camera thiết bị
                </h3>
              </div>
              <button
                onClick={handleCloseCamera}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
                <div className="font-bold">Lỗi truy cập máy ảnh:</div>
                <p>{cameraError}</p>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-2xl" />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                Góc chụp: <strong>{selectedViewpoint}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCloseCamera}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Hủy bỏ
                </button>
                {!cameraError && (
                  <button
                    onClick={handleCaptureSnapshot}
                    className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>Chụp ảnh ngay</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 2: EDIT / CORRECT OBJECT LABEL MODAL                    */}
      {/* ============================================================= */}
      {editModalDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Hiệu chỉnh nhãn nhận diện
              </h3>
              <button
                onClick={() => setEditModalDetection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-600">Phân loại SafeHome:</label>
                <select
                  value={newCategorySelect}
                  onChange={(e) => setNewCategorySelect(e.target.value as DetectionCategory)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-medium"
                >
                  {Object.entries(CATEGORY_TAXONOMY).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.vietnameseName} ({key})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-600">Tên hiển thị tùy chỉnh:</label>
                <input
                  type="text"
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none font-medium"
                  placeholder="Ví dụ: Thảm len phòng ngủ"
                />
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl text-[10px] text-slate-500">
                Nhãn gốc của mô hình: <strong>{editModalDetection.originalLabel}</strong> (Độ tin cậy: {Math.round(editModalDetection.confidence * 100)}%)
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditModalDetection(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEditLabel}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition"
              >
                Lưu sửa đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL 3: COPILOT RAG EXPLANATION MODAL                        */}
      {/* ============================================================= */}
      {copilotModalOpen && aiExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    SafeHome Copilot — Giải thích từ hình ảnh &amp; RAG
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Mã quy tắc: {aiExplanation.ruleId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCopilotModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-100 text-xs space-y-1 text-purple-950 font-medium">
              <div className="font-bold text-purple-900 uppercase text-[10px]">
                Cơ sở y học lão khoa:
              </div>
              <p className="leading-relaxed">{aiExplanation.clinicalRationale}</p>
            </div>

            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="font-bold text-slate-900 uppercase text-[10px]">
                Cơ chế môi trường ghi nhận từ ảnh:
              </div>
              <p className="p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed">
                {aiExplanation.environmentalMechanism}
              </p>
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
              <div className="font-bold text-slate-900 uppercase text-[10px]">
                Dẫn chứng thẩm định WHO / CDC:
              </div>
              {aiExplanation.citations.map((c) => (
                <div key={c.citationNumber} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900 text-[11px]">
                    <span>[{c.citationNumber}] {c.organization} ({c.publicationYear})</span>
                    <a href={c.officialUrl} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline flex items-center gap-0.5">
                      <span>Nguồn</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-500 italic">"{c.supportingExcerpt}"</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCopilotModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
