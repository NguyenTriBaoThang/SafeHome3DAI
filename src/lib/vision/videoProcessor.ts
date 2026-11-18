/**
 * Client-Side Video Frame Extraction Utility
 * Extracts keyframes from room scanning videos for multi-angle AI reconstruction.
 */

export interface ExtractedFrame {
  id: string;
  dataUrl: string;
  timestampSeconds: number;
  viewpoint: "ENTRANCE" | "OPPOSITE_CORNER" | "WALKWAY" | "CLOSE_UP";
}

/**
 * Extracts N evenly spaced keyframes from a video File or Blob using HTML5 Canvas.
 */
export async function extractKeyframesFromVideo(
  videoFile: File | Blob,
  maxFrames: number = 4
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    const frames: ExtractedFrame[] = [];
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      URL.revokeObjectURL(url);
      reject(new Error("Không thể khởi tạo 2D Canvas context"));
      return;
    }

    video.onloadedmetadata = async () => {
      const duration = video.duration || 5;
      canvas.width = Math.min(video.videoWidth || 1280, 1280);
      canvas.height = Math.min(video.videoHeight || 720, 720);

      // Extract at [15%, 40%, 65%, 90%] of video duration
      const viewpoints: Array<"ENTRANCE" | "OPPOSITE_CORNER" | "WALKWAY" | "CLOSE_UP"> = [
        "ENTRANCE",
        "OPPOSITE_CORNER",
        "WALKWAY",
        "CLOSE_UP",
      ];

      try {
        for (let i = 0; i < maxFrames; i++) {
          const targetTime = Math.max(
            0.5,
            (duration / (maxFrames + 1)) * (i + 1)
          );
          await seekToTime(video, targetTime);

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

          frames.push({
            id: `frame_${i + 1}_${Math.round(targetTime)}s`,
            dataUrl,
            timestampSeconds: Number(targetTime.toFixed(1)),
            viewpoint: viewpoints[i % viewpoints.length],
          });
        }

        URL.revokeObjectURL(url);
        resolve(frames);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Lỗi khi giải mã video"));
    };
  });
}

function seekToTime(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      resolve();
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = time;
  });
}
