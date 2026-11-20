import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { runVisionAnalysis } from "@/lib/vision/visionProvider";
import fs from "fs";
import path from "path";

export async function POST(
  req: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { imageId } = params;
    const body = await req.json().catch(() => ({}));
    const roomId = body.roomId || "room-bedroom-01";
    const mode = body.mode || "AI_VISION";
    const roomType = body.roomType || (roomId.toLowerCase().includes("bath") ? "BATHROOM" : "BEDROOM");

    // Extract base64 image if provided
    let imageBufferBase64 = body.imageBufferBase64;
    if (imageBufferBase64 && imageBufferBase64.includes(",")) {
      imageBufferBase64 = imageBufferBase64.split(",")[1];
    }

    // If not in body, check disk or database storage
    if (!imageBufferBase64 && imageId) {
      try {
        const roomImg = await prisma.roomImage.findUnique({
          where: { id: imageId },
        });
        if (roomImg?.storageKey) {
          const filePath = path.join(process.cwd(), "public", "uploads", "vision", path.basename(roomImg.storageKey));
          if (fs.existsSync(filePath)) {
            const buf = await fs.promises.readFile(filePath);
            imageBufferBase64 = buf.toString("base64");
          }
        }
      } catch (err) {
        // ignore fallback
      }
    }

    // 1. Run inference/heuristic
    const caption = body.caption || "";
    const analysisResult = await runVisionAnalysis(imageId, roomId, {
      mode,
      roomType,
      viewpoint: body.viewpoint,
      caption,
      imageBufferBase64,
    });

    // 2. Persist analysis & detections in database
    try {
      // Ensure parent roomImage exists if custom upload
      const existingImg = await prisma.roomImage.findUnique({ where: { id: imageId } });
      if (!existingImg) {
        await prisma.roomImage.create({
          data: {
            id: imageId,
            roomId,
            storageKey: imageId,
            viewpoint: body.viewpoint || "ENTRANCE",
            caption: caption || "Ảnh hiện trường",
          },
        }).catch(() => {});
      }

      const dbAnalysis = await prisma.visionAnalysis.create({
        data: {
          id: analysisResult.id,
          roomId,
          imageId,
          modelId: analysisResult.modelId,
          modelVersion: analysisResult.modelVersion,
          analysisStatus: "COMPLETED",
          startedAt: new Date(analysisResult.startedAt),
          completedAt: new Date(),
        },
      });

      // Save detections
      for (const det of analysisResult.detections) {
        await prisma.objectDetection.create({
          data: {
            id: det.id,
            analysisId: dbAnalysis.id,
            category: det.category,
            originalLabel: det.originalLabel,
            confidence: det.confidence,
            bboxJson: JSON.stringify(det.bbox),
            source: det.source,
            verificationStatus: det.verificationStatus,
          },
        });
      }

      // Save observations
      for (const obs of analysisResult.observations) {
        await prisma.visionObservation.create({
          data: {
            id: obs.id,
            analysisId: dbAnalysis.id,
            observationType: obs.observationType,
            description: obs.description,
            uncertaintyType: obs.uncertaintyType,
            requiresConfirmation: obs.requiresConfirmation,
            verificationStatus: obs.verificationStatus,
            surveyQuestionId: obs.surveyQuestionId,
          },
        });
      }

      // Save clarifications
      for (const clar of analysisResult.clarifications) {
        await prisma.visionClarification.create({
          data: {
            id: clar.id,
            roomId,
            observationId: clar.observationId || null,
            surveyQuestionId: clar.surveyQuestionId,
            questionText: clar.questionText,
            optionsJson: JSON.stringify(clar.options),
            status: clar.status,
          },
        });
      }
    } catch (err) {
      console.warn("[VisionAnalyze API] Persistence fallback to in-memory:", err);
    }

    return NextResponse.json({ success: true, data: analysisResult });
  } catch (error: any) {
    console.error("[VisionAnalyze API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Lỗi phân tích hình ảnh" },
      { status: 500 }
    );
  }
}

