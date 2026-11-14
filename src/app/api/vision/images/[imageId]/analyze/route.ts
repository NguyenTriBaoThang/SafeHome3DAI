import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { runVisionAnalysis } from "@/lib/vision/visionProvider";

export async function POST(
  req: NextRequest,
  { params }: { params: { imageId: string } }
) {
  try {
    const { imageId } = params;
    const body = await req.json().catch(() => ({}));
    const roomId = body.roomId || "room-bedroom-1";
    const mode = body.mode || "AI_VISION";
    const roomType = body.roomType || (roomId.toLowerCase().includes("bath") ? "BATHROOM" : "BEDROOM");

    // 1. Run inference/heuristic
    const analysisResult = await runVisionAnalysis(imageId, roomId, {
      mode,
      roomType,
      viewpoint: body.viewpoint,
    });

    // 2. Persist analysis & detections in database
    try {
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

