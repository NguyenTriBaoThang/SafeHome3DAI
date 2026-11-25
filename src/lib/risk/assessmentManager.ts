import { currentDatabaseScope } from "@/lib/database/scope";
import { prisma } from "@/lib/database/prisma";
import {
  AssessmentSnapshot,
  AssessmentReport,
  BeforeAfterComparisonResult,
} from "./types";
import { evaluateRoomHazards } from "./ruleEngine";
import { compareAssessments } from "./comparisonEngine";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";
import {
  DataPartition,
  PersistenceStatus,
  assertRealFieldEvidenceForReport,
  classifyDataPartition,
  buildDemoBanner,
} from "@/lib/persistence/demoBoundary";
import {
  persistAssessmentTransaction,
  PersistenceWriteError,
  ResourceNotFoundError,
} from "@/lib/persistence/reliablePersistence";

// In-memory snapshot cache for fast retrieval within the current account scope
const snapshots = new Map<string, AssessmentSnapshot>();
const scopedKey = (key: string) => `${currentDatabaseScope()?.id || "offline-test"}:${key}`;
const snapshotMemoryStore = {
  set: (key: string, snapshot: AssessmentSnapshot) => snapshots.set(scopedKey(key), snapshot),
  get: (key: string) => snapshots.get(scopedKey(key)),
};
export function invalidateRoomAssessments(roomId: string) {
  const prefix = `${currentDatabaseScope()?.id || "offline-test"}:`;
  for (const [key, snapshot] of snapshots) if (key.startsWith(prefix) && snapshot.roomId === roomId) snapshots.delete(key);
}

/**
 * Executes a full risk assessment on a room and persists findings atomically to SQLite
 * when the room exists (or fails explicitly if persistence is required or DB is down).
 */
export async function runAndPersistAssessment(
  rawInput: any,
  options?: { idempotencyKey?: string | null; requirePersistence?: boolean }
): Promise<
  AssessmentSnapshot & {
    persisted: boolean;
    persistenceStatus: PersistenceStatus;
    dataPartition: DataPartition;
    idempotentReplay?: boolean;
    auditEventId?: string | null;
  }
> {
  if (rawInput?.evidenceStatus === "PHOTO_DRAFT") {
    throw new Error("Bản dựng ảnh cần bổ sung khảo sát trước khi đánh giá.");
  }
  const snapshot = evaluateRoomHazards(rawInput);

  let dbRoom;
  try {
    dbRoom = await prisma.room.findUnique({ where: { id: snapshot.roomId } });
  } catch (err: any) {
    // Never swallow DB outage and return fake persisted=false success
    throw new PersistenceWriteError(
      `Không thể kết nối cơ sở dữ liệu khi kiểm tra phòng: ${err?.message || "DB error"}`,
      "DB_CONNECTION_FAILED",
      503
    );
  }

  if (dbRoom) {
    const result = await persistAssessmentTransaction({
      snapshot,
      idempotencyKey: options?.idempotencyKey,
    });
    cacheAssessmentSnapshot(snapshot);
    return {
      ...snapshot,
      persisted: result.persisted,
      persistenceStatus: result.persistenceStatus,
      dataPartition: result.dataPartition,
      idempotentReplay: result.idempotentReplay,
      auditEventId: result.auditEventId,
    };
  }

  if (options?.requirePersistence) {
    throw new ResourceNotFoundError(
      `Không tìm thấy phòng "${snapshot.roomId}" trong cơ sở dữ liệu để lưu thẩm định.`
    );
  }

  const partition = classifyDataPartition(rawInput || snapshot);
  cacheAssessmentSnapshot(snapshot);
  return {
    ...snapshot,
    persisted: false,
    persistenceStatus: "failed",
    dataPartition: partition,
  };
}

export async function loadAssessmentSnapshot(snapshotId: string): Promise<AssessmentSnapshot | null> {
  const cached = getAssessmentSnapshotById(snapshotId);
  if (cached) return cached;
  const record = await prisma.assessment.findUnique({ where: { id: snapshotId } });
  if (!record?.notes) return null;
  const saved = JSON.parse(record.notes);
  if (saved.format !== "risk-snapshot-v1" || saved.snapshot?.id !== record.id || saved.snapshot?.roomId !== record.roomId) return null;
  snapshotMemoryStore.set(saved.snapshot.id, saved.snapshot);
  return saved.snapshot;
}

