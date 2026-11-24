import { prisma } from "@/lib/database/prisma";
import type { PrismaClient } from "@prisma/client";
import { deleteImageFile } from "./imageStorage";
import { syncVisionAnswersInTransaction } from "./surveySyncAdapter";
import { invalidateRoomAssessments } from "@/lib/risk/assessmentManager";

export async function deleteVisionImage(imageId: string, database: PrismaClient = prisma) {
  const image = await database.$transaction(async tx => {
    const image = await tx.roomImage.findUnique({ where: { id: imageId },
      include: { analyses: { include: { observations: { include: { clarifications: true } } } } } });
    if (!image) return null;
    const questions = image.analyses.flatMap(a => a.observations.flatMap(o => o.clarifications));
    const ids = questions.map(q => q.id);
    // Keep an unknown withdrawal marker: deleting a new answer must not revive an
    // older answer from a different image. Independent survey answers survive.
    await tx.visionClarification.updateMany({ where: { id: { in: ids }, status: "ANSWERED" }, data: { userResponse: "UNKNOWN" } });
    await tx.visionClarification.updateMany({ where: { id: { in: ids }, status: "PENDING" }, data: { status: "DISMISSED" } });
    await tx.visionRoomFact.updateMany({ where: { roomId: image.roomId, evidenceReference: { in: [...ids, imageId] } },
      data: { confirmedValue: null, verificationStatus: "PENDING_REVIEW" } });
    await tx.roomImage.delete({ where: { id: imageId } });
    await syncVisionAnswersInTransaction(tx, image.roomId);
    await tx.visionAuditEvent.create({ data: { roomId: image.roomId, actionType: "IMAGE_DELETED", objectId: imageId,
      newValue: JSON.stringify({ storageKey: image.storageKey, withdrawnQuestions: ids }), actorId: "USER" } });
    return image;
  }, { timeout: 20000 });
  if (!image) return null;
  invalidateRoomAssessments(image.roomId);
  // A failed file cleanup cannot leave the file accessible: the DB record is gone
  // and files are private. Report it so maintenance can retry cleanup.
  const removed = await deleteImageFile(image.storageKey);
  return { imageId, cleanupPending: !removed };
}
