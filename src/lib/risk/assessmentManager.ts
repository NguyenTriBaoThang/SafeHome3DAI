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
const snapshotMemoryStore = new Map<string, AssessmentSnapshot>();

/**
 * Executes a full risk assessment on a room and persists findings to SQLite database if room exists.
 */
export async function runAndPersistAssessment(rawInput: any): Promise<AssessmentSnapshot> {
  const snapshot = evaluateRoomHazards(rawInput);
  snapshotMemoryStore.set(snapshot.id, snapshot);

  // Also cache by room ID as latest
  snapshotMemoryStore.set(`latest-${snapshot.roomId}`, snapshot);

  // Persist to Prisma DB if roomId corresponds to a database Room or SurveyRoom
  try {
    const dbRoom = await prisma.room.findUnique({
      where: { id: snapshot.roomId },
    });

    if (dbRoom) {
      // Save Assessment record
      const dbAssessment = await prisma.assessment.create({
        data: {
          roomId: dbRoom.id,
          totalHazards: snapshot.detectedCount,
          resolvedHazards: 0,
          remainingHazards: snapshot.detectedCount,
          newHazards: 0,
          safetyScore: snapshot.safetyScore,
          status: "COMPLETED",
          notes: JSON.stringify({
            snapshotId: snapshot.id,
            totalRulesEvaluated: snapshot.totalRulesEvaluated,
            highPriorityCount: snapshot.highPriorityCount,
            mediumPriorityCount: snapshot.mediumPriorityCount,
            lowPriorityCount: snapshot.lowPriorityCount,
            needsVerificationCount: snapshot.needsVerificationCount,
          }),
        },
      });

      // Save Hazard Findings
      for (const finding of snapshot.findings) {
        await prisma.hazardFinding.create({
          data: {
            assessmentId: dbAssessment.id,
            hazardType: finding.hazardType,
            title: finding.title,
            description: finding.description,
            severityCategory: finding.severityCategory,
            detectionRuleId: finding.ruleId,
            evidence: JSON.stringify(finding.evidence),
            recommendationText: finding.recommendationText,
            targetObjectId: finding.targetObjectId || null,
            status: finding.status,
          },
        });
      }
    }
  } catch (err) {
    // If DB insert encounters an issue (e.g. synthetic or test roomId), we gracefully continue with in-memory snapshot
    console.warn("[RiskManager] SQLite persistence skipped, served from in-memory snapshot:", err);
  }

  return snapshot;
}

/**
 * Gets the latest assessment snapshot for a given roomId.
 */
export async function getLatestAssessmentForRoom(roomId: string): Promise<AssessmentSnapshot | null> {
  const cached = snapshotMemoryStore.get(`latest-${roomId}`);
  if (cached) return cached;

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

