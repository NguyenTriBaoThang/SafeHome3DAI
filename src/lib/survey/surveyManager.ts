import { prisma } from "@/lib/database/prisma";
import {
  RoomType,
  StructuredAnswer,
  AnswerSource,
  ConfirmationStatus,
} from "./types";
import {
  calculateSurveyProgress,
  getNextQuestion,
  invalidateStaleAnswers,
} from "./flowEngine";
import { buildRoomProfile } from "./profileBuilder";
import { screenRoomHazards } from "./screeningEngine";
import { getQuestionById } from "./questionBank";

/**
 * Creates a new Home Survey project with initial rooms.
 */
export async function createHomeSurvey(params: {
  name?: string;
  targetResident?: string;
  roomTypes?: string[];
  consentGiven?: boolean;
  generalNotes?: string;
}) {
  const surveyName = params.name || `Khảo sát nhà ở #${Date.now().toString().slice(-4)}`;
  const roomTypesToCreate = params.roomTypes && params.roomTypes.length > 0
    ? params.roomTypes
    : ["BEDROOM", "BATHROOM"];

  const survey = await prisma.homeSurvey.create({
    data: {
      name: surveyName,
      targetResident: params.targetResident || "Người cao tuổi sinh hoạt tại gia đình",
      consentGiven: params.consentGiven ?? true,
      generalNotes: params.generalNotes || null,
      status: "IN_PROGRESS",
      rooms: {
        create: roomTypesToCreate.map((rt) => ({
          roomType: rt,
          name: rt === "BEDROOM" ? "Phòng ngủ chính" : rt === "BATHROOM" ? "Nhà vệ sinh chính" : "Khu vực khảo sát",
          status: "NOT_STARTED",
          currentQuestionId: rt === "BEDROOM" ? "BED_001" : "BATH_001",
        })),
      },
      auditEvents: {
        create: {
          eventType: "SURVEY_CREATED",
          changedFields: JSON.stringify({ surveyName, roomTypes: roomTypesToCreate }),
        },
      },
    },
    include: {
      rooms: true,
    },
  });

  return survey;
}

/**
 * Lists all home surveys with their rooms.
 */
export async function getSurveys() {
  return prisma.homeSurvey.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      rooms: {
        include: {
          profile: true,
          findings: true,
        },
      },
    },
  });
}

/**
 * Gets a single survey by ID.
 */
export async function getSurveyById(surveyId: string) {
  return prisma.homeSurvey.findUnique({
    where: { id: surveyId },
    include: {
      rooms: {
        include: {
          answers: true,
          profile: true,
          findings: true,
          photos: true,
        },
      },
      auditEvents: {
        orderBy: { timestamp: "desc" },
        take: 20,
      },
    },
  });
}

/**
 * Deletes a survey project.
 */
export async function deleteSurvey(surveyId: string) {
  return prisma.homeSurvey.delete({
    where: { id: surveyId },
  });
}

/**
 * Adds an additional room to an existing survey.
 */
export async function addRoomToSurvey(
  surveyId: string,
  roomType: string,
  roomName?: string
) {
  const name =
    roomName ||
    (roomType === "BEDROOM"
      ? "Phòng ngủ bổ sung"
      : roomType === "BATHROOM"
        ? "Nhà vệ sinh tầng 2"
        : "Khu vực khảo sát");

  return prisma.surveyRoom.create({
    data: {
      surveyId,
      roomType,
      name,
      status: "NOT_STARTED",
      currentQuestionId: roomType === "BEDROOM" ? "BED_001" : "BATH_001",
    },
  });
}

/**
 * Retrieves the complete survey state for a specific room.
 */
