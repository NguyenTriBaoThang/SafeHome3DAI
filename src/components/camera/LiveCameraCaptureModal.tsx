"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Camera,
  RefreshCw,
  Sun,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export interface LiveCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  title?: string;
  guidanceText?: string;
  roomType?: string;
}

function stopMediaStream(activeStream: MediaStream | null) {
  if (!activeStream) return;
  activeStream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch {
      // Ignore already-stopped track errors
    }
  });
}

function mapCameraErrorMessage(err: unknown): string {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Bạn đã từ chối cấp quyền máy ảnh. Vui lòng cho phép quyền truy cập camera trong cài đặt trình duyệt để tiếp tục.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "Không tìm thấy máy ảnh trên thiết bị này. Vui lòng sử dụng tính năng tải ảnh từ máy tính.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Máy ảnh đang được ứng dụng khác sử dụng hoặc không thể đọc luồng video. Hãy đóng ứng dụng khác rồi thử lại.";
  }
  return "Không thể kết nối với máy ảnh. Vui lòng kiểm tra quyền truy cập hoặc thử lại.";
}

export const LiveCameraCaptureModal: React.FC<LiveCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = "Chụp ảnh trực tiếp từ Camera",
  guidanceText = "Hướng camera bao quát toàn cảnh mặt sàn, lối đi chính và chân giường/bồn cầu",
  roomType,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lumaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);
  const [isLowLight, setIsLowLight] = useState<boolean>(false);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCapturedPreview(null);
    setCapturedBlob(null);
  }, []);

  const stopActiveStream = useCallback(() => {
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStream(null);
    setIsVideoReady(false);
    setIsLowLight(false);
  }, []);

  // Start or switch camera stream safely without losing track of stale requests
  const startCamera = useCallback(
    async (mode: "environment" | "user", deviceId: string | null) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          "Trình duyệt không hỗ trợ truy cập máy ảnh hoặc đang chạy trên kết nối không bảo mật (yêu cầu HTTPS hoặc localhost)."
        );
        return;
      }

      const requestId = ++requestIdRef.current;
      stopActiveStream();
      setIsInitializing(true);
      setCameraError(null);
      setCaptureError(null);

      try {
        let mediaStream: MediaStream;
        if (deviceId) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
          } catch {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: deviceId } },
              audio: false,
            });
          }
        } else {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: {
                facingMode: { ideal: mode },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
              audio: false,
            });
          } catch {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          }
        }

        // Discard stream if modal closed or another camera switch started while awaiting
        if (requestId !== requestIdRef.current) {
          stopMediaStream(mediaStream);
          return;
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        // Discover all available video cameras once permission is granted
        if (navigator.mediaDevices.enumerateDevices) {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            if (requestId === requestIdRef.current) {
              const cams = devices.filter((d) => d.kind === "videoinput" && Boolean(d.deviceId));
              setVideoDevices(cams);
            }
          } catch {
            // Ignore enumerateDevices errors
          }
        }
      } catch (err: unknown) {
        if (requestId === requestIdRef.current) {
          setCameraError(mapCameraErrorMessage(err));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsInitializing(false);
        }
      }
    },
    [stopActiveStream]
  );

  // Initialize or teardown when modal opens/closes or camera selection changes
  useEffect(() => {
    if (!isOpen) {
      requestIdRef.current += 1;
      stopActiveStream();
      clearPreview();
      setCameraError(null);
      setCaptureError(null);
      return;
    }

    clearPreview();
    void startCamera(facingMode, selectedDeviceId);

    return () => {
      requestIdRef.current += 1;
      stopActiveStream();
    };
  }, [isOpen, facingMode, selectedDeviceId, startCamera, stopActiveStream, clearPreview]);

  // Attach active MediaStream whenever the <video> element mounts or stream updates
  useEffect(() => {
    const video = videoRef.current;
    if (!isOpen || !video || !stream || capturedPreview) return;

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    const syncReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setIsVideoReady(true);
      }
    };

    syncReady();
    void video.play().then(syncReady).catch(() => {
      // Initial play can wait for loadedmetadata; onLoadedMetadata handles readiness
    });
  }, [isOpen, stream, capturedPreview]);

  // Periodic ambient luminance check (detect dark room < 50 lux)
  useEffect(() => {
    if (!isOpen || !stream || !isVideoReady || capturedPreview) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = lumaCanvasRef.current;
      if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = 64;
      canvas.height = 36;
      ctx.drawImage(video, 0, 0, 64, 36);

      try {
        const frame = ctx.getImageData(0, 0, 64, 36).data;
        let totalLuma = 0;
        for (let i = 0; i < frame.length; i += 4) {
          totalLuma += 0.299 * frame[i] + 0.587 * frame[i + 1] + 0.114 * frame[i + 2];
        }
        const avgLuma = totalLuma / (frame.length / 4);
        setIsLowLight(avgLuma < 45);
      } catch {
        // Ignore transient canvas read errors
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isOpen, stream, isVideoReady, capturedPreview]);

  // Switch between available cameras (physical deviceId cycling when >1 camera, else facingMode)
  const handleToggleCamera = () => {
    if (videoDevices.length > 1) {
      const activeTrackDeviceId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
      const currentIdx = videoDevices.findIndex(
        (d) => d.deviceId === (selectedDeviceId || activeTrackDeviceId)
      );
      const nextIdx = (currentIdx + 1) % videoDevices.length;
      setSelectedDeviceId(videoDevices[nextIdx].deviceId);
      return;
    }
    setSelectedDeviceId(null);
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Take snapshot from live video frame
  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      setCaptureError("Khung hình camera chưa sẵn sàng. Vui lòng đợi hình ảnh hiển thị hoặc bấm Đổi máy ảnh.");
      return;
    }

    setCaptureError(null);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCaptureError("Trình duyệt không hỗ trợ xử lý khung hình canvas.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCaptureError("Không thể tạo tệp ảnh từ camera. Vui lòng thử chụp lại.");
          return;
        }
        clearPreview();
        const previewUrl = URL.createObjectURL(blob);
        previewUrlRef.current = previewUrl;
        setCapturedBlob(blob);
        setCapturedPreview(previewUrl);
      },
      "image/jpeg",
      0.92
    );
  };

  // Retake
  const handleRetake = () => {
    setCaptureError(null);
    setIsVideoReady(false);
    clearPreview();
  };

  // Confirm photo with an independent handoff URL so modal cleanup never revokes the caller's preview
  const handleConfirm = () => {
    if (!capturedBlob) return;
    const file = new File(
      [capturedBlob],
      `camera_room_${roomType || "capture"}_${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );
    const handoffUrl = URL.createObjectURL(file);
    stopActiveStream();
    clearPreview();
    onCapture(file, handoffUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <canvas ref={lumaCanvasRef} className="hidden" />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col text-white">
        {/* MODAL HEADER */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>{title}</span>
                {roomType && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {roomType}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Chụp ảnh hiện trường sắc nét để AI quét đồ vật và đánh giá an toàn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!capturedPreview && !cameraError && (
              <button
                type="button"
                onClick={handleToggleCamera}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 text-xs"
                title="Đổi camera trước/sau"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline text-[11px]">Đổi máy ảnh</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* LOW LIGHT WARNING BANNER */}
        {isLowLight && !capturedPreview && !cameraError && (
          <div className="px-4 py-2 bg-amber-500/20 border-b border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Sun className="h-4 w-4 shrink-0 text-amber-400" />
            <span>
              Phòng hơi thiếu sáng (&lt;50 Lux). Hãy bật thêm đèn để AI nhận diện chuẩn mép thảm và dây điện.
            </span>
          </div>
        )}

        {/* CAPTURE ERROR BANNER */}
        {captureError && !capturedPreview && !cameraError && (
          <div className="px-4 py-2 bg-rose-500/20 border-b border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{captureError}</span>
          </div>
        )}

        {/* MAIN VIEWFINDER AREA */}
        <div className="relative aspect-video max-h-[440px] w-full bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-rose-300 max-w-md space-y-3">
              <AlertTriangle className="h-10 w-10 mx-auto text-rose-400" />
              <div className="text-sm font-bold text-rose-200">Không thể truy cập máy ảnh</div>
              <p className="text-xs text-rose-300/80 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => void startCamera(facingMode, selectedDeviceId)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700"
              >
                Thử kết nối lại
              </button>
            </div>
          ) : capturedPreview ? (
            // Captured preview
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPreview}
                alt="Ảnh phòng đã chụp"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-teal-600/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Đã chụp ảnh hiện trường</span>
              </div>
            </div>
          ) : (
            // Keep <video> mounted across initialization so videoRef.current exists when the stream arrives
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  const vid = e.currentTarget;
                  if (vid.videoWidth > 0 && vid.videoHeight > 0) setIsVideoReady(true);
                  void vid.play().catch(() => {});
                }}
                onCanPlay={(e) => {
                  const vid = e.currentTarget;
                  if (vid.videoWidth > 0 && vid.videoHeight > 0) setIsVideoReady(true);
                }}
                onPlaying={(e) => {
                  const vid = e.currentTarget;
                  if (vid.videoWidth > 0 && vid.videoHeight > 0) setIsVideoReady(true);
                }}
                onEmptied={() => setIsVideoReady(false)}
                className="w-full h-full object-cover"
              />

              {(isInitializing || !isVideoReady) && (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 text-slate-300">
                  <RefreshCw className="h-8 w-8 animate-spin text-teal-400" />
                  <span className="text-xs">
                    {isInitializing ? "Đang mở máy ảnh..." : "Đang chờ khung hình từ máy ảnh..."}
                  </span>
                </div>
              )}

              {/* Viewfinder 3x3 Grid Overlay */}
              <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                <div className="w-full h-full border border-white/20 rounded-2xl grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-r border-b border-white/10" />
                  <div className="border-b border-white/10" />
                  <div className="border-r border-white/10" />
                  <div className="border-r border-white/10" />
                  <div />
                </div>
              </div>

              {/* Viewfinder Guideline Tag */}
              <div className="absolute bottom-3 inset-x-4 pointer-events-none text-center">
                <span className="inline-block px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[11px] font-medium border border-white/15 shadow-md">
                  🎯 {guidanceText}
                </span>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER CONTROLS */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {capturedPreview
              ? "Kiểm tra độ rõ nét của ảnh trước khi tiếp tục."
              : stream && !isVideoReady && !isInitializing
              ? "Đang đợi tín hiệu video — nếu vẫn đen, bấm Đổi máy ảnh."
              : "Nhấn nút Chụp ngay để chụp ảnh phòng."}
          </div>

          <div className="flex items-center gap-2.5">
            {capturedPreview ? (
              <>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Chụp lại</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg shadow-teal-500/25 active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Sử dụng ảnh này</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-semibold transition"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  disabled={!stream || !isVideoReady || !!cameraError || isInitializing}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-extrabold transition flex items-center gap-2 shadow-lg shadow-teal-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="h-2 w-2 rounded-full bg-slate-950 animate-ping" />
                  <Camera className="h-4 w-4" />
                  <span>Chụp ngay</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
