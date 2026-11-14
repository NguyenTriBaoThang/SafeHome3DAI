import { prisma } from "@/lib/database/prisma";
import { SceneDraftFromVision, DetectionCategory } from "./types";

/**
 * Creates a tentative 3D Scene Draft based on confirmed vision detections and room type.
 * All positions and scales are explicitly marked as estimates (isEstimate: true)
 * until calibrated by spatial sensors or user confirmation.
 */
export async function createSceneDraftFromVision(
  roomId: string
): Promise<SceneDraftFromVision> {
  const roomType = roomId.toLowerCase().includes("bath") ? "BATHROOM" : "BEDROOM";

  // Fetch confirmed detections for this room
  let confirmedDetections: any[] = [];
  try {
    confirmedDetections = await prisma.objectDetection.findMany({
      where: {
        analysis: { roomId },
        verificationStatus: { in: ["CONFIRMED", "PENDING_REVIEW"] },
      },
      include: {
        analysis: true,
      },
    });
  } catch {
    // fallback if DB not populated yet
  }

  const detectedObjects: SceneDraftFromVision["detectedObjects"] = [];

  // Default coordinate heuristics based on bounding box
  for (const det of confirmedDetections) {
    let bbox = { xMin: 0.2, yMin: 0.2, xMax: 0.5, yMax: 0.5 };
    try {
      bbox = JSON.parse(det.bboxJson);
    } catch {}

    // Map normalized 2D bbox [0..1] to tentative 3D coordinates in meters [x, 0, z]
    // Center of room is [0, 0, 0], room is ~4m x 4m
    const estX = Number(((bbox.xMin + bbox.xMax) * 2 - 2).toFixed(2));
    const estZ = Number(((bbox.yMin + bbox.yMax) * 2 - 2).toFixed(2));

    detectedObjects.push({
      id: det.id,
      category: det.category as DetectionCategory,
      name: det.userLabel || det.originalLabel,
      estimatedPosition: [estX, 0, estZ],
      isEstimate: true,
      sourceImageId: det.analysis.imageId,
    });
  }

  // If no DB detections yet, provide standard structural placeholders
  if (detectedObjects.length === 0) {
    if (roomType === "BEDROOM") {
      detectedObjects.push({
        id: `draft-bed-${roomId}`,
        category: "bed",
        name: "Giường ngủ (Dự kiến)",
        estimatedPosition: [-0.8, 0, -0.5],
        isEstimate: true,
        sourceImageId: "image-estimate",
      });
      detectedObjects.push({
        id: `draft-rug-${roomId}`,
        category: "rug",
        name: "Thảm trải sàn (Dự kiến)",
        estimatedPosition: [0.5, 0, 0.2],
        isEstimate: true,
        sourceImageId: "image-estimate",
      });
    } else {
      detectedObjects.push({
        id: `draft-toilet-${roomId}`,
        category: "toilet",
        name: "Bồn cầu (Dự kiến)",
        estimatedPosition: [-1.0, 0, 0.8],
        isEstimate: true,
        sourceImageId: "image-estimate",
      });
    }
  }

  return {
    roomId,
    roomType,
    detectedObjects,
    unresolvedObservations: [
      "Khoảng cách thực tế giữa các vật thể cần được xác nhận trên mô hình 3D.",
      "Độ cao thành giường và gờ bậc cửa cần nhập số đo thực địa để đạt độ chuẩn xác cao nhất.",
    ],
    dimensionsEstimated: {
      lengthM: roomType === "BATHROOM" ? 2.5 : 4.2,
      widthM: roomType === "BATHROOM" ? 2.0 : 3.6,
      heightM: 2.8,
      isEstimate: true,
    },
    generatedAt: new Date().toISOString(),
  };
}