export async function getRoomSurveyState(roomId: string) {
  const room = await prisma.surveyRoom.findUnique({
    where: { id: roomId },
    include: {
      survey: true,
      answers: true,
      profile: true,
      findings: true,
      photos: true,
    },
  });

  if (!room) {
    throw new Error(`Survey room with id ${roomId} not found`);
  }

  // Convert raw DB answers to StructuredAnswer map
  const answersMap: Record<string, StructuredAnswer> = {};
  for (const raw of room.answers) {
    let parsedValue = raw.value;
    try {
      parsedValue = JSON.parse(raw.value);
    } catch {
      // keep raw string if not JSON
    }

    answersMap[raw.questionId] = {
      questionId: raw.questionId,
      category: raw.category,
      value: parsedValue,
      answerSource: raw.answerSource as AnswerSource,
      confirmationStatus: raw.confirmationStatus as ConfirmationStatus,
      timestamp: raw.updatedAt.toISOString(),
    };
  }

  const progress = calculateSurveyProgress(room.roomType, answersMap);

  return {
    room,
    survey: room.survey,
    answersMap,
    nextQuestion: progress.currentQuestion,
    progress,
    profile: room.profile ? JSON.parse(room.profile.profileJson) : null,
    findings: room.findings,
    photos: room.photos,
  };
}

/**
 * Saves or updates an answer, invalidates downstream dependencies,
 * rebuilds the structured profile, and re-screens hazards.
 */
export async function saveRoomAnswer(params: {
  roomId: string;
  questionId: string;
  value: any;
  answerSource?: AnswerSource;
  confirmationStatus?: ConfirmationStatus;
}) {
  const {
    roomId,
    questionId,
    value,
    answerSource = "USER_SELECTED",
    confirmationStatus = "CONFIRMED",
  } = params;

  const room = await prisma.surveyRoom.findUnique({
    where: { id: roomId },
    include: {
      answers: true,
    },
  });

  if (!room) {
    throw new Error(`Survey room with id ${roomId} not found`);
  }

  // 1. Build current answers map
  const currentAnswersMap: Record<string, StructuredAnswer> = {};
  for (const raw of room.answers) {
    let parsed = raw.value;
    try {
      parsed = JSON.parse(raw.value);
    } catch {
      // keep raw
    }
    currentAnswersMap[raw.questionId] = {
      questionId: raw.questionId,
      category: raw.category,
      value: parsed,
      answerSource: raw.answerSource as AnswerSource,
      confirmationStatus: raw.confirmationStatus as ConfirmationStatus,
    };
  }

  // 2. Invalidate stale dependent answers (e.g. if rug changed from YES to NO)
  const { updatedAnswersMap, invalidatedQuestionIds } = invalidateStaleAnswers(
    room.roomType,
    currentAnswersMap,
    questionId,
    value
  );

  // Set answer source and status
  const qMeta = getQuestionById(questionId);
  updatedAnswersMap[questionId] = {
    questionId,
    category: qMeta?.category || "BASIC",
    value,
    answerSource,
    confirmationStatus,
    timestamp: new Date().toISOString(),
  };

  // 3. Rebuild canonical room profile
  const roomProfile = buildRoomProfile(
    room.surveyId,
    roomId,
    room.roomType as RoomType,
    room.name,
    updatedAnswersMap
  );

  // 4. Re-evaluate screening findings
  const findings = screenRoomHazards(room.roomType, updatedAnswersMap);

  // 5. Calculate progress and next question
  const progress = calculateSurveyProgress(room.roomType, updatedAnswersMap);

  // 6. Transaction-safe database persistence
  await prisma.$transaction(async (tx) => {
    // Delete any invalidated answers
    if (invalidatedQuestionIds.length > 0) {
      await tx.surveyAnswer.deleteMany({
        where: {
          roomId,
          questionId: { in: invalidatedQuestionIds },
        },
      });

      await tx.surveyAuditEvent.create({
        data: {
          surveyId: room.surveyId,
          roomId,
          eventType: "DEPENDENT_INVALIDATED",
          changedFields: JSON.stringify({
            parentQuestionId: questionId,
            invalidatedQuestionIds,
          }),
        },
      });
    }

    // Upsert the submitted answer
    await tx.surveyAnswer.upsert({
      where: {
        roomId_questionId: {
          roomId,
          questionId,
        },
      },
      update: {
        value: JSON.stringify(value),
        answerSource,
        confirmationStatus,
        category: qMeta?.category || "BASIC",
      },
      create: {
        roomId,
        questionId,
        category: qMeta?.category || "BASIC",
        value: JSON.stringify(value),
        answerSource,
        confirmationStatus,
      },
    });

    // Upsert RoomProfile
    await tx.surveyRoomProfile.upsert({
      where: { roomId },
      update: {
        profileJson: JSON.stringify(roomProfile),
        completenessScore: progress.progressPercent,
      },
      create: {
        roomId,
        profileJson: JSON.stringify(roomProfile),
        completenessScore: progress.progressPercent,
      },
    });

    // Sync SurveyFindings
    await tx.surveyFinding.deleteMany({ where: { roomId } });
    if (findings.length > 0) {
      await tx.surveyFinding.createMany({
        data: findings.map((f) => ({
          roomId,
          ruleId: f.ruleId,
          title: f.title,
          category: f.category,
          priority: f.priority,
          observedEvidence: f.observedEvidence,
          recommendation: f.suggestedAction,
          supportingSourceIds: JSON.stringify(f.supportingSourceIds),
          status: "ACTIVE",
        })),
      });
    }

    // Update room status
    const newRoomStatus = progress.isComplete
      ? "COMPLETED"
      : progress.answeredCount > 0
        ? "IN_PROGRESS"
        : "NOT_STARTED";

    await tx.surveyRoom.update({
      where: { id: roomId },
      data: {
        status: newRoomStatus,
        currentQuestionId: progress.currentQuestion?.questionId || null,
        completedAt: progress.isComplete ? new Date() : null,
      },
    });

    // Audit log
    await tx.surveyAuditEvent.create({
      data: {
        surveyId: room.surveyId,
        roomId,
        eventType: "ANSWER_SAVED",
        changedFields: JSON.stringify({ questionId, value, answerSource }),
      },
    });
  });

  return {
    success: true,
    questionId,
    answersMap: updatedAnswersMap,
    invalidatedQuestionIds,
    nextQuestion: progress.currentQuestion,
    progress,
    profile: roomProfile,
    findings,
  };
}

