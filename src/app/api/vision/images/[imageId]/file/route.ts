import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { imageFilePath } from "@/lib/vision/imageStorage";
import { validateImageBuffer } from "@/lib/vision/imagePreprocessor";

export const runtime = "nodejs";
async function GETHandler(_request: Request, { params: routeParams }: { params: Promise<{ imageId: string }> }) {
  const params = await routeParams;
  try {
    const image = await prisma.roomImage.findUnique({ where: { id: params.imageId } });
    if (!image) return NextResponse.json({ error: "Không tìm thấy ảnh." }, { status: 404 });
    const bytes = await readFile(imageFilePath(image.storageKey));
    const validation = validateImageBuffer(bytes);
    if (!validation.isValid) return NextResponse.json({ error: "Ảnh đã lưu không hợp lệ." }, { status: 400 });
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": validation.mimeType,
      "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch { return NextResponse.json({ error: "Không đọc được ảnh." }, { status: 404 }); }
}

export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
