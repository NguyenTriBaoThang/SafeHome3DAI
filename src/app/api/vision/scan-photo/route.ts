import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { createVisionProvider, VisionProviderError } from "@/lib/vision/providers";
import { MAX_IMAGE_FILE_SIZE, validateImageBuffer } from "@/lib/vision/imagePreprocessor";
import {
  assertConsentForAction,
  ConsentRequiredError,
  ConsentRevokedError,
} from "@/lib/privacy/consentService";
import { resolveAccountScopeId } from "@/lib/persistence/reliablePersistence";

export const runtime = "nodejs";
export const maxDuration = 150;

async function POSTHandler(request: Request) {
  try {
    // 1. Bound & validate local payload before consent/provider calls (reject empty/invalid/oversized locally)
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Thiếu dữ liệu ảnh." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_IMAGE_FILE_SIZE) {
          await reader.cancel();
          return NextResponse.json({ error: "Ảnh vượt quá 10 MB." }, { status: 413 });
        }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const requestedRoomType = new URL(request.url).searchParams.get("roomType");
    const roomType = requestedRoomType && ["BEDROOM", "BATHROOM", "LIVING_ROOM"].includes(requestedRoomType)
      ? (requestedRoomType as "BEDROOM" | "BATHROOM" | "LIVING_ROOM")
      : undefined;
    const result = await createVisionProvider().analyze(Buffer.concat(chunks), undefined, roomType ? { roomType } : {});
    return NextResponse.json({ ...result, engine: result.provider === "gemini" ? "GEMINI_VLM" : "LOCAL_FINE_TUNED_DETECTOR" });
  } catch (error) {
    if (error instanceof ConsentRevokedError || error instanceof ConsentRequiredError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.statusCode }
      );
    }
    const known = error instanceof VisionProviderError;
    return NextResponse.json(
      {
        error: known ? error.message : "Không thể phân tích ảnh.",
        code: known ? error.code : "PROVIDER_UNAVAILABLE",
      },
      { status: known && error.code === "INVALID_IMAGE" ? 400 : 503 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
