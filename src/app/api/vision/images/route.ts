import { withAccount } from "@/lib/auth/withAccount";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/database/prisma";
import { prepareProviderImage } from "@/lib/vision/providers/normalization";
import { saveImageFile, deleteImageFile } from "@/lib/vision/imageStorage";
import { imageDimensions } from "@/lib/vision/imageMetadata";
import { VisionProviderError } from "@/lib/vision/providers";

async function POSTHandler(req: NextRequest) {
  let saved: string | undefined;
  try {
    const form = await req.formData(), file = form.get("file"), roomId = form.get("roomId"), viewpoint = form.get("viewpoint") || "ENTRANCE";
    const caption = form.get("caption") || "";
    if (!file || typeof file === "string" || typeof roomId !== "string" || !roomId.trim() || roomId.length > 100 ||
        typeof caption !== "string" || caption.length > 1000 || typeof viewpoint !== "string" ||
        !["ENTRANCE", "OPPOSITE_CORNER", "WALKWAY", "CLOSE_UP", "OTHER"].includes(viewpoint) || form.get("consent") !== "true") {
      return NextResponse.json({ success: false, error: "Ảnh, phòng, góc chụp không hợp lệ hoặc chưa đồng ý lưu ảnh." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ success: false, error: "Ảnh vượt quá 10 MB." }, { status: 413 });
    const prepared = prepareProviderImage(Buffer.from(await file.arrayBuffer()));
    const dimensions = imageDimensions(prepared.image), id = randomUUID();
    const extension = prepared.mimeType === "image/png" ? "png" : prepared.mimeType === "image/webp" ? "webp" : "jpg";
    const stored = await saveImageFile(roomId, prepared.image, extension, id); saved = stored.filename;
    const image = await prisma.roomImage.create({ data: { id, roomId, storageKey: stored.filename, viewpoint, caption,
      imageWidth: dimensions?.width ?? null, imageHeight: dimensions?.height ?? null, consentStatus: true } });
    return NextResponse.json({ success: true, data: { ...image, fileUrl: stored.fileUrl } }, { status: 201 });
  } catch (error) {
    if (saved) await deleteImageFile(saved);
    return NextResponse.json({ success: false, error: error instanceof VisionProviderError ? error.message : "Không lưu được ảnh. Hãy thử lại." },
      { status: error instanceof VisionProviderError ? 400 : 503 });
  }
}
export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
