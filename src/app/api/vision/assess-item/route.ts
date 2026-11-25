import { withAccount } from "@/lib/auth/withAccount";
import { NextResponse } from "next/server";
import { analyzeItemHazardFromImage } from "@/lib/vision/itemHazardAnalyzer";
import {
  assertConsentForAction,
  ConsentRequiredError,
  ConsentRevokedError,
} from "@/lib/privacy/consentService";
import { resolveAccountScopeId } from "@/lib/persistence/reliablePersistence";
import { inspectAndSanitizeUntrustedText } from "@/lib/security/promptInjectionGuard";
import { buildSafeErrorPayload } from "@/lib/security/resilience";

export const runtime = "nodejs";

async function POSTHandler(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const consentHeader = request.headers.get("X-SafeHome-Consent");

    let buffer: Buffer;
    let fileName = "uploaded-item.jpg";
    let mimeType = "image/jpeg";
    let itemHint = "";
    let hasInlineConsent = consentHeader === "true";
    let isPresetOnly = false;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      itemHint = (formData.get("itemHint") as string) || "";
      if (formData.get("consent") === "true") hasInlineConsent = true;

      if (!file) {
        return NextResponse.json(
          { error: "Vui lòng chọn hoặc tải lên một hình ảnh vật dụng cần thẩm định." },
          { status: 400 }
        );
      }

      fileName = file.name;
      mimeType = file.type || "image/jpeg";
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      itemHint = body.itemHint || "";
      fileName = body.fileName || "item-photo.jpg";
      mimeType = body.mimeType || "image/jpeg";
      if (body.consent === true) hasInlineConsent = true;

      if (body.imageBase64) {
        const cleanBase64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(cleanBase64, "base64");
      } else if (body.presetCategory) {
        buffer = Buffer.from("preset-mock-image-data");
        itemHint = body.presetCategory;
        isPresetOnly = true;
      } else {
        return NextResponse.json(
          { error: "Thiếu dữ liệu hình ảnh base64 hoặc presetCategory." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            "Content-Type không được hỗ trợ. Vui lòng gửi multipart/form-data hoặc application/json.",
        },
        { status: 415 }
      );
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: "Dữ liệu hình ảnh rỗng hoặc không hợp lệ." },
        { status: 400 }
      );
    }

    // Strict Consent Guard before external Gemini processing on real user photos
    if (!isPresetOnly && process.env.GEMINI_API_KEY) {
      await assertConsentForAction({
        accountId: resolveAccountScopeId(),
        requiredScope: "third_party_ai",
        requestConsentFlag: hasInlineConsent,
      });
    } else if (!isPresetOnly) {
      // Even without Gemini key, reject if user revoked consent
      await assertConsentForAction({
        accountId: resolveAccountScopeId(),
        requiredScope: "image_storage",
        requestConsentFlag: true,
      });
    }

    const safeItemHint = inspectAndSanitizeUntrustedText(itemHint, 200).sanitizedText;
    const assessment = await analyzeItemHazardFromImage(buffer, fileName, mimeType, safeItemHint);

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: any) {
    if (error instanceof ConsentRevokedError || error instanceof ConsentRequiredError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.statusCode }
      );
    }
    return NextResponse.json(
      buildSafeErrorPayload(
        error,
        "Đã xảy ra lỗi trong quá trình thẩm định rủi ro vật dụng.",
        "ITEM_ASSESSMENT_FAILED"
      ),
      { status: 500 }
    );
  }
}

export const POST = withAccount(POSTHandler);
export const dynamic = "force-dynamic";
