import { NextResponse } from "next/server";
import { pipeline, RawImage, type ZeroShotObjectDetectionPipeline } from "@huggingface/transformers";
import { furniture, estimateWall } from "@/lib/vision/scannerFurniture";
import type { VisionDetection } from "@/lib/vision/types";

export const runtime = "nodejs";

let detector: Promise<ZeroShotObjectDetectionPipeline> | undefined;
function loadDetector() {
  detector ??= pipeline("zero-shot-object-detection", "Xenova/owlvit-base-patch32", {
    dtype: "q8", cache_dir: ".next/cache/room-vision",
    session_options: { intraOpNumThreads: 4 },
  }).catch(error => { detector = undefined; throw error; });
  return detector;
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length"));
  if (length > 4_000_000) return new Response(null, { status: 413 });
  const blob = await request.blob();
  if (!blob.size || blob.size > 4_000_000 || blob.type !== "image/jpeg") {
    return new Response(null, { status: 400 });
  }
  try {
    const image = await RawImage.fromBlob(blob);
    const model = await loadDetector();
    const predictions = await model(image, furniture.map(([prompt]) => prompt), {
      percentage: true, threshold: 0.15, top_k: 80,
    });
    const imageId = crypto.randomUUID();
    const now = new Date().toISOString();
    const detections: VisionDetection[] = [];
    const clamp = (n: number) => Math.max(0, Math.min(1, n));
    for (const { label, score, box } of predictions.flat()) {
      const entry = furniture.find(([prompt]) => prompt === label);
      if (!entry) continue;
      const [, category, originalLabel, sceneModelType = category] = entry;
      const bbox = { xMin: clamp(box.xmin), xMax: clamp(box.xmax), yMin: clamp(box.ymin), yMax: clamp(box.ymax) };
      const { xMin, xMax, yMin, yMax } = bbox;
      const area = (xMax - xMin) * (yMax - yMin);
      if (xMax <= xMin || yMax <= yMin || detections.some(d => {
        if (d.sceneModelType !== sceneModelType && (d.category !== category || category === "other")) return false;
        const b = d.bbox;
        const overlap = Math.max(0, Math.min(xMax,b.xMax)-Math.max(xMin,b.xMin)) * Math.max(0, Math.min(yMax,b.yMax)-Math.max(yMin,b.yMin));
        return overlap / (area + (b.xMax-b.xMin)*(b.yMax-b.yMin) - overlap) > 0.45;
      })) continue;
      const center = (xMin + xMax) / 2;
      const placementWall = estimateWall(sceneModelType, center);
      detections.push({ id: crypto.randomUUID(), analysisId: imageId, imageId, category, originalLabel, sceneModelType,
        placementWall, bbox, confidence: score, source: "OBJECT_DETECTOR", verificationStatus: "PENDING_REVIEW", createdAt: now, updatedAt: now });
    }
    return NextResponse.json({ detections });
  } catch (error) {
    console.error("Room photo inference failed", error);
    return NextResponse.json({ error: "Không thể đọc ảnh hoặc tải mô hình nhận diện. Hãy kiểm tra kết nối của máy chủ rồi thử lại." }, { status: 503 });
  }
}

