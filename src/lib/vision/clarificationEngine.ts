import { prisma } from "@/lib/database/prisma";
import { VisionRoomFact } from "./types";

/**
 * Maps a clarification answer to one or more strongly typed Room Facts.
 */
export function mapClarificationToRoomFacts(
  roomId: string,
  surveyQuestionId: string,
  answerValue: string,
  evidenceReference: string
): VisionRoomFact[] {
  const timestamp = new Date().toISOString();
  const facts: VisionRoomFact[] = [];

  switch (surveyQuestionId) {
    case "BED_006": // Has Rug?
      if (answerValue === "YES") {
        facts.push({
          fieldPath: "rugs.present",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      } else if (answerValue === "NO") {
        facts.push({
          fieldPath: "rugs.present",
          proposedValue: false,
          confirmedValue: false,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
        facts.push({
          fieldPath: "rugs.secured",
          proposedValue: null,
          confirmedValue: null,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      }
      break;

    case "BED_007": // Rug secured?
      if (answerValue === "SECURED") {
        facts.push({
          fieldPath: "rugs.secured",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      } else if (answerValue === "UNSECURED") {
        facts.push({
          fieldPath: "rugs.secured",
          proposedValue: false,
          confirmedValue: false,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      }
      break;

    case "BED_008": // Cables on walkway?
      if (answerValue === "YES") {
        facts.push({
          fieldPath: "electricalCables.onWalkway",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      } else if (answerValue === "NO") {
        facts.push({
          fieldPath: "electricalCables.onWalkway",
          proposedValue: false,
          confirmedValue: false,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      }
      break;

    case "BED_004": // Nighttime lighting?
      if (answerValue === "YES") {
        facts.push({
          fieldPath: "lighting.adequateAtNight",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
        facts.push({
          fieldPath: "lighting.nightLightPresent",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      } else if (answerValue === "NO") {
        facts.push({
          fieldPath: "lighting.adequateAtNight",
          proposedValue: false,
          confirmedValue: false,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
        facts.push({
          fieldPath: "lighting.nightLightPresent",
          proposedValue: false,
          confirmedValue: false,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      }
      break;

    case "BATH_005": // Grab bars?
      if (answerValue === "NONE") {
        facts.push({
          fieldPath: "grabBars.present",
          proposedValue: false,
          confirmedValue: false,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
        facts.push({
          fieldPath: "grabBars.count",
          proposedValue: 0,
          confirmedValue: 0,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      } else if (answerValue === "BOTH") {
        facts.push({
          fieldPath: "grabBars.present",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
        facts.push({
          fieldPath: "grabBars.count",
          proposedValue: 2,
          confirmedValue: 2,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      } else {
        facts.push({
          fieldPath: "grabBars.present",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
        facts.push({
          fieldPath: "grabBars.count",
          proposedValue: 1,
          confirmedValue: 1,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      }
      break;

    case "BATH_003": // Bathroom Floor Slip & Mat
      if (answerValue === "SLIPPERY_NO_MAT") {
        facts.push({
          fieldPath: "floor.isWetReported",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
        facts.push({
          fieldPath: "floor.isSlipperyReported",
          proposedValue: true,
          confirmedValue: true,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      } else {
        facts.push({
          fieldPath: "floor.isSlipperyReported",
          proposedValue: false,
          confirmedValue: false,
          source: "USER_CONFIRMED_VISION",
          verificationStatus: "CONFIRMED",
          evidenceReference,
          updatedAt: timestamp,
        });
      }
      break;

    default:
      break;
  }

  return facts;
}

/**
 * Saves a clarification response to SQLite database and updates VisionRoomFact table.
 */
export async function saveClarificationAnswer(
  clarificationId: string,
  userResponse: string
): Promise<{ success: boolean; facts: VisionRoomFact[] }> {
  try {
    const clarification = await prisma.visionClarification.findUnique({
      where: { id: clarificationId },
    });

    if (!clarification) {
      return { success: false, facts: [] };
    }

    // Update clarification status
    await prisma.visionClarification.update({
      where: { id: clarificationId },
      data: {
        status: "ANSWERED",
        userResponse,
      },
    });

    // Map answer to room facts
    const facts = mapClarificationToRoomFacts(
      clarification.roomId,
      clarification.surveyQuestionId,
      userResponse,
      clarification.id
    );

    // Upsert into VisionRoomFact table
    for (const f of facts) {
      await prisma.visionRoomFact.upsert({
        where: {
          roomId_fieldPath: {
            roomId: clarification.roomId,
            fieldPath: f.fieldPath,
          },
        },
        create: {
          roomId: clarification.roomId,
          fieldPath: f.fieldPath,
          proposedValue: JSON.stringify(f.proposedValue),
          confirmedValue: JSON.stringify(f.confirmedValue),
          evidenceReference: f.evidenceReference,
          verificationStatus: f.verificationStatus,
        },
        update: {
          confirmedValue: JSON.stringify(f.confirmedValue),
          verificationStatus: f.verificationStatus,
        },
      });
    }

    // Audit log
    await prisma.visionAuditEvent.create({
      data: {
        roomId: clarification.roomId,
        actionType: "CLARIFICATION_ANSWERED",
        objectId: clarificationId,
        oldValue: clarification.userResponse,
        newValue: userResponse,
        actorId: "USER",
      },
    });

    return { success: true, facts };
  } catch (error) {
    console.error("[ClarificationEngine] Error saving answer:", error);
    return { success: false, facts: [] };
  }
}

