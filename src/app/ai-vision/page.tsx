"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { createUnverifiedPhotoAssessment, type PhotoRiskAssessment } from "@/lib/vision/photoRiskAssessment";
import type { AssessmentSnapshot } from "@/lib/risk/types";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { buildVerifiedPhotoDraft } from "@/lib/vision/photoSceneDraft";
import { LiveCameraCaptureModal } from "@/components/camera/LiveCameraCaptureModal";

// Default mock room images for instant zero-setup demonstration
const DEFAULT_DEMO_BEDROOM =
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_DEMO_BATHROOM =
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop";

export interface StudioImageItem {
  id: string;
  fileUrl: string;
  viewpoint: ViewpointType;
  caption?: string;
  base64?: string;
  isCustom?: boolean;
}

export interface RiskCandidateSummary {
  present: boolean | "unknown";
  visible: boolean | "unknown";
  applicable: boolean;
  severity: string;
  evidence: string;
}

export interface ImageAnalysisData {
  detections: VisionDetection[];
  observations: VisionObservation[];
  clarifications: VisionClarificationQuestion[];
  riskSnapshot: PhotoRiskAssessment | AssessmentSnapshot;
  riskCandidates?: Record<string, RiskCandidateSummary>;
  modelId?: string;
  provider?: string;
  analyzedAt: string;
}


