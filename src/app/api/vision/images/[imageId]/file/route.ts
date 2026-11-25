import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { readFile } from "node:fs/promises";
import { imageFilePath } from "@/lib/vision/imageStorage";
import { validateImageBuffer } from "@/lib/vision/imagePreprocessor";
import { verifySignedMediaToken } from "@/lib/privacy/mediaSecurity";
import { resolveAccountScopeId } from "@/lib/persistence/reliablePersistence";

export const runtime = "nodejs";
async function GETHandler(
  request: Request,
  { params: routeParams }: { params: Promise<{ imageId: string }> }
) {
  const params = await routeParams;
  try {
    const url = new URL(request.url);
    const expires = url.searchParams.get("expires");
    const sig = url.searchParams.get("sig");

    // If a short-lived signed URL token is supplied, enforce strict expiry + HMAC account binding
    if (expires !== null || sig !== null) {
      const verification = verifySignedMediaToken({
        imageId: params.imageId,
        accountId: resolveAccountScopeId(),
        expiresRaw: expires || "",
        sig: sig || "",
      });
      if (!verification.valid) {
        return NextResponse.json(
          {
            success: false,
            code: verification.reason === "EXPIRED" ? "SIGNED_URL_EXPIRED" : "INVALID_SIGNED_URL",
            error:
              verification.reason === "EXPIRED"
                ? "Liên kết ảnh ngắn hạn đã hết hạn."
                : "Liên kết ảnh không hợp lệ hoặc không thuộc tài khoản này.",
          },
          { status: 403 }
        );
      }
    }

    const image = await prisma.roomImage.findUnique({ where: { id: params.imageId } });
    if (!image) return NextResponse.json({ error: "Không tìm thấy ảnh." }, { status: 404 });
    const bytes = await readFile(imageFilePath(image.storageKey));
    const validation = validateImageBuffer(bytes);
    if (!validation.isValid) {
      return NextResponse.json({ error: "Ảnh đã lưu không hợp lệ." }, { status: 400 });
    }
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": validation.mimeType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Privacy-Policy": "PRIVATE_HOUSEHOLD_MEDIA",
      },
    });
  } catch {
    return NextResponse.json({ error: "Không đọc được ảnh." }, { status: 404 });
  }
}

export const GET = withAccount(GETHandler);
export const dynamic = "force-dynamic";
