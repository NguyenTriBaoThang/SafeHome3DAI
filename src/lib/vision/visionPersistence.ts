import { prisma } from "../database/prisma";
import type { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { saveImageFile, deleteImageFile, imageFilePath } from "./imageStorage";
import { readFile } from "node:fs/promises";
import { prepareProviderImage } from "./providers/normalization";
import type { ProviderAnalysisResult } from "./visionProvider";
import { imageDimensions } from "./imageMetadata";

export async function persistVisionAnalysis(result: ProviderAnalysisResult, photo: Buffer, caption: string, roomType: string,
  viewpoint: string, database: PrismaClient = prisma) {
  const prepared = prepareProviderImage(photo);
  const extension = prepared.mimeType === "image/png" ? "png" : prepared.mimeType === "image/webp" ? "webp" : "jpg";
  const file = await saveImageFile(result.roomId, prepared.image, extension, result.imageId);
  const dimensions = imageDimensions(prepared.image);
  let previousStorage: string | undefined;
  try {
    await database.$transaction(async tx => {
      const room = await tx.surveyRoom.findUnique({ where: { id: result.roomId } });
      if (room && room.roomType !== roomType) throw new Error("Loại phòng không khớp hồ sơ đang chọn.");
      if (!room) await tx.surveyRoom.create({ data: { id: result.roomId, roomType,
        name: roomType === "BATHROOM" ? "Nhà vệ sinh từ ảnh" : "Phòng từ ảnh",
        survey: { connectOrCreate: { where: { id: `vision-${result.roomId}` }, create: { id: `vision-${result.roomId}`, name: "Khảo sát từ ảnh hiện trường" } } } } });
      const image = await tx.roomImage.findUnique({ where: { id: result.imageId } });
      if (image && image.roomId !== result.roomId) throw new Error("Ảnh thuộc phòng khác.");
      if (image) {
        if (!(await readFile(imageFilePath(image.storageKey))).equals(prepared.image)) throw new Error("ID ảnh đã thuộc ảnh khác. Hãy dùng ID mới để giữ nguyên nguồn bằng chứng.");
        previousStorage = image.storageKey;
      }
      await tx.roomImage.upsert({ where: { id: result.imageId },
        create: { id: result.imageId, roomId: result.roomId, storageKey: file.filename, caption, viewpoint,
          imageWidth: dimensions?.width ?? null, imageHeight: dimensions?.height ?? null, consentStatus: true },
        update: { caption, viewpoint, imageWidth: dimensions?.width ?? null, imageHeight: dimensions?.height ?? null } });
      await tx.visionAnalysis.create({ data: { id: result.id, roomId: result.roomId, imageId: result.imageId,
        modelId: result.modelId, modelVersion: result.modelVersion, analysisStatus: result.analysisStatus,
        startedAt: new Date(result.startedAt), completedAt: new Date(result.completedAt!) } });
      for (const d of result.detections) await tx.objectDetection.create({ data: { id: d.id, analysisId: result.id,
        category: d.category, originalLabel: d.originalLabel, confidence: d.confidence, bboxJson: JSON.stringify(d.bbox),
        source: d.source, verificationStatus: d.verificationStatus } });
      for (const o of result.observations) await tx.visionObservation.create({ data: { id: o.id, analysisId: result.id,
        observationType: o.observationType, description: o.description, uncertaintyType: o.uncertaintyType,
        requiresConfirmation: true, verificationStatus: "PENDING_REVIEW", surveyQuestionId: o.surveyQuestionId,
        evidenceJson: JSON.stringify({ ...o.evidenceJson, relatedDetectionIds: o.relatedDetectionIds }) } });
      // Existing evidenceJson stores provenance without a destructive schema migration.
      const context = await tx.visionObservation.create({ data: { analysisId: result.id, observationType: "REVIEW_CONTEXT",
        description: "Ngữ cảnh xác nhận và nguồn suy luận", uncertaintyType: "CONDITION_UNCERTAINTY",
        evidenceJson: JSON.stringify({ provider: result.provider, risks: result.risks, risk_supported: result.risk_supported,
          riskCandidates: result.riskCandidates, providerMetadata: result.providerMetadata, modelSha256: result.modelSha256,
          untrainedClasses: result.untrainedClasses, imageSha256: createHash("sha256").update(prepared.image).digest("hex") }) } });
      for (const q of result.clarifications) await tx.visionClarification.create({ data: { id: q.id, roomId: result.roomId,
        observationId: context.id, surveyQuestionId: q.surveyQuestionId, questionText: q.questionText,
        optionsJson: JSON.stringify(q.options), status: "PENDING" } });
    }, { timeout: 20000 });
    if (previousStorage) await deleteImageFile(file.filename);
    return { ...file, filename: previousStorage || file.filename };
  } catch (error) { await deleteImageFile(file.filename); throw error; }
}

export function hydrateVisionAnalysis(analysis: any) {
  const observations = analysis.observations || [];
  const context = observations.find((o: any) => o.observationType === "REVIEW_CONTEXT");
  const metadata = context?.evidenceJson ? JSON.parse(context.evidenceJson) : {};
  return { id: analysis.id, roomId: analysis.roomId, imageId: analysis.imageId, modelId: analysis.modelId,
    modelVersion: analysis.modelVersion, analysisStatus: analysis.analysisStatus,
    startedAt: new Date(analysis.startedAt).toISOString(), completedAt: analysis.completedAt ? new Date(analysis.completedAt).toISOString() : undefined,
    detections: analysis.detections.map((d: any) => ({ ...d, imageId: analysis.imageId, bbox: JSON.parse(d.bboxJson),
      createdAt: new Date(d.createdAt).toISOString(), updatedAt: new Date(d.updatedAt).toISOString() })),
    observations: observations.filter((o: any) => o.observationType !== "REVIEW_CONTEXT").map((o: any) => ({ ...o,
      evidenceJson: o.evidenceJson ? JSON.parse(o.evidenceJson) : undefined,
      relatedDetectionIds: o.evidenceJson ? JSON.parse(o.evidenceJson).relatedDetectionIds || [] : [] })),
    clarifications: observations.flatMap((o: any) => o.clarifications || []).map((q: any) => ({ ...q, options: JSON.parse(q.optionsJson) })),
    ...metadata };
}