export default function AiVisionStudioPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);

  const [activeRoomId, setActiveRoomId] = useState<string>("room-bedroom-01");
  const [activeRoomType, setActiveRoomType] = useState<"BEDROOM" | "BATHROOM">("BEDROOM");
  const [selectedViewpoint, setSelectedViewpoint] = useState<ViewpointType>("ENTRANCE");

  // Image list
  const [images, setImages] = useState<StudioImageItem[]>([
    {
      id: "img-demo-bed",
      fileUrl: DEFAULT_DEMO_BEDROOM,
      viewpoint: "ENTRANCE",
      caption: "Góc nhìn toàn cảnh phòng ngủ từ cửa",
      isCustom: false,
    },
  ]);
  const [selectedImageId, setSelectedImageId] = useState<string>("img-demo-bed");

  // Image-specific analysis cache map
  const [analysisByImage, setAnalysisByImage] = useState<Record<string, ImageAnalysisData>>({});

  // Active Detections & Observations state for selected image
  const [detections, setDetections] = useState<VisionDetection[]>([]);
  const [observations, setObservations] = useState<VisionObservation[]>([]);
  const [clarifications, setClarifications] = useState<VisionClarificationQuestion[]>([]);
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"OBJECTS" | "CONCERNS" | "CLARIFY" | "RISK">("OBJECTS");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("Đã sẵn sàng");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageConsent, setImageConsent] = useState(false);

  // Canvas / Workspace interactions
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showBoxes, setShowBoxes] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const [drawCategory, setDrawCategory] = useState<DetectionCategory>("rug");

  // Camera modal state
  const [cameraModalOpen, setCameraModalOpen] = useState<boolean>(false);

  // Edit Label Modal
  const [editModalDetection, setEditModalDetection] = useState<VisionDetection | null>(null);
  const [newLabelInput, setNewLabelInput] = useState<string>("");
  const [newCategorySelect, setNewCategorySelect] = useState<DetectionCategory>("rug");

  // Copilot RAG Explanation modal
  const [copilotModalOpen, setCopilotModalOpen] = useState<boolean>(false);
  const [aiExplanation, setAiExplanation] = useState<FindingExplanation | null>(null);

  // Risk Reassessment State
  const [riskSnapshot, setRiskSnapshot] = useState<PhotoRiskAssessment | AssessmentSnapshot | null>(null);

  const selectedImage = images.find((img) => img.id === selectedImageId) || images[0];
  const activeAnalysis = analysisByImage[selectedImageId];

  // Restore saved photos without calling inference again on page reload.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/vision/rooms/${activeRoomId}/images`);
        const payload = await response.json();
        if (cancelled) return;
        if (response.ok && payload.success && payload.data?.length) {
          const saved: StudioImageItem[] = payload.data.map((item: any) => ({ id: item.id, fileUrl: item.fileUrl,
            viewpoint: item.viewpoint, caption: item.caption || "Ảnh đã lưu", isCustom: true }));
          const cache: Record<string, ImageAnalysisData> = {};
          for (const item of payload.data) if (item.latestAnalysis) cache[item.id] = {
            detections: item.latestAnalysis.detections, observations: item.latestAnalysis.observations,
            clarifications: item.latestAnalysis.clarifications,
            riskSnapshot: createUnverifiedPhotoAssessment(activeRoomType, item.caption),
            riskCandidates: item.latestAnalysis.riskCandidates,
            modelId: item.latestAnalysis.modelId,
            provider: item.latestAnalysis.provider,
            analyzedAt: item.latestAnalysis.completedAt,
          };
          setImages(saved); setSelectedImageId(saved[0].id); setAnalysisByImage(cache);
          const first = cache[saved[0].id];
          setAnalysisError(null);
          setDetections(first?.detections || []); setObservations(first?.observations || []);
          setClarifications(first?.clarifications || []); setRiskSnapshot(first?.riskSnapshot || null);
          setSyncStatus("Đã khôi phục ảnh và kết quả đã lưu; không gọi lại AI.");
          return;
        }
      } catch { if (cancelled) return; }
      const id = activeRoomType === "BEDROOM" ? "img-demo-bedroom" : "img-demo-bathroom";
      setImages([{ id, fileUrl: activeRoomType === "BEDROOM" ? DEFAULT_DEMO_BEDROOM : DEFAULT_DEMO_BATHROOM,
        viewpoint: "ENTRANCE", caption: "Ảnh minh họa", isCustom: false }]);
      setSelectedImageId(id);
      handleRunAnalysis(id, activeRoomId, activeRoomType);
    };
    load();
    return () => { cancelled = true; };
  }, [activeRoomId, activeRoomType]);

  useEffect(() => {
    if (!riskSnapshot) return;
    setAnalysisByImage(previous => previous[selectedImageId] ? { ...previous, [selectedImageId]: {
      ...previous[selectedImageId], detections, observations, clarifications, riskSnapshot,
    } } : previous);
  }, [detections, observations, clarifications, riskSnapshot, selectedImageId]);

  // Switch Room
  const handleSelectRoom = (roomId: string, type: "BEDROOM" | "BATHROOM") => {
    setDetections([]); setObservations([]); setClarifications([]); setRiskSnapshot(null);
    setActiveRoomId(roomId);
    setActiveRoomType(type);
    const demoUrl = type === "BEDROOM" ? DEFAULT_DEMO_BEDROOM : DEFAULT_DEMO_BATHROOM;
    const newImgId = `img-demo-${type.toLowerCase()}`;
    const newImgs: StudioImageItem[] = [
      {
        id: newImgId,
        fileUrl: demoUrl,
        viewpoint: "ENTRANCE" as ViewpointType,
        caption: type === "BEDROOM" ? "Toàn cảnh phòng ngủ" : "Toàn cảnh nhà vệ sinh",
        isCustom: false,
      },
    ];
    setImages(newImgs);
    setSelectedImageId(newImgId);
  };

  // Run AI Vision Analysis API (supports passing real image base64 & explicit caption)
  const handleRunAnalysis = async (
    imgId: string,
    rId: string,
    rType: "BEDROOM" | "BATHROOM",
    base64Payload?: string,
    captionPayload?: string
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setDetections([]);
    setObservations([]);
    setClarifications([]);
    setRiskSnapshot(null);
    setSyncStatus("Đang phân tích hình ảnh AI đa phương thức...");

    // Find base64 & caption from current image list or explicit parameters
    const targetImg = images.find((i) => i.id === imgId);
    const base64 = base64Payload || targetImg?.base64;
    const caption = captionPayload ?? targetImg?.caption ?? "";

    try {
      const res = await fetch(`/api/vision/images/${imgId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: rId,
          roomType: rType,
          viewpoint: selectedViewpoint,
          caption,
          imageBufferBase64: base64,
          consent: imageConsent,
        }),
        signal: AbortSignal.timeout(135000),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data) {
        const newDets: VisionDetection[] = data.data.detections || [];
        const newObs: VisionObservation[] = data.data.observations || [];
        const newClars: VisionClarificationQuestion[] = data.data.clarifications || [];

        // Compute tailored clinical risk assessment for THIS specific image
        const newRisk = createUnverifiedPhotoAssessment(rType, caption);

        const analysisEntry: ImageAnalysisData = {
          detections: newDets,
          observations: newObs,
          clarifications: newClars,
          riskSnapshot: newRisk,
          riskCandidates: data.data.riskCandidates,
          modelId: data.data.modelId,
          provider: data.data.provider,
          analyzedAt: new Date().toISOString(),
        };

        setAnalysisByImage((prev) => ({ ...prev, [imgId]: analysisEntry }));
        setDetections(newDets);
        setObservations(newObs);
        setClarifications(newClars);
        setRiskSnapshot(newRisk);
        if (data.persisted && data.image?.fileUrl) setImages(previous => previous.map(image => image.id === imgId ?
          { ...image, fileUrl: data.image.fileUrl, base64: undefined } : image));
        setSyncStatus(`${data.data.modelId === "mock-demo-fallback-dataset" ? "Dữ liệu minh họa" : "Phân tích hoàn tất"}: ${newDets.length} vật thể; ${newRisk.needsVerificationCount} nguy cơ cần kiểm tra.`);
      } else {
        const msg = data?.error || `Không thể hoàn tất phân tích hình ảnh (HTTP ${res.status}).`;
        setAnalysisError(msg);
        setSyncStatus(msg);
      }
    } catch (err) {
      console.error(err);
      const msg = "Lỗi kết nối hoặc hết thời gian chờ khi phân tích hình ảnh.";
      setAnalysisError(msg);
      setSyncStatus(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Switch active image & load corresponding detections & risk evaluation
  const handleSelectImage = (img: StudioImageItem) => {
    setSelectedImageId(img.id);
    setSelectedViewpoint(img.viewpoint);
    setAnalysisError(null);
    if (analysisByImage[img.id]) {
      const cached = analysisByImage[img.id];
      setDetections(cached.detections);
      setObservations(cached.observations);
      setClarifications(cached.clarifications);
      setRiskSnapshot(cached.riskSnapshot);
      setSyncStatus(`Đã tải kết quả phân tích cho: ${img.caption || img.id}`);
    } else {
      handleRunAnalysis(img.id, activeRoomId, activeRoomType, img.base64, img.caption);
    }
  };

  // Delete an image from studio gallery
  const handleDeleteImage = async (imgId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const image = images.find(i => i.id === imgId);
      if (image?.isCustom && image.fileUrl.startsWith("/api/vision/images/")) {
        const response = await fetch(`/api/vision/images/${encodeURIComponent(imgId)}`, { method: "DELETE" });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body.error || "Không xóa được ảnh.");
      }
      const remaining = images.filter(i => i.id !== imgId);
      setAnalysisByImage(previous => { const next = { ...previous }; delete next[imgId]; return next; });
      if (!remaining.length) remaining.push({ id: "img-demo-bed", fileUrl: activeRoomType === "BEDROOM" ? DEFAULT_DEMO_BEDROOM : DEFAULT_DEMO_BATHROOM, viewpoint: "ENTRANCE", caption: "Ảnh minh họa", isCustom: false });
      setImages(remaining);
      if (selectedImageId === imgId) {
        setSelectedImageId(remaining[0].id); setAnalysisError(null); setDetections([]); setObservations([]); setClarifications([]); setRiskSnapshot(null);
      }
      setSyncStatus("Đã xóa ảnh và thu hồi xác nhận phụ thuộc ảnh. Hãy đánh giá lại hồ sơ.");
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : "Không xóa được ảnh."); }
  };

  // Core file processor for both input pick & drag-and-drop
  const processUploadFile = (file: File) => {
    if (!file) return;
    if (!imageConsent) { setSyncStatus("Hãy đồng ý xử lý ảnh trước khi tải hoặc chụp ảnh."); return; }

    if (!file.type.startsWith("image/")) {
      alert("Vui lòng chọn một tệp hình ảnh hợp lệ (JPG, PNG, WebP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Dung lượng ảnh vượt quá 10MB. Vui lòng chọn ảnh nhỏ hơn.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64Data = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      const newImgId = `img-user-${Date.now()}`;

      const newImgItem: StudioImageItem = {
        id: newImgId,
        fileUrl: dataUrl,
        viewpoint: selectedViewpoint,
        caption: file.name.replace(/\.[^/.]+$/, ""),
        base64: base64Data,
        isCustom: true,
      };

      // 1. Immediately display new image in gallery & on canvas
      setImages((prev) => [newImgItem, ...prev]);
      setSelectedImageId(newImgItem.id);

      // 2. Clear old detections so they do not show over the new image during analysis
      setDetections([]);
      setObservations([]);
      setClarifications([]);
      setRiskSnapshot(null);

      // 3. Clear file input value to allow re-uploading same file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // 4. Run analysis with real image base64 & explicit caption to avoid state async delay
      await handleRunAnalysis(newImgId, activeRoomId, activeRoomType, base64Data, newImgItem.caption);


    };

    reader.readAsDataURL(file);
  };

  // Upload Photo handler from file input
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadFile(file);
    }
  };

  // Camera Capture
  const handleStartCamera = () => {
    setCameraModalOpen(true);
  };

  const handleLiveCameraCapture = (file: File) => {
    processUploadFile(file);
    setCameraModalOpen(false);
  };

  // Only confirmed objects enter a photo draft. Its geometry is not a measurement.
  const handleBuild3DFromImage = () => {
    try {
      const imgEl = previewImgRef.current;
      const imageAspect =
        imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0
          ? imgEl.naturalWidth / imgEl.naturalHeight
          : 4 / 3;
      const draft = buildVerifiedPhotoDraft(
        detections,
        activeRoomType,
        selectedImage.caption || "Ảnh hiện trường",
        selectedImage.fileUrl ? [selectedImage.fileUrl] : undefined,
        {
          viewpoint: selectedImage.viewpoint || selectedViewpoint,
          imageAspect,
        }
      );
      useSimulationStore.getState().loadReconstructedRoom(draft);
      router.push("/digital-twin");
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : "Chưa thể dựng 3D."); }
  };

  // Verification Actions (Confirm, Correct, Reject)
  const handleConfirmDetection = async (detId: string) => {
    try {
      const response = await fetch(`/api/vision/detections/${detId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "CONFIRMED" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Không lưu được xác nhận.");
      setDetections(previous => previous.map(d => d.id === detId ? { ...d, ...result.data } : d));
      setSyncStatus("Đã lưu xác nhận vật thể.");
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : "Không lưu được xác nhận."); }
  };

  const handleRejectDetection = async (detId: string) => {
    try {
      const response = await fetch(`/api/vision/detections/${detId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus: "REJECTED" }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Không lưu được thay đổi.");
      setDetections(previous => previous.map(d => d.id === detId ? { ...d, ...result.data } : d));
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : "Không lưu được thay đổi."); }
  };

  const handleOpenEditLabel = (det: VisionDetection) => {
    setEditModalDetection(det);
    setNewLabelInput(det.userLabel || det.originalLabel);
    setNewCategorySelect(det.category);
  };

  const handleSaveEditLabel = async () => {
    if (!editModalDetection) return;
    const detId = editModalDetection.id;
    try {
      const response = await fetch(`/api/vision/detections/${detId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategorySelect,
          userLabel: newLabelInput,
          verificationStatus: "CORRECTED",
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Không lưu được nhãn đã sửa.");
      setDetections(previous => previous.map(d => d.id === detId ? { ...d, ...result.data } : d));
      setEditModalDetection(null);
      setSyncStatus("Đã lưu nhãn vật thể đã sửa.");
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : "Không lưu được nhãn đã sửa."); }
  };

  // Answer Clarification Question
  const handleAnswerClarification = async (questionId: string, answerValue: string) => {
    try {
      const response = await fetch(`/api/vision/clarifications/${questionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answerValue }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Không lưu được câu trả lời.");
      setClarifications(previous => previous.map(q => q.id === questionId ? { ...q, status: "ANSWERED", userResponse: answerValue } : q));
      setRiskSnapshot(createUnverifiedPhotoAssessment(activeRoomType, selectedImage.caption));
      setSyncStatus("Đã lưu câu trả lời và cập nhật hồ sơ; hãy đánh giá lại.");
    } catch (error) { setSyncStatus(error instanceof Error ? error.message : "Không lưu được câu trả lời."); }
  };

  // Sync to Survey and Re-assess Risk
  const handleSyncAndReassess = async () => {
    setSyncStatus("Đang đồng bộ hồ sơ phòng & chạy Động cơ Nguy cơ...");
    try {
      const res = await fetch(`/api/vision/rooms/${activeRoomId}/reassess`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Không thể đánh giá lại hồ sơ.");
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
      setSyncStatus("Chưa có nguy cơ được xác nhận để giải thích. Hãy bổ sung khảo sát và kiểm tra tại nhà.");
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
              onClick={() => handleSelectRoom("room-bedroom-01", "BEDROOM")}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeRoomType === "BEDROOM"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Phòng ngủ chính
            </button>
            <button
              onClick={() => handleSelectRoom("room-bathroom-01", "BATHROOM")}
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
            onClick={() => handleRunAnalysis(selectedImage.id, activeRoomId, activeRoomType, selectedImage.base64, selectedImage.caption)}
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
            <label className="flex gap-2 text-xs text-slate-600">
              <input id="vision-photo-consent" type="checkbox" checked={imageConsent} onChange={e => setImageConsent(e.target.checked)} />
              Tôi có quyền sử dụng ảnh và đồng ý phân tích, lưu ảnh trong hồ sơ. Khi dùng Gemini, ảnh sẽ được gửi tới dịch vụ AI.
            </label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label
                htmlFor="vision-file-upload-input"
                className="cursor-pointer px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Upload className="h-3.5 w-3.5 text-teal-600" />
                <span>Tải ảnh</span>
                <input
                  id="vision-file-upload-input"
                  ref={fileInputRef}
                  type="file"
                  disabled={!imageConsent}
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleStartCamera}
                disabled={!imageConsent}
                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
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
                    onClick={() => handleSelectImage(img)}
                    className={`group p-2 rounded-xl border cursor-pointer transition flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-teal-50/60 border-teal-500 ring-2 ring-teal-500/20 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <img
                      src={img.fileUrl}
                      alt="Room preview"
                      className="w-14 h-11 object-cover rounded-lg bg-slate-100 shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 truncate">
                          {img.caption || (img.viewpoint === "ENTRANCE"
                            ? "Cửa vào"
                            : img.viewpoint === "WALKWAY"
                            ? "Lối đi"
                            : "Cận cảnh")}
                        </span>
                        <div className="flex items-center gap-1">
                          {img.isCustom && (
                            <button
                              onClick={(e) => handleDeleteImage(img.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 transition rounded"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-teal-500" />
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {analysisByImage[img.id]
                          ? `Đã phân tích (${analysisByImage[img.id].detections.length} vật thể)`
                          : img.caption || "Ảnh hiện trường"}
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

            {/* Analysis Error Alert Banner */}
            {analysisError && (
              <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{analysisError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRunAnalysis(selectedImage.id, activeRoomId, activeRoomType, selectedImage.base64, selectedImage.caption)}
                  disabled={isAnalyzing}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shrink-0 transition"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* Interactive Image Container with SVG Overlay & Drag-Drop */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processUploadFile(file);
              }}
              className={`relative overflow-hidden rounded-xl bg-slate-900 border flex items-center justify-center min-h-[380px] max-h-[520px] transition ${
                isDragging ? "border-2 border-dashed border-teal-400 bg-teal-950/40" : "border-slate-800"
              }`}
            >
              {isDragging && (
                <div className="absolute inset-0 z-30 bg-teal-900/70 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
                  <Upload className="h-10 w-10 text-teal-300 animate-bounce mb-2" />
                  <span className="font-bold text-sm">Thả ảnh vào đây</span>
                  <span className="text-xs text-teal-200 mt-1">Hệ thống sẽ tải ảnh và kích hoạt phân tích ngay</span>
                </div>
              )}
              {isAnalyzing && (
                <div className="absolute inset-0 z-20 bg-slate-900/65 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none animate-fade-in">
                  <div className="relative mb-3">
                    <RefreshCw className="h-8 w-8 text-teal-400 animate-spin" />
                    <Sparkles className="h-4 w-4 text-amber-300 absolute -top-1 -right-1 animate-pulse" />
                  </div>
                  <span className="font-bold text-xs text-white tracking-wide">
                    AI đang quét &amp; nhận diện vật thể...
                  </span>
                  <span className="text-[10px] text-teal-200 mt-1">
                    Trích xuất bounding box và đối chiếu nguy cơ té ngã
                  </span>
                </div>
              )}
              <div
                className="relative transition-transform duration-200 origin-center inline-block max-w-full"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  ref={previewImgRef}
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
                      const isConfirmed = ["CONFIRMED", "CORRECTED"].includes(det.verificationStatus);
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
                      const isConfirmed = ["CONFIRMED", "CORRECTED"].includes(det.verificationStatus);
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
                  analysisError ? (
                    <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-xs text-rose-900 space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-rose-800">
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                        <span>Phân tích ảnh chưa thành công</span>
                      </div>
                      <p className="text-[11px] text-rose-700 leading-relaxed">{analysisError}</p>
                    </div>
                  ) : activeAnalysis ? (
                    <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/60 text-xs text-amber-950 space-y-2">
                      <div className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Info className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>Đã quét ảnh ({activeAnalysis.modelId || "Gemini"}) — 0 đồ nội thất</span>
                      </div>
                      {activeAnalysis.riskCandidates && (
                        <ul className="space-y-1 text-[11px] text-amber-900/90 list-disc pl-4">
                          {Object.entries(activeAnalysis.riskCandidates)
                            .filter(([, r]) => r.applicable && r.evidence)
                            .slice(0, 4)
                            .map(([id, r]) => (
                              <li key={id}>
                                <span className="font-semibold">{id}:</span> {r.evidence}
                              </li>
                            ))}
                        </ul>
                      )}
                      <p className="text-[11px] text-amber-800 leading-relaxed pt-1 border-t border-amber-200/70">
                        Ảnh chụp cần thấy rõ mặt sàn, giường/ghế/thảm/dây điện để AI vẽ khung bao. Bạn có thể chụp góc rộng hơn hoặc tự vẽ khung bao thủ công ở phía trên.
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Chưa có vật thể nào được nhận diện.
                    </div>
                  )
                ) : (
                  detections.map((det) => {
                    const isSelected = det.id === selectedDetectionId;
                    const tax = CATEGORY_TAXONOMY[det.category];
                    const isConfirmed = ["CONFIRMED", "CORRECTED"].includes(det.verificationStatus);
                    const isRejected = det.verificationStatus === "REJECTED";

                    return (
                      <div
                        key={det.id}
                        data-detection-id={det.id}
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
                            {det.verificationStatus === "CORRECTED" ? "✓ Đã điều chỉnh" : isConfirmed
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
                {observations.length === 0 ? (
                  activeAnalysis?.riskCandidates ? (
                    <div className="space-y-2">
                      {Object.entries(activeAnalysis.riskCandidates)
                        .filter(([, r]) => r.applicable && r.evidence)
                        .map(([id, r]) => (
                          <div
                            key={id}
                            className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between font-bold text-amber-900">
                              <span>{id}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                {r.visible === true ? "Quan sát được" : "Cần kiểm tra thực tế"}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-700 leading-relaxed">{r.evidence}</p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 text-center space-y-2">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto" />
                      <div className="font-bold text-xs text-emerald-900">
                        Chưa có đề xuất nguy cơ từ ảnh
                      </div>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Hãy bổ sung khảo sát và kiểm tra thực tế để xác định mức độ an toàn.
                      </p>
                    </div>
                  )
                ) : (
                  observations.map((obs) => (
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
                  ))
                )}
              </div>
            )}

            {/* TAB 3: CLARIFICATION QUESTIONS */}
            {activeTab === "CLARIFY" && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {clarifications.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-center space-y-2">
                    <ShieldCheck className="h-7 w-7 text-teal-600 mx-auto" />
                    <div className="font-bold text-xs text-slate-800">
                      Chưa có câu hỏi xác nhận cho ảnh này
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Bạn có thể hoàn thành bảng khảo sát để bổ sung thông tin còn thiếu.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Hãy xác nhận những thông tin bạn đã kiểm tra tại nhà; chọn chưa rõ nếu chưa kiểm tra:
                    </div>

                    {clarifications.map((q) => {
                      const isAnswered = q.status === "ANSWERED";

                      return (
                        <div
                          key={q.id}
                          data-question-id={q.surveyQuestionId}
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
                                  data-answer-value={opt.value}
                                  aria-pressed={isSelected}
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
                  </>
                )}
              </div>
            )}

            {/* TAB 4: RISK ASSESSMENT ENGINE RESULTS */}
            {activeTab === "RISK" && (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {riskSnapshot ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        {riskSnapshot.safetyScore === null ? "Cần xác nhận hiện trường" : "Điểm từ hồ sơ khảo sát"} ({riskSnapshot.roomName})
                      </div>
                      <div
                        className="text-lg font-bold mt-1 text-amber-700"
                      >
                        {riskSnapshot.safetyScore === null ? "Chưa đủ dữ liệu để chấm điểm" : `${riskSnapshot.safetyScore} / 100`}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {riskSnapshot.needsVerificationCount} nguy cơ cần bổ sung khảo sát
                      </div>
                    </div>

                    <div className="space-y-2">
                      {riskSnapshot.findings.length === 0 ? (
                        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1.5 text-center">
                          <div className="flex items-center justify-center gap-1.5 font-bold text-amber-900">
                            <HelpCircle className="h-4 w-4 text-amber-600" />
                            <span>Chưa xác định mức độ an toàn</span>
                          </div>
                          <p className="text-[11px] text-amber-700 leading-relaxed">
                            Ảnh đơn chưa xác nhận được độ rọi, ma sát, kích thước, độ chắc của tay vịn hay tình trạng cố định thảm. Hãy hoàn thành khảo sát và đo tại nhà trước khi đánh giá nguy cơ.
                          </p>
                          <Link href="/ai-guided-survey" className="inline-block underline font-semibold text-amber-900">Hoàn thành khảo sát tại nhà</Link>
                        </div>
                      ) : (
                        riskSnapshot.findings.map((f) => (
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
                        ))
                      )}
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
          <span role="status" className="text-slate-500">{syncStatus}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBuild3DFromImage}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 transition flex items-center gap-1.5 shadow-xs"
            title="Dựng phòng số hóa 3D từ các vật thể nhận diện trong ảnh này"
          >
            <Layers className="h-3.5 w-3.5 text-indigo-600" />
            <span>Dựng Mô Phỏng 3D Từ Ảnh Này</span>
          </button>

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
      <LiveCameraCaptureModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onCapture={handleLiveCameraCapture}
        roomType={activeRoomType}
        title="Chụp ảnh phòng từ Camera thiết bị"
        guidanceText={`Góc chụp: ${selectedViewpoint}. Hướng camera bao quát toàn cảnh sàn nhà và lối đi.`}
      />

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
                  aria-label="Tên hiển thị tùy chỉnh"
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
