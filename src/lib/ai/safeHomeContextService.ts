import { INITIAL_ROOMS } from "@/data/mockRooms";
import { runEnvironmentalAssessment, calculateSafetyScore } from "@/features/risk-engine/rules";
import { RoomState, HazardFindingResult } from "@/types";

export interface SystemRoomContext {
  id: string;
  name: string;
  roomType: string;
  dimensions: { width: number; length: number; height: number };
  floorMaterial: string;
  lightingLevel: number;
  isWet: boolean;
  isSlipResistant: boolean;
  grabBarsCount: number;
  objects: Array<{
    id: string;
    name: string;
    category: string;
    modelType: string;
    position: [number, number, number];
    dimensions: { width: number; length: number; height: number };
    isFixed?: boolean;
    isLoose?: boolean;
    isWalkwayObstacle?: boolean;
  }>;
  hazards: Array<{
    id: string;
    ruleId: string;
    title: string;
    severityCategory: "HIGH" | "MEDIUM" | "LOW";
    description: string;
    targetObjectId?: string;
    recommendationText: string;
  }>;
  safetyScore: number;
}

export interface FullSystemContext {
  activeRoomId: string;
  rooms: SystemRoomContext[];
  residentProfile: {
    name: string;
    age: number;
    healthConditions: string[];
    mobilityNotes: string;
  };
}

/**
 * Returns complete context of all rooms, objects, and clinical risk findings.
 */
export function getSafeHomeSystemContext(activeRoomId?: string, roomState?: RoomState): FullSystemContext {
  const sourceRooms = roomState
    ? [...INITIAL_ROOMS.filter((room) => room.id !== roomState.id), roomState]
    : INITIAL_ROOMS;
  const rooms: SystemRoomContext[] = sourceRooms.map((r) => {
    const findings: HazardFindingResult[] = runEnvironmentalAssessment(r);
    const score = calculateSafetyScore(findings);

    return {
      id: r.id,
      name: r.name,
      roomType: r.roomType,
      dimensions: r.dimensions,
      floorMaterial: r.floorMaterial,
      lightingLevel: r.lightingLevel,
      isWet: r.isWet,
      isSlipResistant: r.isSlipResistant,
      grabBarsCount: r.grabBarsCount,
      objects: r.objects.map((obj) => ({
        id: obj.id,
        name: obj.name,
        category: obj.category,
        modelType: obj.modelType,
        position: obj.position,
        dimensions: obj.dimensions,
        isFixed: obj.isFixed,
        isLoose: obj.isLoose,
        isWalkwayObstacle: obj.isWalkwayObstacle,
      })),
      hazards: findings.map((f) => ({
        id: f.id,
        ruleId: f.detectionRuleId,
        title: f.title,
        severityCategory: f.severityCategory,
        description: f.description,
        targetObjectId: f.targetObjectId,
        recommendationText: f.recommendationText,
      })),
      safetyScore: score,
    };
  });

  const selectedRoomId = activeRoomId || rooms[0]?.id || "room-bedroom-01";

  return {
    activeRoomId: selectedRoomId,
    rooms,
    residentProfile: {
      name: "Bác Nam",
      age: 75,
      healthConditions: ["Giảm thị lực ban đêm", "Thoái hóa khớp gối độ 2", "Hạ huyết áp tư thế"],
      mobilityNotes: "Đi lại cần khoảng tựa vững, bước chân lê, tần suất đi vệ sinh ban đêm 2 lần/đêm",
    },
  };
}

/**
 * Formats system context into clear markdown prompt for LLM instruction injection.
 */
