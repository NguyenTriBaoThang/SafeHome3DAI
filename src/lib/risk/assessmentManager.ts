import { currentDatabaseScope } from "@/lib/database/scope";
import { prisma } from "@/lib/database/prisma";
import {
  AssessmentInput,
  AssessmentSnapshot,
  AssessmentReport,
  BeforeAfterComparisonResult,
} from "./types";
import { evaluateRoomHazards } from "./ruleEngine";
import { compareAssessments } from "./comparisonEngine";
import { CURATED_KNOWLEDGE_SOURCES } from "@/data/curatedKnowledge";

// In-memory snapshot cache for fast retrieval and demo/offline scenarios
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
 * Executes a full risk assessment on a room and persists findings to SQLite database if room exists.
 */
export async function runAndPersistAssessment(rawInput: any): Promise<AssessmentSnapshot & { persisted: boolean }> {
  if (rawInput?.evidenceStatus === "PHOTO_DRAFT") throw new Error("Bản dựng ảnh cần bổ sung khảo sát trước khi đánh giá.");
  const snapshot = evaluateRoomHazards(rawInput);
  let persisted = false;
  const dbRoom = await prisma.room.findUnique({ where: { id: snapshot.roomId } });
  if (dbRoom) {
    // Findings and the complete snapshot commit together. IDs remain readable after restart.
    await prisma.assessment.create({ data: {
      id: snapshot.id, roomId: dbRoom.id, totalHazards: snapshot.detectedCount, remainingHazards: snapshot.detectedCount,
      safetyScore: snapshot.safetyScore, status: "COMPLETED",
      notes: JSON.stringify({ format: "risk-snapshot-v1", snapshot }),
      findings: { create: snapshot.findings.map(finding => ({
        hazardType: finding.hazardType, title: finding.title, description: finding.description,
        severityCategory: finding.severityCategory, detectionRuleId: finding.ruleId,
        evidence: JSON.stringify(finding.evidence), recommendationText: finding.recommendationText,
        targetObjectId: finding.targetObjectId || null, status: finding.status,
      })) },
    } });
    persisted = true;
  }
  cacheAssessmentSnapshot(snapshot);
  return { ...snapshot, persisted };
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
    // ignore
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
 */
export function generateAssessmentReport(snapshot: AssessmentSnapshot): AssessmentReport {
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

