import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateImageBuffer } from "@/lib/vision/imagePreprocessor";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: { imageId: string } }) {
  try {
    const image = await prisma.roomImage.findUnique({ where: { id: params.imageId } });
    if (!image) return NextResponse.json({ error: "Không tìm thấy ảnh." }, { status: 404 });
    const bytes = await readFile(path.join(process.cwd(), "public/uploads/vision", path.basename(image.storageKey)));
    const validation = validateImageBuffer(bytes);
    if (!validation.isValid) return NextResponse.json({ error: "Ảnh đã lưu không hợp lệ." }, { status: 400 });
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": validation.mimeType,
      "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Không đọc được ảnh." }, { status: 404 }); }
}
