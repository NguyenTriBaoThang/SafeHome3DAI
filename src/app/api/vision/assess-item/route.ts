import { NextResponse } from "next/server";
import { analyzeItemHazardFromImage } from "@/lib/vision/itemHazardAnalyzer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let buffer: Buffer;
    let fileName = "uploaded-item.jpg";
    let mimeType = "image/jpeg";
    let itemHint = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image") as File | null;
      itemHint = (formData.get("itemHint") as string) || "";

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

      if (body.imageBase64) {
        const cleanBase64 = body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(cleanBase64, "base64");
      } else if (body.presetCategory) {
        // Mock buffer for presets
        buffer = Buffer.from("preset-mock-image-data");
        itemHint = body.presetCategory;
      } else {
        return NextResponse.json(
          { error: "Thiếu dữ liệu hình ảnh base64 hoặc presetCategory." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Content-Type không được hỗ trợ. Vui lòng gửi multipart/form-data hoặc application/json." },
        { status: 415 }
      );
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: "Dữ liệu hình ảnh rỗng hoặc không hợp lệ." },
        { status: 400 }
      );
    }

    const assessment = await analyzeItemHazardFromImage(
      buffer,
      fileName,
      mimeType,
      itemHint
    );

    return NextResponse.json({
      success: true,
      assessment,
    });
  } catch (error: any) {
    console.error("[API assess-item] Error during item assessment:", error);
    return NextResponse.json(
      {
        error: "Đã xảy ra lỗi trong quá trình thẩm định rủi ro vật dụng.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

