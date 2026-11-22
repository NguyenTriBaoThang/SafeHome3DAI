import {
  RoomProfile,
  RoomType,
  StructuredAnswer,
  AnswerSource,
} from "./types";
import { calculateSurveyProgress } from "./flowEngine";

/**
 * Builds a strongly typed RoomProfile from survey answers.
 */
export function buildRoomProfile(
  surveyId: string,
  roomId: string,
  roomType: RoomType,
  roomName: string,
  answersMap: Record<string, StructuredAnswer>
): RoomProfile {
  const progress = calculateSurveyProgress(roomType, answersMap);

  // 1. Dimensions
  const dimAnswer = answersMap[roomType === "BEDROOM" ? "BED_001" : "BATH_001"];
  let lengthM: number | null = null;
  let widthM: number | null = null;
  let heightM: number | null = null;
  let measurementSource: AnswerSource = "USER_SELECTED";
  let measurementConfidenceType: "ESTIMATED" | "MEASURED" | "DEMO_DEFAULT" | "UNKNOWN" = "UNKNOWN";

  if (dimAnswer && dimAnswer.value && typeof dimAnswer.value === "object") {
    if (!dimAnswer.value.isUnknown) {
      lengthM = typeof dimAnswer.value.lengthM === "number" ? dimAnswer.value.lengthM : parseFloat(dimAnswer.value.lengthM) || null;
      widthM = typeof dimAnswer.value.widthM === "number" ? dimAnswer.value.widthM : parseFloat(dimAnswer.value.widthM) || null;
      heightM = typeof dimAnswer.value.heightM === "number" ? dimAnswer.value.heightM : parseFloat(dimAnswer.value.heightM) || null;
      measurementSource = dimAnswer.answerSource || "USER_ESTIMATED";
      measurementConfidenceType = "ESTIMATED";
    }
  }

  // 2. Floor
  const wetVal = answersMap["BATH_003"]?.value;
  const slipVal = answersMap["BATH_004"]?.value;
  const stepVal = answersMap["BATH_010"]?.value;

  const floor = {
    material: roomType === "BATHROOM" ? "Gạch men phòng tắm" : "Sàn gỗ / Gạch men",
    isWetReported: wetVal === "YES" ? true : wetVal === "NO" ? false : null,
    isSlipperyReported: slipVal === "YES" ? true : slipVal === "NO" ? false : null,
    levelDifferenceReported: stepVal === "YES" ? true : stepVal === "NO" ? false : null,
    levelDifferenceCm: stepVal === "NO" ? 0 : null,
  };

  // 3. Lighting
  const nightLightWay = answersMap["BED_004"]?.value;
  const nightLamp = answersMap["BED_005"]?.value;
  const bathLight = answersMap["BATH_008"]?.value;

  const lighting = {
    adequateAtNight: nightLightWay === "YES" ? true : nightLightWay === "NO" ? false : null,
    nightLightPresent: nightLamp === "YES" ? true : nightLamp === "NO" ? false : null,
    generalLightingAdequate: bathLight === "YES" ? true : bathLight === "NO" ? false : null,
    sourceQuestionIds: [
      ...(answersMap["BED_004"] ? ["BED_004"] : []),
      ...(answersMap["BED_005"] ? ["BED_005"] : []),
      ...(answersMap["BATH_008"] ? ["BATH_008"] : []),
    ],
  };

  // 4. Rugs
  const rugPresent = answersMap["BED_006"]?.value;
  const rugSecured = answersMap["BED_007"]?.value;

  const rugs = {
    present: rugPresent === "YES" ? true : rugPresent === "NO" ? false : null,
    secured: rugSecured === "YES" ? true : rugSecured === "NO" ? false : null,
    locations: rugPresent === "YES" ? ["Cạnh giường", "Cửa phòng"] : [],
    sourceQuestionIds: [
      ...(answersMap["BED_006"] ? ["BED_006"] : []),
      ...(answersMap["BED_007"] ? ["BED_007"] : []),
    ],
  };

  // 5. Electrical Cables
  const cableVal = answersMap["BED_008"]?.value;
  const electricalCables = {
    onWalkway: cableVal === "YES" ? true : cableVal === "NO" ? false : null,
    sourceQuestionIds: answersMap["BED_008"] ? ["BED_008"] : [],
  };

  // 6. Obstacles
  const bedObst = answersMap["BED_009"]?.value;
  const bathObst = answersMap["BATH_009"]?.value;
  const bedObstTypes = answersMap["BED_010"]?.value;

  const obstacleTypes: string[] = [];
  if (Array.isArray(bedObstTypes)) {
    obstacleTypes.push(...bedObstTypes);
  }

  const obstacles = {
    present:
      (roomType === "BATHROOM" ? bathObst : bedObst) === "YES" ? true :
        (roomType === "BATHROOM" ? bathObst : bedObst) === "NO" ? false : null,
    types: obstacleTypes,
    descriptions: typeof answersMap["BATH_012"]?.value === "string" ? answersMap["BATH_012"].value : "",
    sourceQuestionIds: [
      ...(answersMap["BED_009"] ? ["BED_009"] : []),
      ...(answersMap["BED_010"] ? ["BED_010"] : []),
      ...(answersMap["BATH_009"] ? ["BATH_009"] : []),
    ],
  };

  // 7. Grab Bars (Bathroom)
  const grabVal = answersMap["BATH_005"]?.value;
  const grabLocVal = answersMap["BATH_006"]?.value;
  const grabInspectVal = answersMap["BATH_007"]?.value;

  const grabLocations: string[] = [];
  if (grabLocVal && grabLocVal !== "UNKNOWN") {
    if (grabLocVal === "BOTH") grabLocations.push("TOILET", "SHOWER");
    else grabLocations.push(grabLocVal);
  }

  const grabBars = {
    present: grabVal === "YES" ? true : grabVal === "NO" ? false : null,
    locations: grabLocations,
    inspected: grabInspectVal === "CHECKED" ? true : grabInspectVal === "NOT_CHECKED" ? false : null,
    sourceQuestionIds: [
      ...(answersMap["BATH_005"] ? ["BATH_005"] : []),
      ...(answersMap["BATH_006"] ? ["BATH_006"] : []),
      ...(answersMap["BATH_007"] ? ["BATH_007"] : []),
    ],
  };

  // 8. Accessibility Observations
  const bedMob = answersMap["BED_011"]?.value;
  const bathMob = answersMap["BATH_011"]?.value;
  const reachVal = answersMap["BED_012"]?.value;

  const accessibilityObservations = {
    bedMobilityDifficulty: bedMob === "YES" ? true : bedMob === "NO" ? false : null,
    bathMobilityDifficulty: bathMob === "YES" ? true : bathMob === "NO" ? false : null,
    reachingDifficulty: reachVal === "YES" ? true : reachVal === "NO" ? false : null,
  };

  // 9. Reported Concerns Summary
  const reportedConcerns: string[] = [];
  if (rugs.present && rugs.secured === false) {
    reportedConcerns.push("Thảm chưa cố định chắc chắn");
  }
  if (electricalCables.onWalkway) {
    reportedConcerns.push("Dây điện vắt ngang lối đi");
  }
  if (lighting.adequateAtNight === false || lighting.nightLightPresent === false) {
    reportedConcerns.push("Ánh sáng ban đêm chưa đầy đủ");
  }
  if (floor.isWetReported || floor.isSlipperyReported) {
    reportedConcerns.push("Sàn trơn trượt hoặc ướt nước");
  }
  if (grabBars.present === false || grabBars.inspected === false) {
    reportedConcerns.push("Thiếu thanh vịn hoặc thanh vịn chưa kiểm tra");
  }
  if (floor.levelDifferenceReported) {
    reportedConcerns.push("Bậc thềm hoặc chênh lệch cao độ sàn lối vào");
  }

  const status =
    progress.isComplete
      ? "COMPLETED"
      : progress.answeredCount > 0
      ? "IN_PROGRESS"
      : "NOT_STARTED";

  return {
    id: `profile-${roomId}`,
    surveyId,
    roomId,
    roomType,
    roomName,
    status,
    surveyVersion: "1.0.0",
    dimensions: {
      lengthM,
      widthM,
      heightM,
      measurementSource,
      measurementConfidenceType,
    },
    floor,
    lighting,
    rugs,
    electricalCables,
    obstacles,
    grabBars,
    accessibilityObservations,
    reportedConcerns,
    completenessScore: progress.progressPercent,
    updatedAt: new Date().toISOString(),
  };
}