export function formatSystemContextPrompt(ctx: FullSystemContext): string {
  const activeRoom = ctx.rooms.find((r) => r.id === ctx.activeRoomId) || ctx.rooms[0];

  let prompt = `### THÔNG TIN HỒ SƠ NGƯỜI CAO TUỔI:\n`;
  prompt += `- Đối tượng: ${ctx.residentProfile.name} (${ctx.residentProfile.age} tuổi)\n`;
  prompt += `- Bệnh nền & suy giảm thể chất: ${ctx.residentProfile.healthConditions.join(", ")}\n`;
  prompt += `- Đặc điểm vận động: ${ctx.residentProfile.mobilityNotes}\n\n`;

  prompt += `### KHÔNG GIAN ĐANG CHỌN KHẢO SÁT: ${activeRoom.name} (${activeRoom.id})\n`;
  prompt += `- Kích thước: ${activeRoom.dimensions.width}m x ${activeRoom.dimensions.length}m x ${activeRoom.dimensions.height}m\n`;
  prompt += `- Vật liệu sàn: ${activeRoom.floorMaterial} (${activeRoom.isSlipResistant ? "Chống trượt" : "Dễ trơn trượt"})\n`;
  prompt += `- Độ rọi ánh sáng: ${activeRoom.lightingLevel} Lux (${activeRoom.lightingLevel < 50 ? "Thiếu sáng ban đêm nghiêm trọng" : "Đầy đủ"})\n`;
  prompt += `- Tình trạng ẩm ướt: ${activeRoom.isWet ? "Sàn ướt" : "Khô ráo"}\n`;
  prompt += `- Số lượng thanh vịn hiện có: ${activeRoom.grabBarsCount} thanh\n`;
  prompt += `- Điểm an toàn môi trường hiện tại: ${activeRoom.safetyScore}/100\n\n`;

  prompt += `### DANH MỤC ĐỒ NỘI THẤT TRONG PHÒNG:\n`;
  activeRoom.objects.forEach((obj, idx) => {
    prompt += `${idx + 1}. [${obj.id}] ${obj.name} (${obj.category}) — Tọa độ: [${obj.position.join(", ")}], Cố định: ${obj.isFixed ? "Có" : "Không"}\n`;
  });

  prompt += `\n### CÁC MỐI NGUY TÉ NGÃ PHÁT HIỆN TẠI HIỆN TRƯỜNG (${activeRoom.hazards.length} vi phạm):\n`;
  if (activeRoom.hazards.length === 0) {
    prompt += `- Không ghi nhận nguy cơ theo bộ quy tắc đánh giá hiện tại.\n`;
  } else {
    activeRoom.hazards.forEach((h, idx) => {
      prompt += `${idx + 1}. [${h.id}] (${h.severityCategory}) ${h.title}: ${h.description} [Vật thể liên quan: ${h.targetObjectId || "Toàn phòng"}]. Khuyến nghị: ${h.recommendationText}\n`;
    });
  }

  return prompt;
}

/**
 * Context Resolver: handles reference phrases like "phòng này", "cái giường này", "tại sao", "xem trên 3D"
 */
export function resolveContextReference(
  userQuery: string,
  ctx: FullSystemContext,
  lastMentionedObjectId?: string
): {
  resolvedTargetId?: string;
  resolvedRoomId?: string;
  inferredIntent?: "FOCUS_3D" | "EXPLAIN_WHY" | "FIX_SUGGESTION" | "GENERAL";
} {
  const q = userQuery.toLowerCase();
  let activeRoom = ctx.rooms.find((r) => r.id === ctx.activeRoomId) || ctx.rooms[0];

  let resolvedTargetId = lastMentionedObjectId;
  let resolvedRoomId = activeRoom.id;
  let inferredIntent: "FOCUS_3D" | "EXPLAIN_WHY" | "FIX_SUGGESTION" | "GENERAL" = "GENERAL";

  // Resolve the room before looking for its objects (e.g. a bathroom grab bar
  // while the bedroom is currently selected).
  if (/phòng ngủ|bedroom/.test(q) && activeRoom.roomType !== "BEDROOM") {
    activeRoom = ctx.rooms.find((r) => r.roomType === "BEDROOM") || activeRoom;
  } else if (/nhà vệ sinh|phòng tắm|toilet|wc|bathroom/.test(q) && activeRoom.roomType !== "BATHROOM") {
    activeRoom = ctx.rooms.find((r) => r.roomType === "BATHROOM") || activeRoom;
  }
  resolvedRoomId = activeRoom.id;

  if (q.includes("3d") || q.includes("xem") || q.includes("cho tôi thấy") || q.includes("chỉ cho tôi")) {
    inferredIntent = "FOCUS_3D";
  } else if (q.includes("tại sao") || q.includes("vì sao") || q.includes("nguy hiểm không")) {
    inferredIntent = "EXPLAIN_WHY";
  } else if (q.includes("sửa") || q.includes("khắc phục") || q.includes("xử lý") || q.includes("làm sao")) {
    inferredIntent = "FIX_SUGGESTION";
  }

  // Object keyword resolution
  if (q.includes("thảm") || q.includes("rug")) {
    const rugObj = activeRoom.objects.find((o) => o.modelType === "rug" || o.category === "RUG");
    if (rugObj) resolvedTargetId = rugObj.id;
  } else if (q.includes("dây điện") || q.includes("dây cắm") || q.includes("cable")) {
    const cableObj = activeRoom.objects.find((o) => o.modelType === "cable" || o.category === "CABLE");
    if (cableObj) resolvedTargetId = cableObj.id;
  } else if (q.includes("giường") || q.includes("bed")) {
    const bedObj = activeRoom.objects.find((o) => o.modelType === "bed");
    if (bedObj) resolvedTargetId = bedObj.id;
  } else if (q.includes("bồn cầu") || q.includes("toilet") || q.includes("wc")) {
    const toiletObj = activeRoom.objects.find((o) => o.modelType === "toilet");
    if (toiletObj) resolvedTargetId = toiletObj.id;
  } else if (q.includes("thanh vịn") || q.includes("tay vịn") || q.includes("grab")) {
    const grabObj = activeRoom.objects.find((o) => o.modelType === "grab_bar");
    if (grabObj) resolvedTargetId = grabObj.id;
  }

  return {
    resolvedTargetId,
    resolvedRoomId,
    inferredIntent,
  };
}

