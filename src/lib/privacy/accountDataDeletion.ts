import fs from "node:fs/promises";
import { prisma } from "@/lib/database/prisma";
import { deleteImageFile } from "@/lib/vision/imageStorage";
import { invalidateRoomAssessments } from "@/lib/risk/assessmentManager";
import {
  ResourceNotFoundError,
  PersistenceWriteError,
  resolveAccountScopeId,
} from "@/lib/persistence/reliablePersistence";
import { classifyDataPartition } from "@/lib/persistence/demoBoundary";
import { authStore, disconnectTenantDatabase } from "@/lib/auth/accounts";
import { accountDirectory } from "@/lib/auth/context";

/**
 * ==============================================================================
 * CASCADE DATA DELETION & RETENTION PROOF SERVICE (TASK A06)
 * ==============================================================================
 * Guarantees that deleting a room, survey, or user account deletes:
 * 1. Database records (Room, Assessments, Findings, RoomImages, VisionFacts)
 * 2. Private disk image files + directories
 * 3. In-memory snapshot caches
 * And reports deleted vs cleanupPending items transparently (never silent!).
 * ==============================================================================
 */

export interface CascadeDeletionReport {
  success: boolean;
  resourceType: "ROOM" | "ACCOUNT";
  resourceId: string;
  deletedDbRecords: {
    images: number;
    clarifications: number;
    facts: number;
    auditEventsCleared?: number;
  };
  deletedFiles: string[];
  cleanupPendingFiles: string[];
  cacheInvalidated: boolean;
  auditEventId: string | null;
}

export async function deleteRoomCascade(roomId: string): Promise<CascadeDeletionReport> {
  const accountId = resolveAccountScopeId();

  let txResult: {
    storageKeys: string[];
    imagesCount: number;
    clarificationsCount: number;
    factsCount: number;
    auditEventId: string;
  };

  try {
    txResult = await prisma.$transaction(async (tx) => {
      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (!room) {
        throw new ResourceNotFoundError("Không tìm thấy phòng với ID yêu cầu.");
      }

      const partition = classifyDataPartition(room);
      const roomImages = await tx.roomImage.findMany({
        where: { roomId },
        select: { id: true, storageKey: true },
      });

      const deletedClarifications = await tx.visionClarification.deleteMany({ where: { roomId } });
      const deletedFacts = await tx.visionRoomFact.deleteMany({ where: { roomId } });
      await tx.visionAuditEvent.deleteMany({ where: { roomId } });
      const deletedImages = await tx.roomImage.deleteMany({ where: { roomId } });

      // Deleting Room cascades SceneObject, SimulationScenario, SceneSnapshot, Assessment, HazardFinding
      await tx.room.delete({ where: { id: roomId } });

      const audit = await tx.persistenceAuditEvent.create({
        data: {
          accountId,
          dataPartition: partition,
          resourceType: "ROOM",
          resourceId: roomId,
          roomId,
          action: "DELETED",
          status: "saved",
          details: JSON.stringify({
            roomName: room.name,
            cascadeImagesDeleted: deletedImages.count,
            cascadeFactsDeleted: deletedFacts.count,
          }),
        },
      });

      return {
        storageKeys: roomImages.map((img) => img.storageKey),
        imagesCount: deletedImages.count,
        clarificationsCount: deletedClarifications.count,
        factsCount: deletedFacts.count,
        auditEventId: audit.id,
      };
    });
  } catch (error: any) {
    if (error instanceof ResourceNotFoundError) throw error;
    throw new PersistenceWriteError(
      `Không thể xóa dữ liệu phòng theo chuỗi: ${error?.message || "Lỗi DB"}`,
      "CASCADE_DELETE_FAILED",
      503
    );
  }

  // Clear in-memory cache immediately
  invalidateRoomAssessments(roomId);

  // Remove physical image files on disk and report any failed unlinks honestly
  const deletedFiles: string[] = [];
  const cleanupPendingFiles: string[] = [];

  for (const key of txResult.storageKeys) {
    const removed = await deleteImageFile(key);
    if (removed) deletedFiles.push(key);
    else cleanupPendingFiles.push(key);
  }

  return {
    success: true,
    resourceType: "ROOM",
    resourceId: roomId,
    deletedDbRecords: {
      images: txResult.imagesCount,
      clarifications: txResult.clarificationsCount,
      facts: txResult.factsCount,
    },
    deletedFiles,
    cleanupPendingFiles,
    cacheInvalidated: true,
    auditEventId: txResult.auditEventId,
  };
}

/**
 * Deletes an entire account: revokes sessions, removes account row, disconnects
 * tenant SQLite client, and deletes the private family directory & images.
 */
export async function deleteAccountAndFamilyData(accountId: string): Promise<{
  success: boolean;
  accountId: string;
  sessionsRevoked: boolean;
  directoryRemoved: boolean;
  cleanupPending: boolean;
  error?: string;
}> {
  const db = await authStore();
  await db.$executeRaw`DELETE FROM Session WHERE accountId=${accountId}`;
  await db.$executeRaw`DELETE FROM Account WHERE id=${accountId}`;

  await disconnectTenantDatabase(accountId);

  let directoryRemoved = false;
  let cleanupPending = false;
  let errorMsg: string | undefined;

  try {
    const dir = accountDirectory(accountId);
    await fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    directoryRemoved = true;
  } catch (err: any) {
    cleanupPending = true;
    errorMsg = err?.message || "Không thể xóa thư mục dữ liệu trên đĩa ngay lập tức.";
  }

  return {
    success: true,
    accountId,
    sessionsRevoked: true,
    directoryRemoved,
    cleanupPending,
    ...(errorMsg ? { error: errorMsg } : {}),
  };
}