/**
 * Gets the latest assessment snapshot for a given roomId.
 */
export async function getLatestAssessmentForRoom(roomId: string): Promise<AssessmentSnapshot | null> {
  const cached = snapshotMemoryStore.get(`latest-${roomId}`);
  if (cached) return cached;

  const latest = await prisma.assessment.findFirst({ where: { roomId }, orderBy: { assessmentDate: "desc" } });
  if (latest) {
    const restored = await loadAssessmentSnapshot(latest.id);
    if (restored) { snapshotMemoryStore.set(`latest-${roomId}`, restored); return restored; }
  }

  // Try to find if survey profile exists
  try {
    const surveyProfile = await prisma.surveyRoomProfile.findUnique({
      where: { roomId },
    });

    if (surveyProfile) {
      const parsed = JSON.parse(surveyProfile.profileJson);
      const evaluated = evaluateRoomHazards(parsed);
      snapshotMemoryStore.set(`latest-${roomId}`, evaluated);
      snapshotMemoryStore.set(evaluated.id, evaluated);
      return evaluated;
    }
  } catch {
    // ignore missing survey table / profile parse issues when probing
  }

  return null;
}

/**
 * Gets an assessment snapshot by its ID.
 */
export function getAssessmentSnapshotById(snapshotId: string): AssessmentSnapshot | null {
  return snapshotMemoryStore.get(snapshotId) || null;
}

/**
 * Stores a snapshot in memory cache.
 */
export function cacheAssessmentSnapshot(snapshot: AssessmentSnapshot): void {
  snapshotMemoryStore.set(snapshot.id, snapshot);
  snapshotMemoryStore.set(`latest-${snapshot.roomId}`, snapshot);
}

/**
 * Compares two assessment snapshots.
 */
export function compareSnapshots(
  beforeSnapshotId: string,
  afterSnapshotId: string
): BeforeAfterComparisonResult | null {
  const before = snapshotMemoryStore.get(beforeSnapshotId);
  const after = snapshotMemoryStore.get(afterSnapshotId);

  if (!before || !after) return null;
  return compareAssessments(before, after);
}

/**
 * Generates a comprehensive, explainable Assessment Report for printable and export views.
 * Enforces Demo vs Real boundary: blocks exporting DEMO data when strictFieldEvidence=true.
 */
export function generateAssessmentReport(
  snapshot: AssessmentSnapshot,
  options?: { strictFieldEvidence?: boolean; allowDemoPreview?: boolean; persisted?: boolean }
): AssessmentReport {
  const banner = options?.strictFieldEvidence
    ? assertRealFieldEvidenceForReport(snapshot, { allowDemoPreview: options?.allowDemoPreview })
    : buildDemoBanner(snapshot);

  return {
    meta: {
      reportId: `REP-${snapshot.id}`,
      generatedAt: snapshot.createdAt,
      targetResident: "Người cao tuổi (khảo sát an toàn phòng ngừa té ngã)",
      roomName: snapshot.roomName,
      roomType: snapshot.roomType,
      engineVersion: "SafeHome Risk Intelligence v1.0.0",
      disclaimer:
        "Báo cáo này được lập cho mục đích giáo dục, nâng cao nhận thức và hỗ trợ gia đình cải thiện môi trường sống. Hệ thống không đưa ra chẩn đoán y khoa và không thay thế cho đánh giá chuyên môn y tế.",
      dataPartition: banner.dataPartition,
      isDemo: banner.isDemo,
      demoBanner: banner.bannerText,
      persistenceStatus: options?.persisted === false ? "failed" : "saved",
    },
    summary: {
      safetyScore: snapshot.safetyScore,
      totalRulesEvaluated: snapshot.totalRulesEvaluated,
      detectedHazards: snapshot.detectedCount,
      highPriority: snapshot.highPriorityCount,
      mediumPriority: snapshot.mediumPriorityCount,
      lowPriority: snapshot.lowPriorityCount,
      needsVerification: snapshot.needsVerificationCount,
    },
    findings: snapshot.findings,
    recommendations: snapshot.recommendations,
    ruleAudits: snapshot.ruleEvaluations,
    curatedSources: CURATED_KNOWLEDGE_SOURCES.map((src) => ({
      id: src.id,
      title: src.title,
      organization: src.organization,
      year: src.publicationDate,
      url: src.officialUrl,
    })),
  };
}
