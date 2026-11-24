"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Camera,
  Upload,
  Video,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sliders,
  Maximize2,
  RotateCcw,
  Box,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Eye,
  RefreshCw,
  Edit3,
  Trash2,
  Plus,
  HelpCircle,
  X,
  FileCheck,
  Footprints,
} from "lucide-react";
import { RoomViewer } from "@/components/three/RoomViewer";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { VisionDetection, ViewpointType } from "@/lib/vision/types";
import { reconstructSceneFromDetections } from "@/lib/reconstruction/spatialReconstructor";
import { convertSceneGraphToRoomState } from "@/lib/reconstruction/sceneToRoomAdapter";
import { furniture, estimateWall } from "@/lib/vision/scannerFurniture";
import { sampleSurfaceColors } from "@/lib/reconstruction/sampleSurfaceColors";
import { extractKeyframesFromVideo } from "@/lib/vision/videoProcessor";
import { ASSET_REGISTRY } from "@/data/assetRegistry";
import { runEnvironmentalAssessment, calculateSafetyScore } from "@/features/risk-engine/rules";

// Photoreal Default Samples
const SAMPLE_BEDROOM_IMG =
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=1200&auto=format&fit=crop";
const SAMPLE_BATHROOM_IMG =
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop";

export const AiRoomScannerWizard: React.FC<{
  onComplete?: (roomId: string) => void;
  initialRoomName?: string;
  initialPhotoUrl?: string;
  initialRoomType?: "BEDROOM" | "BATHROOM" | "LIVING_ROOM";
  initialStep?: number;
}> = ({
  onComplete,
  initialRoomName,
  initialPhotoUrl,
  initialRoomType,
  initialStep,
}) => {
  const router = useRouter();
  const { loadReconstructedRoom } = useSimulationStore();

  // Wizard Step: 1 -> 6
  const [currentStep, setCurrentStep] = useState<number>(
    initialStep || (initialPhotoUrl ? 2 : 1)
  );

  // Step 1: Space Selection
  const [roomType, setRoomType] = useState<"BEDROOM" | "BATHROOM" | "LIVING_ROOM">(
    initialRoomType || "BEDROOM"
  );
  const [roomName, setRoomName] = useState<string>(
    initialRoomName || "Bản dựng phòng ngủ"
  );

  // Step 2: Media Input
  const [inputMode, setInputMode] = useState<"IMAGE" | "MULTI" | "VIDEO" | "SAMPLE">(
    initialPhotoUrl ? "IMAGE" : "SAMPLE"
  );
  const [imageUrls, setImageUrls] = useState<string[]>(
    initialPhotoUrl ? [initialPhotoUrl] : [SAMPLE_BEDROOM_IMG]
  );
  const [selectedImgIndex, setSelectedImgIndex] = useState<number>(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState<boolean>(false);
  const photoPixels = useRef<ImageData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Step 3: AI Inference State
  const [isInferencing, setIsInferencing] = useState<boolean>(false);
  const [scanError, setScanError] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [inferenceStage, setInferenceStage] = useState<string>("");

  // Step 4: Human Verification Data
  const [detections, setDetections] = useState<VisionDetection[]>([]);
  const [addingObject, setAddingObject] = useState(false);
  const [firstCorner, setFirstCorner] = useState<{ x: number; y: number } | null>(null);
  const [roomWidth, setRoomWidth] = useState<number>(4.5);
  const [roomLength, setRoomLength] = useState<number>(5.0);
  const [roomHeight, setRoomHeight] = useState<number>(2.8);
  const [floorMaterial, setFloorMaterial] = useState<"WOOD" | "CERAMIC_TILE" | "NON_SLIP_VINYL">("WOOD");
  const [viewpoint, setViewpoint] = useState<ViewpointType>("ENTRANCE");

  // Reconstructed Scene & Assessment
  const [showSourcePhoto, setShowSourcePhoto] = useState(false);
  const [reconstructedRoomId, setReconstructedRoomId] = useState<string | null>(null);

  // Handle Space Switch
  const handleSelectRoomType = (type: "BEDROOM" | "BATHROOM" | "LIVING_ROOM") => {
    setRoomType(type);
    if (type === "BEDROOM") {
      setRoomName("Phòng ngủ người cao tuổi");
      setImageUrls([SAMPLE_BEDROOM_IMG]);
      setRoomWidth(4.5);
      setRoomLength(5.0);
      setFloorMaterial("WOOD");
    } else if (type === "BATHROOM") {
      setRoomName("Phòng tắm & Nhà vệ sinh");
      setImageUrls([SAMPLE_BATHROOM_IMG]);
      setRoomWidth(3.2);
      setRoomLength(3.6);
      setFloorMaterial("CERAMIC_TILE");
    } else {
      setRoomName("Phòng khách gia đình");
      setImageUrls([SAMPLE_BEDROOM_IMG]);
      setRoomWidth(5.0);
      setRoomLength(6.0);
      setFloorMaterial("WOOD");
    }
  };

  // Upload Photo
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const urls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      urls.push(URL.createObjectURL(files[i]));
    }
    setImageUrls(urls);
    setSelectedImgIndex(0);
    setInputMode(files.length > 1 ? "MULTI" : "IMAGE");
  };

  // Upload Video & Extract Frames
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingVideo(true);
    try {
      const frames = await extractKeyframesFromVideo(file, 4);
      setImageUrls(frames.map((f) => f.dataUrl));
      setSelectedImgIndex(0);
      setInputMode("VIDEO");
    } catch (err) {
      alert("Lỗi khi xử lý video quét phòng. Vui lòng thử lại với file MP4/WebM.");
    } finally {
      setIsProcessingVideo(false);
    }
  };

  // Trigger AI Reconstruction Pipeline
  const runAiReconstruction = async () => {
    const url = imageUrls[selectedImgIndex];
    if (!url || isInferencing || isProcessingVideo || !consent) return;
    setScanError("");
    setDetections([]);
    setCurrentStep(3);
    setIsInferencing(true);
    try {
      setInferenceStage("Đang chuẩn bị ảnh đã chọn…");
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = url;
      await image.decode();
      const ratio = Math.min(1, 1280 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Không thể đọc ảnh trên trình duyệt.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      photoPixels.current = context.getImageData(0, 0, canvas.width, canvas.height);
      const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error("Không thể chuyển đổi ảnh.")), "image/jpeg", 0.92
      ));
      setInferenceStage("Đang nhận diện nội thất trong ảnh. Lần đầu máy chủ cần tải mô hình.");
      const response = await fetch("/api/vision/scan-photo", { method: "POST", body: jpeg });
      if (!response.ok) throw new Error("Phân tích ảnh thất bại. Kiểm tra kết nối máy chủ rồi thử lại.");
      const result = await response.json();
      setAddingObject(false);
      setFirstCorner(null);
      setDetections(result.detections);
      if (result.floorMaterial) {
        setFloorMaterial(result.floorMaterial);
      }
      if (result.detectedRoomType) {
        setRoomType(result.detectedRoomType);
        if (result.detectedRoomType === "LIVING_ROOM") {
          setRoomName("Phòng khách (Tự động nhận diện)");
        }
      }
      setCurrentStep(4);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "Không thể phân tích ảnh đã chọn.");
      setCurrentStep(2);
    } finally {
      setIsInferencing(false);
    }
  };

  // Confirm Human Verification & Build 3D Scene
  const handleConfirmVerification = () => {
    const confirmed = detections.filter(d => d.verificationStatus !== "REJECTED").map(d => ({ ...d, verificationStatus: "CONFIRMED" as const }));
    const sceneGraph = reconstructSceneFromDetections(confirmed, {
      roomType,
      viewpoint,
      imageAspect: photoPixels.current ? photoPixels.current.width / photoPixels.current.height : 1,
      surfaceColors: photoPixels.current ? sampleSurfaceColors(photoPixels.current, detections) : {},
      manualDimensions: {
        width: roomWidth,
        length: roomLength,
        height: roomHeight,
      },
      floorMaterial,
      sourceImageUrls: [imageUrls[selectedImgIndex]],
      notes: `Tái dựng từ ảnh quét ${roomName}`,
    });

    const liveRoomState = convertSceneGraphToRoomState(sceneGraph);
    liveRoomState.name = `${roomName} (AI Reconstructed)`;
    liveRoomState.evidenceStatus = "PHOTO_DRAFT";

    // Load into Zustand store
    loadReconstructedRoom(liveRoomState);
    setReconstructedRoomId(liveRoomState.id);
    setCurrentStep(5); // Go to 3D Preview
  };

  // Toggle or Update Detection Item in Step 4
  const handleMarkCorner = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!addingObject) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    if (!firstCorner) { setFirstCorner({ x, y }); return; }
    const bbox = { xMin: Math.min(x, firstCorner.x), yMin: Math.min(y, firstCorner.y),
      xMax: Math.max(x, firstCorner.x), yMax: Math.max(y, firstCorner.y) };
    if (bbox.xMax - bbox.xMin < 0.015 || bbox.yMax - bbox.yMin < 0.015) return;
    const now = new Date().toISOString();
    setDetections(prev => [...prev, { id: crypto.randomUUID(), analysisId: prev[0]?.analysisId ?? "manual",
      imageId: prev[0]?.imageId ?? `photo-${selectedImgIndex}`, originalLabel: "Bàn", category: "table",
      sceneModelType: "desk", placementWall: "free", bbox, confidence: 1, source: "MANUAL_ANNOTATION",
      verificationStatus: "CONFIRMED", createdAt: now, updatedAt: now }]);
    setAddingObject(false);
    setFirstCorner(null);
  };

  const handleToggleDetection = (detId: string) => {
    setDetections((prev) =>
      prev.map((d) =>
        d.id === detId
          ? {
              ...d,
              verificationStatus:
                d.verificationStatus === "REJECTED" ? "CONFIRMED" : "REJECTED",
            }
          : d
      )
    );
  };

  const saveRoom = async () => {
    const room = useSimulationStore.getState().rooms.find(r => r.id === reconstructedRoomId);
    if (!room || isSaving) return;
    setIsSaving(true); setScanError("");
    try {
      const response = await fetch("/api/simulations", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: room.name, roomType: room.roomType, roomState: room }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || "Không lưu được bản dựng.");
      loadReconstructedRoom(json.data);
      setReconstructedRoomId(json.data.id);
      if (onComplete) onComplete(json.data.id); else router.push("/digital-twin");
    } catch (error) { setScanError(error instanceof Error ? error.message : "Không lưu được bản dựng."); }
    finally { setIsSaving(false); }
  };

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col min-h-[720px]">
      {/* Wizard Header & Progress Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 text-white flex flex-wrap items-center justify-between gap-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>AI Room Scanner & Photorealistic 3D Reconstruction</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                PBR Engine
              </span>
            </h2>
            <p className="text-xs text-slate-300">
              Quét hình ảnh phòng thực tế, nhận diện vật thể và tái dựng Digital Twin an toàn
            </p>
          </div>
        </div>

        {/* Steps Breadcrumbs */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800 text-xs">
          {[
            { num: 1, label: "Không gian" },
            { num: 2, label: "Dữ liệu" },
            { num: 3, label: "AI Phân tích" },
            { num: 4, label: "Xác minh" },
            { num: 5, label: "3D Preview" },
            { num: 6, label: "An toàn" },
          ].map((s) => (
            <div
              key={s.num}
              className={`px-3 py-1 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
                currentStep === s.num
                  ? "bg-teal-500 text-slate-950 shadow-md font-bold"
                  : currentStep > s.num
                  ? "text-teal-400 bg-teal-950/40"
                  : "text-slate-500"
              }`}
            >
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black border border-current">
                {currentStep > s.num ? "✓" : s.num}
              </span>
              <span className="hidden md:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* --- STEP 1: CHỌN LOẠI PHÒNG --- */}
      {currentStep === 1 && (
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full flex flex-col justify-between space-y-6 animate-fade-in">
          <div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              Bước 1: Chọn không gian khảo sát
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              Bạn muốn quét và tái dựng không gian nào?
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Hệ thống sẽ áp dụng bộ quy tắc an toàn y tế phù hợp. Toàn bộ nội thất và bố cục không gian sẽ được AI phân tích trực tiếp từ ảnh chụp thực tế ở bước tiếp theo.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-6">
              {/* Option 1: Bedroom */}
              <div
                onClick={() => handleSelectRoomType("BEDROOM")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  roomType === "BEDROOM"
                    ? "border-teal-500 bg-teal-50/50 shadow-lg ring-2 ring-teal-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                    <Box className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">Phòng ngủ</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Giường ngủ, nệm, tủ đầu giường, thảm chân, dây điện và đường đi ban đêm ra cửa.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Kích thước tiêu chuẩn:</span>
                  <span className="text-teal-700">4.5m × 5.0m</span>
                </div>
              </div>

              {/* Option 2: Bathroom */}
              <div
                onClick={() => handleSelectRoomType("BATHROOM")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  roomType === "BATHROOM"
                    ? "border-teal-500 bg-teal-50/50 shadow-lg ring-2 ring-teal-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">Nhà vệ sinh & Phòng tắm</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Bồn cầu, chậu rửa, vách tắm kính, vòi sen, độ bám sàn gạch và thanh tay vịn trợ lực.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Kích thước tiêu chuẩn:</span>
                  <span className="text-teal-700">3.2m × 3.6m</span>
                </div>
              </div>

              {/* Option 3: Living Room */}
              <div
                onClick={() => handleSelectRoomType("LIVING_ROOM")}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                  roomType === "LIVING_ROOM"
                    ? "border-teal-500 bg-teal-50/50 shadow-lg ring-2 ring-teal-500/20"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                    <Sliders className="h-6 w-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">Phòng sinh hoạt chung</h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Bàn ghế sofa, kệ tivi, lối di chuyển kết nối và các vật cản thấp trên sàn.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>Kích thước tiêu chuẩn:</span>
                  <span className="text-teal-700">5.0m × 6.0m</span>
                </div>
              </div>
            </div>

            {/* Room Name Input */}
            <div className="mt-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Đặt tên cho căn phòng tái dựng:
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="VD: Phòng ngủ chính Bác Nam"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md flex items-center gap-2 transition active:scale-95"
            >
              <span>Tiếp tục tải dữ liệu ảnh/video</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 2: TẢI ẢNH HOẶC VIDEO --- */}
      {currentStep === 2 && (
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full flex flex-col justify-between space-y-6 animate-fade-in">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                  Bước 2: Cung cấp ảnh chụp hoặc video quét phòng
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  Chọn dữ liệu thị giác đầu vào
                </h3>
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Đổi loại phòng</span>
              </button>
            </div>

            {/* Upload Modes Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                onClick={() => { setInputMode("SAMPLE"); setSelectedImgIndex(0); setImageUrls([roomType === "BATHROOM" ? SAMPLE_BATHROOM_IMG : SAMPLE_BEDROOM_IMG]); }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition ${
                  inputMode === "SAMPLE"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ★ Ảnh mẫu chuẩn
              </button>
              <button
                onClick={() => {
                  setInputMode("IMAGE");
                  fileInputRef.current?.click();
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition ${
                  inputMode === "IMAGE"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tải ảnh từ máy
              </button>
              <button
                onClick={() => {
                  setInputMode("VIDEO");
                  videoInputRef.current?.click();
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition ${
                  inputMode === "VIDEO"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Video quét phòng
              </button>
              <button
                onClick={() => {
                  setInputMode("MULTI");
                  fileInputRef.current?.click();
                }}
                className={`py-2 px-3 text-xs font-bold rounded-xl transition ${
                  inputMode === "MULTI"
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Nhiều góc chụp
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              onChange={handleVideoUpload}
            />

            {/* Active Preview Area */}
            <div className="mt-5 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 relative group aspect-video max-h-[380px] flex items-center justify-center">
              {isProcessingVideo ? (
                <div className="flex flex-col items-center justify-center text-white gap-3 p-6 text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-teal-400" />
                  <p className="text-sm font-semibold">
                    Đang giải mã và trích xuất các khung hình quét phòng từ video...
                  </p>
                </div>
              ) : imageUrls.length > 0 ? (
                <img
                  src={imageUrls[selectedImgIndex]}
                  alt="Ảnh phòng cần tái dựng"
                  className="w-full h-full object-cover"
                />
              ) : null}

              {/* Viewpoint tag overlay */}
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white border border-slate-700 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-teal-400" />
                <span>Góc chụp: {viewpoint === "ENTRANCE" ? "Từ cửa nhìn vào" : "Góc chéo phòng"}</span>
              </div>

              {/* Multi-image thumbnail strip */}
              {imageUrls.length > 1 && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 overflow-x-auto p-2 bg-slate-950/70 backdrop-blur-md rounded-xl border border-slate-700/60">
                  {imageUrls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImgIndex(idx)}
                      className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                        selectedImgIndex === idx
                          ? "border-teal-400 scale-105"
                          : "border-transparent opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={url} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {scanError && <p role="alert" className="mt-3 text-sm text-rose-700">{scanError}</p>}
            {imageUrls.length > 1 && <p className="mt-2 text-sm">Chọn một góc ảnh phía trên để dựng bố cục.</p>}
            <label className="flex items-start gap-2 mt-3 text-sm"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Tôi đồng ý gửi ảnh đến nhà cung cấp AI đã cấu hình để nhận diện vật thể. Tránh ảnh có người hoặc thông tin riêng tư.</label>
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Bảo mật y tế:</strong> Ảnh được bỏ thông tin EXIF rồi gửi đến máy chủ SafeHome để nhận diện nội thất.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </button>
            <button
              disabled={isProcessingVideo || !imageUrls[selectedImgIndex] || !consent}
              onClick={runAiReconstruction}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md flex items-center gap-2 transition active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Bắt đầu AI Phân tích & Tái dựng</span>
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 3: TIẾN TRÌNH AI PHÂN TÍCH (INFERENCE) --- */}
      {currentStep === 3 && (
        <div className="flex-1 p-12 max-w-xl mx-auto w-full flex flex-col items-center justify-center text-center space-y-6 animate-fade-in">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-teal-50 border-2 border-teal-200 flex items-center justify-center text-teal-600 shadow-xl">
              <Sparkles className="h-10 w-10 animate-pulse text-teal-500" />
            </div>
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-slate-900 text-white border-2 border-white">
              <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900">
              AI đang phân tích không gian thực tế...
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              {inferenceStage}
            </p>
          </div>


        </div>
      )}

      {/* --- STEP 4: XÁC MINH CỦA CON NGƯỜI (HUMAN VERIFICATION) --- */}
      {currentStep === 4 && (
        <div className="flex-1 p-6 max-w-5xl mx-auto w-full flex flex-col justify-between space-y-6 animate-fade-in">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                  Bước 4: Kiểm tra & Hiệu chỉnh kết quả AI
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Xác nhận đồ nội thất & Kích thước phòng
                </h3>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Phát hiện {detections.length} vật thể
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
              {/* Left Column: Image with Bounding Boxes */}
              <div className="lg:col-span-6 space-y-3">
                <div onClick={handleMarkCorner} className={`relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 shadow-md ${addingObject ? "cursor-crosshair" : ""}`}>
                  {firstCorner && <span className="absolute z-10 h-2 w-2 rounded-full bg-amber-400" style={{left: `${firstCorner.x * 100}%`, top: `${firstCorner.y * 100}%`}} />}
                  <img
                    src={imageUrls[selectedImgIndex]}
                    alt="Đồ nội thất nhận diện trên ảnh gốc"
                    className="block w-full h-auto"
                  />
                  {/* Render 2D Bounding Boxes */}
                  {detections.map((det) => {
                    if (det.verificationStatus === "REJECTED") return null;
                    const b = det.bbox;
                    const left = `${b.xMin * 100}%`;
                    const top = `${b.yMin * 100}%`;
                    const width = `${(b.xMax - b.xMin) * 100}%`;
                    const height = `${(b.yMax - b.yMin) * 100}%`;

                    return (
                      <div
                        key={det.id}
                        style={{ left, top, width, height }}
                        className="absolute border-2 border-teal-400 bg-teal-500/15 pointer-events-none rounded transition-all"
                      >
                        <span className="absolute -top-5 left-0 bg-teal-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                          {det.userLabel || det.originalLabel} ({Math.round(det.confidence * 100)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 italic text-center">
                  {addingObject ? "Bấm hai góc đối diện của đồ vật trên ảnh, rồi chọn loại đồ trong danh sách." : "Kiểm tra các khung trên ảnh. Bạn có thể thêm đồ vật còn thiếu."}
                </p>
                <button className="text-xs text-teal-700 font-semibold" onClick={() => { setAddingObject(!addingObject); setFirstCorner(null); }}>
                  {addingObject ? "Hủy đánh dấu" : "+ Đánh dấu đồ vật trên ảnh"}
                </button>
              </div>

              {/* Right Column: Objects List & Calibration */}
              <div className="lg:col-span-6 space-y-4">
                {/* Detected Objects List */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 max-h-[220px] overflow-y-auto">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between pb-1 border-b border-slate-200">
                    <span>Đồ nội thất nhận diện:</span>
                    <span className="text-[10px] text-slate-400">Nhấn để bật/tắt</span>
                  </div>

                  {detections.map((det) => {
                    const isConfirmed = det.verificationStatus !== "REJECTED";
                    return (
                      <div
                        key={det.id}
                        className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition ${
                          isConfirmed
                            ? "bg-white border-teal-200 shadow-sm"
                            : "bg-slate-100/60 border-slate-200 opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            onClick={() => handleToggleDetection(det.id)}
                            className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition ${
                              isConfirmed
                                ? "bg-teal-600 text-white"
                                : "border border-slate-300 text-transparent"
                            }`}
                          >
                            ✓
                          </button>
                          <select aria-label="Loại nội thất" value={det.originalLabel}
                            onChange={e => {
                              const entry = furniture.find(item => item[2] === e.target.value);
                              if (!entry) return;
                              const [, category, originalLabel, sceneModelType = category] = entry;
                              const placementWall = estimateWall(sceneModelType, (det.bbox.xMin + det.bbox.xMax) / 2);
                              setDetections(prev => prev.map(d => d.id === det.id ? { ...d, category, originalLabel, sceneModelType, placementWall, verificationStatus: "CORRECTED" } : d));
                            }}
                            className="min-w-0 flex-1 bg-transparent text-xs font-semibold">
                            {!furniture.some(item => item[2] === det.originalLabel) && <option>{det.originalLabel}</option>}
                            {furniture.map(([, , label]) => <option key={label}>{label}</option>)}
                          </select>
                        </div>
                        <select aria-label={`Vị trí của ${det.originalLabel}`} value={det.placementWall ?? "free"}
                          onChange={e => setDetections(prev => prev.map(d => d.id === det.id ? { ...d, placementWall: e.target.value as VisionDetection["placementWall"] } : d))}
                          className="text-xs rounded border border-slate-200">
                          <option value="free">Trên sàn</option><option value="left">Tường trái</option>
                          <option value="back">Tường sau</option><option value="right">Tường phải</option>
                        </select>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {Math.round(det.confidence * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Metric Dimensions Calibration */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hiệu chuẩn kích thước thực tế (Mét):
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">
                        Chiều rộng (W):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={roomWidth}
                        onChange={(e) => setRoomWidth(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">
                        Chiều dài (L):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={roomLength}
                        onChange={(e) => setRoomLength(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold">
                        Chiều cao (H):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={roomHeight}
                        onChange={(e) => setRoomHeight(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  {/* Floor Material Selection */}
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Chất liệu sàn:</span>
                    <select
                      value={floorMaterial}
                      onChange={(e: any) => setFloorMaterial(e.target.value)}
                      className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800"
                    >
                      <option value="WOOD">Sàn gỗ công nghiệp</option>
                      <option value="CERAMIC_TILE">Gạch men tráng bóng</option>
                      <option value="NON_SLIP_VINYL">Nhựa Vinyl chống trượt</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
            >
              Chọn lại ảnh
            </button>
            <button
              disabled={!detections.some(d => d.verificationStatus !== "REJECTED") || ![roomWidth, roomLength, roomHeight].every(n => n > 0)}
              onClick={handleConfirmVerification}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md flex items-center gap-2 transition active:scale-95"
            >
              <span>Tạo Digital Twin 3D tương tác</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 5: 3D DIGITAL TWIN PREVIEW & INTERACTION --- */}
      {currentStep === 5 && (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          {/* Subheader Toolbar */}
          <div className="bg-slate-50 px-5 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{roomName}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                Bố cục ước lượng từ ảnh
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200 text-[11px] hidden sm:inline">
                {roomWidth}m × {roomLength}m × {roomHeight}m
              </span>
            </div>

            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
              <button type="button" aria-pressed={showSourcePhoto} onClick={() => setShowSourcePhoto(!showSourcePhoto)}
                className="px-3 py-1.5 border rounded-lg bg-white text-teal-800 font-semibold">
                {showSourcePhoto ? "Ẩn ảnh gốc" : "Đối chiếu ảnh gốc"}
              </button>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className={showSourcePhoto ? "grid md:grid-cols-2" : ""}>
            {showSourcePhoto && <img src={imageUrls[selectedImgIndex]} alt="Ảnh phòng đã dùng để dựng mô hình"
              className="w-full h-56 md:h-[clamp(500px,65vh,820px)] object-contain bg-slate-900" />}
            <div className="relative h-[clamp(500px,65vh,820px)] min-w-0">
              <RoomViewer />
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="bg-white p-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentStep(4)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hiệu chỉnh lại thông số
            </button>

            <button
              onClick={() => setCurrentStep(6)}
              className="px-6 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md flex items-center gap-2 transition active:scale-95"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Chuyển sang Phân tích Nguy cơ An toàn</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* --- STEP 6: SAFETY ANALYSIS & WHAT-IF --- */}
      {currentStep === 6 && (
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full flex flex-col justify-between space-y-6 animate-fade-in">
          {scanError && <p role="alert" className="text-rose-700">{scanError}</p>}
          <div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              Bước 6: Đánh giá nguy cơ & Mô phỏng can thiệp
            </span>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              Bản dựng 3D ước lượng đã sẵn sàng
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Vị trí và kích thước từ ảnh chưa phải số đo thực tế. Cần bổ sung khảo sát trước khi đánh giá nguy cơ.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Mô hình 3D Digital Twin</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vị trí và kích thước nội thất được ước lượng từ ảnh và thông số phòng đã xác nhận.
                </p>
                <button
                  onClick={() => router.push("/digital-twin")}
                  className="w-full mt-2 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100/50 shadow-sm"
                >
                  Mở Digital Twin Workspace
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                  <ShieldAlert className="h-5 w-5" />
                  <span>Đánh giá Nguy cơ té ngã</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kích hoạt 8 quy tắc an toàn tất định (chiều cao giường, thảm lỏng lẻo, vật cản lối đi).
                </p>
                <button
                  onClick={() => router.push("/risk-assessment")}
                  className="w-full mt-2 py-2 rounded-xl bg-white border border-amber-300 text-amber-800 font-bold text-xs hover:bg-amber-100/50 shadow-sm"
                >
                  Xem Bảng nguy cơ y tế
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-sky-50 border border-sky-200 text-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-sky-700 font-bold text-sm">
                  <Sliders className="h-5 w-5" />
                  <span>Mô phỏng What-If</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Kéo thả di chuyển đồ đạc, thêm thanh vịn hoặc dán mép thảm để so sánh chỉ số an toàn trước/sau.
                </p>
                <button
                  onClick={() => router.push("/scenario-simulator")}
                  className="w-full mt-2 py-2 rounded-xl bg-white border border-sky-300 text-sky-800 font-bold text-xs hover:bg-sky-100/50 shadow-sm"
                >
                  Vào Scenario Simulator
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(5)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50"
            >
              Xem lại 3D Canvas
            </button>
            <button
              onClick={saveRoom}
              disabled={isSaving}
              className="px-6 py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md flex items-center gap-2 transition active:scale-95"
            >
              <span>{isSaving ? "Đang lưu…" : "Lưu bản dựng ước lượng"}</span>
              <CheckCircle2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
