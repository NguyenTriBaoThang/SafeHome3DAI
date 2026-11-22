import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { runVisionAnalysis } from "@/lib/vision/visionProvider";
import { persistVisionAnalysis } from "@/lib/vision/visionPersistence";
import { VisionProviderError } from "@/lib/vision/providers";
import { MAX_IMAGE_FILE_SIZE } from "@/lib/vision/imagePreprocessor";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(req: NextRequest, { params }: { params: { imageId: string } }) {
  try {
    const { imageId } = params;
    const body = await req.json();
    const roomId = body.roomId || "room-bedroom-01", mode = body.mode || "AI_VISION";
    const roomType = body.roomType || "BEDROOM";
    if (typeof roomId !== "string" || roomId.length > 100 || !["BEDROOM", "BATHROOM", "LIVING_ROOM"].includes(roomType) ||
        !["AI_VISION", "MANUAL_REVIEW"].includes(mode) || typeof (body.caption || "") !== "string") {
      return NextResponse.json({ success: false, error: "Thông tin phòng hoặc chế độ không hợp lệ." }, { status: 400 });
    }
    let base64 = body.imageBufferBase64;
    if (base64 !== undefined && (typeof base64 !== "string" || base64.length > Math.ceil(MAX_IMAGE_FILE_SIZE / 3) * 4 + 100)) {
      return NextResponse.json({ success: false, error: "Ảnh không hợp lệ hoặc vượt quá 10 MB." }, { status: 413 });
    }
    if (base64?.startsWith("data:")) base64 = base64.slice(base64.indexOf(",") + 1);
    const demo = ["img-demo-bed", "img-demo-bedroom", "img-demo-bathroom"].includes(imageId) && !base64;
    if (!base64 && !demo && mode !== "MANUAL_REVIEW") {
      const image = await prisma.roomImage.findUnique({ where: { id: imageId } });
      if (!image || image.roomId !== roomId) throw new VisionProviderError("INVALID_IMAGE", "Không tìm thấy ảnh trong phòng đang chọn.");
      try { base64 = (await fs.readFile(path.join(process.cwd(), "public/uploads/vision", path.basename(image.storageKey)))).toString("base64"); }
      catch { throw new VisionProviderError("INVALID_IMAGE", "Không đọc được ảnh đã lưu. Hãy tải lại ảnh."); }
    }
    if (base64 && Buffer.from(base64, "base64").toString("base64") !== base64) {
      throw new VisionProviderError("INVALID_IMAGE", "Dữ liệu ảnh base64 không hợp lệ.");
    }
    const result = await runVisionAnalysis(imageId, roomId, { mode, roomType, viewpoint: body.viewpoint,
      caption: body.caption || "", imageBufferBase64: base64, demo });
    // Demonstration and drawing mode never write fabricated detections into a real survey.
    if (demo || mode === "MANUAL_REVIEW") return NextResponse.json({ success: true, data: result, persisted: false });
    await persistVisionAnalysis(result, Buffer.from(base64, "base64"), body.caption || "", roomType, body.viewpoint || "ENTRANCE");
    return NextResponse.json({ success: true, data: result, persisted: true, image: { id: imageId, fileUrl: `/api/vision/images/${encodeURIComponent(imageId)}/file` } });
  } catch (error) {
    if (error instanceof VisionProviderError) return NextResponse.json({ success: false, error: error.message, code: error.code },
      { status: error.code === "INVALID_IMAGE" ? 400 : 503 });
    return NextResponse.json({ success: false, error: "Không thể hoàn tất hoặc lưu phân tích. Kết quả chưa được lưu.", code: "PERSISTENCE_FAILED" }, { status: 503 });
  }
}
