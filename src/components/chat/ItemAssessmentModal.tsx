import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  Upload,
  Camera,
  X,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { ItemHazardCard } from "./ItemHazardCard";
import type { ItemHazardAssessment } from "@/lib/vision/itemHazardTypes";
import { SAMPLE_ITEM_PRESETS } from "@/lib/vision/itemHazardTypes";

interface ItemAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssessmentCompleted?: (assessment: ItemHazardAssessment) => void;
  onSendToChat?: (assessment: ItemHazardAssessment) => void;
}

export const ItemAssessmentModal: React.FC<ItemAssessmentModalProps> = ({
  isOpen,
  onClose,
  onAssessmentCompleted,
  onSendToChat,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [itemHint, setItemHint] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultAssessment, setResultAssessment] = useState<ItemHazardAssessment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setErrorMsg(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeUpload = async () => {
    if (!selectedFile && !previewUrl) {
      setErrorMsg("Vui lòng tải ảnh vật dụng lên trước khi thẩm định.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);
        if (itemHint.trim()) {
          formData.append("itemHint", itemHint.trim());
        }

        res = await fetch("/api/vision/assess-item", {
          method: "POST",
          body: formData,
        });
      } else if (previewUrl) {
        res = await fetch("/api/vision/assess-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: previewUrl,
            itemHint: itemHint.trim(),
            fileName: "item-preview.jpg",
          }),
        });
      }

      if (!res || !res.ok) {
        const errData = await res?.json().catch(() => null);
        throw new Error(errData?.error || "Không thể phân tích ảnh vật dụng lúc này.");
      }

      const data = await res.json();
      if (data.success && data.assessment) {
        setResultAssessment(data.assessment);
        onAssessmentCompleted?.(data.assessment);
      } else {
        throw new Error("Không nhận được kết quả thẩm định từ máy chủ.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Đã xảy ra lỗi khi thẩm định ảnh.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = async (preset: (typeof SAMPLE_ITEM_PRESETS)[0]) => {
    setIsLoading(true);
    setErrorMsg(null);
    setItemHint(preset.title);

    try {
      const res = await fetch("/api/vision/assess-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetCategory: preset.category,
          itemHint: preset.title,
          fileName: `${preset.category}.jpg`,
        }),
      });

      if (!res.ok) {
        throw new Error("Không thể tải mẫu thẩm định");
      }

      const data = await res.json();
      if (data.success && data.assessment) {
        setResultAssessment(data.assessment);
        setPreviewUrl(data.assessment.imageUrl);
        onAssessmentCompleted?.(data.assessment);
      }
    } catch (err: any) {
      setErrorMsg("Lỗi khi tải mẫu thẩm định: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setItemHint("");
    setErrorMsg(null);
    setResultAssessment(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-teal-50 via-white to-sky-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Thẩm Định Rủi Ro Vật Dụng Qua Ảnh
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  CDC STEADI Standard
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Đánh giá mức độ nguy hiểm, căn cứ y khoa &amp; chỉ rõ từng điểm rủi ro trên ảnh
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/ai-vision"
              onClick={onClose}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold transition shadow-2xs"
              title="Chuyển sang Quét toàn bộ căn phòng bằng Thị giác AI"
            >
              <Camera className="h-3.5 w-3.5 text-sky-600" />
              <span>Chuyển tới AI Vision</span>
              <ArrowRight className="h-3 w-3 text-sky-600" />
            </Link>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!resultAssessment ? (
            /* Uploader & Presets View */
            <div className="space-y-6">
              {/* Vision Banner CTA */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 via-teal-50 to-indigo-50 border border-sky-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-extrabold text-sky-950">Bạn muốn quét toàn cảnh căn phòng? </span>
                    <span className="text-slate-600 hidden sm:inline">
                      Dùng phân hệ Thị giác AI để phát hiện tự động đa vật dụng và xuất trực tiếp vào Bản sao số 3D.
                    </span>
                  </div>
                </div>
                <Link
                  href="/ai-vision"
                  onClick={onClose}
                  className="shrink-0 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1 transition shadow-xs"
                >
                  <span>Chuyển tới AI Vision</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                  previewUrl
                    ? "border-teal-400 bg-teal-50/20"
                    : "border-slate-300 hover:border-teal-500 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="space-y-3 w-full max-w-sm">
                    <img
                      src={previewUrl}
                      alt="Ảnh vật dụng"
                      className="max-h-48 w-full object-cover rounded-2xl mx-auto shadow-sm border border-slate-200"
                    />
                    <div className="text-xs text-teal-700 font-bold flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Đã chọn ảnh ({selectedFile?.name || "Ảnh tải lên"})</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline"
                    >
                      Chọn ảnh khác
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Kéo thả hoặc nhấn để tải ảnh vật dụng lên
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Hỗ trợ PNG, JPG, JPEG, WEBP (tối đa 10MB)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Optional Item Hint */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Tên hoặc ghi chú vật dụng (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={itemHint}
                  onChange={(e) => setItemHint(e.target.value)}
                  placeholder="Ví dụ: Thảm phòng khách, Dây điện quạt, Ghế đôn gỗ..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                />
              </div>

              {/* Action Button */}
              <div>
                <button
                  type="button"
                  onClick={handleAnalyzeUpload}
                  disabled={(!selectedFile && !previewUrl) || isLoading}
                  className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang phân tích mức độ nguy hiểm &amp; điểm rủi ro...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Bắt Đầu Thẩm Định Rủi Ro Té Ngã</span>
                    </>
                  )}
                </button>
              </div>

              {/* Sample Presets for Quick Testing */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Hoặc chọn nhanh vật dụng mẫu để kiểm nghiệm:
                  </span>
                  <span className="text-[10px] text-slate-400">Dữ liệu chuẩn CDC</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {SAMPLE_ITEM_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      disabled={isLoading}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-left transition text-xs space-y-1 group"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-teal-900 leading-snug">
                        {preset.title}
                      </div>
                      <div className="text-[11px] text-slate-500">{preset.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Result Assessment View */
            <div className="space-y-4">
              <ItemHazardCard
                assessment={resultAssessment}
                onAskCopilot={(query) => {
                  onSendToChat?.(resultAssessment);
                  onClose();
                }}
              />
            </div>
          )}
        </div>

        {/* Sticky Bottom Actions Bar when assessment is present */}
        {resultAssessment && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 transition shadow-2xs"
              >
                Thẩm định ảnh khác
              </button>

              <Link
                href="/ai-vision"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                title="Chuyển tới phân hệ Thị giác AI để quét toàn bộ căn phòng"
              >
                <Camera className="h-3.5 w-3.5 text-sky-600" />
                <span>Quét toàn cảnh phòng (AI Vision)</span>
                <ArrowRight className="h-3.5 w-3.5 text-sky-600" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                onSendToChat?.(resultAssessment);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              <span>Đưa kết quả vào cuộc trò chuyện AI</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
