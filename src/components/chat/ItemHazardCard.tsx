import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  MapPin,
  Wrench,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Tag,
  Info,
  Layers,
  ArrowRight,
  Camera,
  CameraOff,
} from "lucide-react";
import type { ItemHazardAssessment, ItemDangerHotspot } from "@/lib/vision/itemHazardTypes";

interface ItemHazardCardProps {
  assessment: ItemHazardAssessment;
  onAskCopilot?: (question: string) => void;
  onSelectHotspot?: (hotspot: ItemDangerHotspot) => void;
  compact?: boolean;
}

export const ItemHazardCard: React.FC<ItemHazardCardProps> = ({
  assessment,
  onAskCopilot,
  onSelectHotspot,
  compact = false,
}) => {
  const [hotspots, setHotspots] = useState<ItemDangerHotspot[]>(assessment.whereDangerous);
  const [activeSpotId, setActiveSpotId] = useState<string | null>(
    assessment.whereDangerous.length > 0 ? assessment.whereDangerous[0].id : null
  );
  const [showFullWhy, setShowFullWhy] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHotspots(assessment.whereDangerous);
    if (assessment.whereDangerous.length > 0) {
      setActiveSpotId(assessment.whereDangerous[0].id);
    }
  }, [assessment]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeSpotId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pctX = Math.max(3, Math.min(97, Math.round((clickX / rect.width) * 100)));
    const pctY = Math.max(3, Math.min(97, Math.round((clickY / rect.height) * 100)));

    setHotspots((prev) =>
      prev.map((s) => (s.id === activeSpotId ? { ...s, coordinates: { x: pctX, y: pctY } } : s))
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-rose-600 bg-rose-50 border-rose-300";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-300";
    if (score >= 40) return "text-sky-600 bg-sky-50 border-sky-300";
    return "text-emerald-600 bg-emerald-50 border-emerald-300";
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return "bg-rose-600 text-white";
      case "HIGH":
        return "bg-rose-500 text-white";
      case "MEDIUM":
        return "bg-amber-500 text-white";
      default:
        return "bg-emerald-600 text-white";
    }
  };

  const activeSpot = assessment.whereDangerous.find((s) => s.id === activeSpotId);

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-sm hover:shadow-md transition space-y-0">
      {/* 1. Header Bar: Title, Category & Urgency */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-teal-200 border border-white/10">
                Thẩm định nguy cơ vật dụng
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  assessment.urgencyLevel === "KHẨN CẤP"
                    ? "bg-rose-500/90 text-white animate-pulse"
                    : "bg-amber-500/90 text-white"
                }`}
              >
                {assessment.urgencyLevel}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-tight">
              {assessment.itemName}
            </h3>
          </div>
        </div>

        {/* 1. Question: MỨC ĐỘ NGUY HIỂM BAO NHIÊU? */}
        <div className="flex items-center gap-3 bg-white/10 border border-white/10 rounded-2xl p-2.5 sm:px-4">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">
              Mức độ nguy hiểm
            </div>
            <div className="text-xs font-bold text-teal-300">{assessment.severityLabel}</div>
          </div>
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-base sm:text-lg font-mono border-2 ${
              assessment.riskScore >= 80
                ? "bg-rose-500/20 text-rose-300 border-rose-400"
                : assessment.riskScore >= 60
                ? "bg-amber-500/20 text-amber-300 border-amber-400"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-400"
            }`}
          >
            {assessment.riskScore}
          </div>
        </div>
      </div>

      {/* 2. Interactive Visual Hotspot Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-slate-200">
        {/* Left Column: Image with Interactive Pin Markers */}
        <div className="lg:col-span-6 bg-slate-950/95 flex flex-col items-center justify-center p-3 sm:p-4 select-none relative">
          <div
            ref={imageContainerRef}
            onClick={handleImageClick}
            className="relative inline-block max-w-full cursor-crosshair rounded-2xl overflow-hidden shadow-md border border-white/10 group"
            title="Nhấp chuột lên ảnh để di chuyển điểm ghim đang chọn"
          >
            {assessment.imageUrl ? (
              <img
                src={assessment.imageUrl}
                alt={assessment.itemName}
                className="max-h-[340px] w-auto max-w-full object-contain block select-none pointer-events-none"
              />
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                <CameraOff className="h-8 w-8 mx-auto mb-2 text-slate-600" />
                <span>Chưa có ảnh xem trước</span>
              </div>
            )}

            {/* Visual Hotspot Markers H1, H2, H3 */}
            {hotspots.map((spot) => {
              const isActive = spot.id === activeSpotId;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpotId(spot.id);
                    onSelectHotspot?.(spot);
                  }}
                  style={{
                    left: `${spot.coordinates.x}%`,
                    top: `${spot.coordinates.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`absolute group z-10 flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "h-9 w-9 bg-rose-600 text-white ring-4 ring-rose-400/60 scale-110 shadow-lg shadow-rose-600/50"
                      : "h-7 w-7 bg-amber-500 hover:bg-rose-500 text-white ring-2 ring-white/90 shadow-md hover:scale-105"
                  }`}
                  title={`${spot.title}: ${spot.description} (Nhấp lên ảnh để dời vị trí)`}
                >
                  <span className="font-mono text-xs font-bold">H{spot.number}</span>

                  {/* Radar pulse for active hotspot */}
                  {isActive && (
                    <span className="absolute -inset-1 rounded-full bg-rose-500/40 animate-ping -z-10" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Interactive Hint bar under image */}
          <div className="mt-2 text-center text-[10px] text-teal-300/90 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
            <span>
              Đang chọn <strong>H{activeSpot?.number || 1}</strong> — Nhấp lên ảnh để căn chỉnh vị trí ghim
            </span>
          </div>
        </div>

        {/* Right Column: 3. NGUY HIỂM Ở CHỖ NÀO? (Pinpoint Explanations) */}
        <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col justify-between space-y-3 bg-slate-50/50">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-600" />
                <span>3. Nguy hiểm ở chỗ nào?</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                Nhấp vào từng điểm để xem chi tiết
              </span>
            </div>

            {/* List of Danger Hotspots */}
            <div className="space-y-2 mt-2.5 max-h-[300px] overflow-y-auto pr-1">
              {hotspots.map((spot) => {
                const isActive = spot.id === activeSpotId;
                return (
                  <div
                    key={spot.id}
                    onClick={() => {
                      setActiveSpotId(spot.id);
                      onSelectHotspot?.(spot);
                    }}
                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition ${
                      isActive
                        ? "bg-white border-rose-400 shadow-xs ring-1 ring-rose-300"
                        : "bg-white/70 border-slate-200 hover:border-slate-300 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-5 w-5 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold ${
                            isActive
                              ? "bg-rose-600 text-white"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          H{spot.number}
                        </span>
                        <span className="font-bold text-slate-900">{spot.title}</span>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          spot.severity === "CRITICAL"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {spot.severity}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
                      {spot.description}
                    </p>

                    {isActive && spot.mechanism && (
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-rose-700 font-medium">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>Cơ chế: {spot.mechanism}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section: 2. TẠI SAO NGUY HIỂM? (Clinical Rationale) */}
      <div className="p-4 sm:p-5 bg-white border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-teal-600" />
            <span>2. Tại sao nguy hiểm đối với người cao tuổi?</span>
          </span>
          <button
            onClick={() => setShowFullWhy(!showFullWhy)}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
          >
            <span>{showFullWhy ? "Thu gọn" : "Chi tiết cơ chế y khoa"}</span>
            {showFullWhy ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Clinical Summary */}
        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium bg-teal-50/50 p-3 rounded-2xl border border-teal-200/70">
          {assessment.whyDangerous.summary}
        </p>

        {/* Detailed Biomechanical Breakdown when expanded */}
        {showFullWhy && (
          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Cơ chế sinh cơ học gây té ngã (Biomechanical Fall Mechanism):
              </span>
              <p className="text-slate-700 leading-relaxed">
                {assessment.whyDangerous.biomechanicalRationale}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 space-y-1">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                  Nguy cơ chấn thương thực thể:
                </span>
                <p className="text-rose-900 text-[11px] leading-relaxed">
                  {assessment.whyDangerous.consequenceRisk}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 space-y-1">
                <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">
                  Căn cứ chuẩn mực y tế:
                </span>
                <p className="text-sky-900 text-[11px] leading-relaxed">
                  {assessment.whyDangerous.clinicalReference}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Section: BIỆN PHÁP KHẮC PHỤC & CHI PHÍ */}
      <div className="p-4 sm:p-5 bg-slate-50/80 space-y-3">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Wrench className="h-4 w-4 text-emerald-600" />
            <span>4. Biện pháp cải thiện thiết thực &amp; Chi phí ước tính</span>
          </span>
          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
            Ưu tiên xử lý ngay
          </span>
        </div>

        <div className="space-y-2">
          {assessment.remediation.map((rem, idx) => (
            <div
              key={rem.id || idx}
              className="p-3 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 leading-snug">{rem.step}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100 text-[11px] pl-7">
                <div className="flex items-center gap-1 text-slate-600">
                  <Tag className="h-3 w-3 text-teal-600" />
                  <span>Vật tư: {rem.materialsNeeded}</span>
                </div>
                <div className="flex items-center gap-1 font-bold text-emerald-700">
                  <span>Chi phí: {rem.costEstimate}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500">
                  <Clock className="h-3 w-3 text-slate-400" />
                  <span>Thời gian: {rem.timeEstimate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 5. Follow-up Copilot Interaction & Vision Navigation */}
        <div className="pt-2 flex flex-wrap gap-2">
          {onAskCopilot && (
            <button
              onClick={() =>
                onAskCopilot(
                  `Tôi vừa thẩm định ảnh vật dụng "${assessment.itemName}" có điểm rủi ro ${assessment.riskScore}/100. Hãy tư vấn chi tiết hơn về cách khắc phục an toàn nhất cho gia đình.`
                )
              }
              className="py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-xs active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tiếp tục hỏi SafeHome Copilot về vật dụng này</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}

          <Link
            href="/ai-vision"
            className="py-2.5 px-4 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center gap-1.5 transition shadow-xs active:scale-95"
            title="Chuyển sang phân hệ Thị giác AI để quét toàn bộ không gian phòng và tạo Bản sao số 3D"
          >
            <Camera className="h-3.5 w-3.5 text-sky-600" />
            <span>Chuyển tới Thị giác AI (Quét phòng 3D)</span>
            <ArrowRight className="h-3.5 w-3.5 text-sky-600" />
          </Link>
        </div>
      </div>
    </div>
  );
};