/**
 * Marks a room survey as completed.
 */
export async function completeRoomSurvey(roomId: string) {
  const state = await getRoomSurveyState(roomId);

  if (state.progress.unresolvedRequiredCount > 0) {
    throw new Error(
      `Còn ${state.progress.unresolvedRequiredCount} câu hỏi bắt buộc chưa được giải quyết.`
    );
  }

  await prisma.surveyRoom.update({
    where: { id: roomId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  await prisma.surveyAuditEvent.create({
    data: {
      surveyId: state.survey.id,
      roomId,
      eventType: "SURVEY_COMPLETED",
    },
  });

  return { success: true, roomId };
}

/**
 * Exports complete survey results as structured JSON.
 */
export async function exportSurveyData(surveyId: string) {
  const survey = await getSurveyById(surveyId);
  if (!survey) {
    throw new Error(`Survey ${surveyId} not found`);
  }

  const roomsExport = survey.rooms.map((r) => {
    let parsedProfile = null;
    if (r.profile) {
      try {
        parsedProfile = JSON.parse(r.profile.profileJson);
      } catch {
        parsedProfile = r.profile.profileJson;
      }
    }

    return {
      roomId: r.id,
      roomType: r.roomType,
      roomName: r.name,
      status: r.status,
      completedAt: r.completedAt,
      answersCount: r.answers.length,
      answers: r.answers.map((a) => {
        let val = a.value;
        try {
          val = JSON.parse(a.value);
        } catch {
          // keep
        }
        return {
          questionId: a.questionId,
          category: a.category,
          value: val,
          source: a.answerSource,
        };
      }),
      profile: parsedProfile,
      findings: r.findings.map((f) => ({
        ruleId: f.ruleId,
        title: f.title,
        priority: f.priority,
        observedEvidence: f.observedEvidence,
        recommendation: f.recommendation,
        supportingSourceIds: f.supportingSourceIds ? JSON.parse(f.supportingSourceIds) : [],
      })),
    };
  });

  return {
    surveyId: survey.id,
    surveyName: survey.name,
    dataPartition: survey.dataPartition,
    targetResident: survey.targetResident,
    status: survey.status,
    createdAt: survey.createdAt,
    updatedAt: survey.updatedAt,
    rooms: roomsExport,
    totalFindings: survey.rooms.reduce((acc, r) => acc + r.findings.length, 0),
    exportedAt: new Date().toISOString(),
  };
}

