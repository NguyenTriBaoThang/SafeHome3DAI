import { prisma } from "@/lib/database/prisma";
import { buildRoomProfile } from "@/lib/survey/profileBuilder";
import { evaluateRoomHazards } from "@/lib/risk/ruleEngine";
import { AssessmentSnapshot } from "@/lib/risk/types";

/**
 * Synchronizes confirmed VisionRoomFacts into the canonical Guided Survey database.
 * Updates SurveyAnswer, rebuilds SurveyRoomProfile, and persists.
 */
export async function syncConfirmedVisionFactsToSurvey(
  roomId: string
): Promise<{ success: boolean; updatedProfile: any; count: number }> {
  try {
    // 1. Fetch all confirmed facts for this room
    const confirmedFacts = await prisma.visionRoomFact.findMany({
      where: {
        roomId,
        verificationStatus: "CONFIRMED",
      },
    });

    if (confirmedFacts.length === 0) {
      return { success: true, updatedProfile: null, count: 0 };
    }

    // 2. Map facts to SurveyAnswer question IDs
    for (const fact of confirmedFacts) {
      let questionId = "";
      let category = "BASIC";
      let answerValue = JSON.parse(fact.confirmedValue || "null");

      if (fact.fieldPath === "rugs.present") {
        questionId = "BED_006";
        category = "FLOOR";
        answerValue = answerValue === true ? "YES" : "NO";
      } else if (fact.fieldPath === "rugs.secured") {
        questionId = "BED_007";
        category = "FLOOR";
        answerValue = answerValue === true ? "SECURED" : "UNSECURED";
      } else if (fact.fieldPath === "electricalCables.onWalkway") {
        questionId = "BED_008";
        category = "CABLE";
        answerValue = answerValue === true ? "YES" : "NO";
      } else if (fact.fieldPath === "lighting.adequateAtNight") {
        questionId = "BED_004";
        category = "LIGHTING";
        answerValue = answerValue === true ? "YES" : "NO";
      } else if (fact.fieldPath === "grabBars.present") {
        questionId = "BATH_005";
        category = "GRAB_BAR";
        answerValue = answerValue === true ? "BOTH" : "NONE";
      } else if (fact.fieldPath === "floor.isSlipperyReported") {
        questionId = "BATH_003";
        category = "FLOOR";
        answerValue = answerValue === true ? "SLIPPERY_NO_MAT" : "HAS_NON_SLIP_MAT";
      }

      if (questionId) {
        // Upsert into SurveyAnswer table
        await prisma.surveyAnswer.upsert({
          where: {
            roomId_questionId: {
              roomId,
              questionId,
            },
          },
          create: {
            roomId,
            questionId,
            category,
            value: JSON.stringify(answerValue),
            answerSource: "VISION_SUGGESTED",
            confirmationStatus: "CONFIRMED",
          },
          update: {
            value: JSON.stringify(answerValue),
            answerSource: "VISION_SUGGESTED",
            confirmationStatus: "CONFIRMED",
          },
        });
      }
    }

    // 3. Rebuild and persist canonical SurveyRoomProfile if room exists
    let updatedProfile: any = null;
    const room = await prisma.surveyRoom.findUnique({
      where: { id: roomId },
    });

    if (room) {
      const allAnswers = await prisma.surveyAnswer.findMany({
        where: { roomId },
      });
      const answersMap: Record<string, any> = {};
      for (const a of allAnswers) {
        try {
          answersMap[a.questionId] = {
            questionId: a.questionId,
            category: a.category,
            value: JSON.parse(a.value),
            answerSource: a.answerSource,
            confirmationStatus: a.confirmationStatus,
            timestamp: a.updatedAt.toISOString(),
          };
        } catch {
          answersMap[a.questionId] = {
            questionId: a.questionId,
            category: a.category,
            value: a.value,
            answerSource: a.answerSource,
            confirmationStatus: a.confirmationStatus,
            timestamp: a.updatedAt.toISOString(),
          };
        }
      }

      updatedProfile = buildRoomProfile(
        room.surveyId,
        roomId,
        room.roomType as any,
        room.name,
        answersMap
      );

      await prisma.surveyRoomProfile.upsert({
        where: { roomId },
        create: {
          roomId,
          profileJson: JSON.stringify(updatedProfile),
          version: "1.0.0",
          completenessScore: updatedProfile.completenessScore,
        },
        update: {
          profileJson: JSON.stringify(updatedProfile),
          completenessScore: updatedProfile.completenessScore,
        },
      });
    }

    // 4. Record audit event
    await prisma.visionAuditEvent.create({
      data: {
        roomId,
        actionType: "FACTS_SYNCED_TO_SURVEY",
        newValue: JSON.stringify({ syncedFactsCount: confirmedFacts.length }),
        actorId: "USER",
      },
    });

    return {
      success: true,
      updatedProfile,
      count: confirmedFacts.length,
    };
  } catch (error) {
    console.error("[SurveySyncAdapter] Sync failed:", error);
    return { success: false, updatedProfile: null, count: 0 };
  }
}

/**
 * Triggers re-assessment of risk rules using the newly updated profile from vision facts.
 */
export async function triggerRiskAssessmentFromVision(
  roomId: string
): Promise<AssessmentSnapshot> {
  // First ensure latest facts are synced to survey profile
  const syncResult = await syncConfirmedVisionFactsToSurvey(roomId);
  const profileToEvaluate = syncResult.updatedProfile || { roomId, roomType: "BEDROOM" };

  // Run the deterministic Risk Rule Engine
  const snapshot = evaluateRoomHazards(profileToEvaluate);
  return snapshot;
}
