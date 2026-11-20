import { z } from "zod";
import { getSafeHomeSystemContext, FullSystemContext } from "./safeHomeContextService";
import { prisma } from "@/lib/database/prisma";

export interface ToolExecutionResult {
  tool: string;
  success: boolean;
  message: string;
  data?: any;
  clientAction?: {
    type: "NAVIGATE" | "FOCUS_3D_OBJECT" | "FOCUS_3D_ROOM" | "SET_CAMERA_MODE" | "HIGHLIGHT_RISK";
    payload: any;
  };
}

export const COPILOT_TOOLS = [
  {
    name: "getCurrentRoom",
    description: "Lấy thông tin chi tiết căn phòng đang chọn: kích thước, ánh sáng, vật liệu sàn, điểm số an toàn.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng (tùy chọn, mặc định là phòng hiện tại)"),
    }),
  },
  {
    name: "getRoomObjects",
    description: "Lấy danh mục toàn bộ đồ nội thất và vật dụng có trong phòng.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng"),
    }),
  },
  {
    name: "getRoomRiskFindings",
    description: "Lấy danh sách tất cả các vi phạm và nguy cơ té ngã đã phát hiện trong phòng.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng"),
      severity: z.enum(["ALL", "HIGH", "MEDIUM", "LOW"]).optional().describe("Lọc theo mức độ nghiêm trọng"),
    }),
  },
  {
    name: "getRiskAssessment",
    description: "Lấy bảng điểm đánh giá an toàn chi tiết (0-100) và các khoản trừ điểm y khoa.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng"),
    }),
  },
  {
    name: "focus3DObject",
    description: "Điều khiển camera 3D Digital Twin bay đến và phóng to vào một đồ vật cụ thể (ví dụ: thảm, dây điện, giường).",
    parameters: z.object({
      objectId: z.string().describe("Mã định danh vật thể (ví dụ: obj-rug-01, obj-cable-01, obj-bed-01)"),
    }),
  },
  {
    name: "focus3DRoom",
    description: "Chuyển đổi không gian 3D sang một phòng khác (ví dụ: chuyển từ phòng ngủ sang nhà vệ sinh).",
    parameters: z.object({
      roomId: z.string().describe("Mã phòng cần xem trên 3D"),
    }),
  },
  {
    name: "highlight3DRisk",
    description: "Kích hoạt ghim cảnh báo rủi ro 3D tương ứng với một mối nguy phát hiện.",
    parameters: z.object({
      findingId: z.string().describe("Mã vi phạm rủi ro"),
    }),
  },
  {
    name: "set3DCameraMode",
    description: "Đổi chế độ góc nhìn máy quay 3D (DOLLHOUSE, INTERIOR, TOP, WALKTHROUGH, SAFETY, COMPARISON).",
    parameters: z.object({
      mode: z.enum(["ISOMETRIC", "INTERIOR", "TOP", "WALKTHROUGH", "SAFETY", "COMPARISON"]).describe("Chế độ góc nhìn"),
    }),
  },
  {
    name: "getSurveyProgress",
    description: "Kiểm tra tiến độ hoàn thành khảo sát thích ứng của căn phòng.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng"),
    }),
  },
  {
    name: "openSurvey",
    description: "Mở giao diện khảo sát trực quan cho người dùng.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng cần khảo sát"),
    }),
  },
  {
    name: "getAvailableScenarios",
    description: "Lấy danh sách các kịch bản mô phỏng cải tạo What-If hiện có.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng"),
    }),
  },
  {
    name: "previewScenario",
    description: "Mô phỏng trước một kịch bản cải tạo an toàn trên không gian 3D.",
    parameters: z.object({
      scenarioId: z.string().describe("Mã kịch bản cần nạp"),
    }),
  },
  {
    name: "compareScenarioResults",
    description: "So sánh kết quả điểm số an toàn giữa trạng thái trước và sau khi cải tạo.",
    parameters: z.object({
      roomId: z.string().optional().describe("Mã phòng"),
    }),
  },
  {
    name: "openReport",
    description: "Mở trang xuất báo cáo kế hoạch cải tạo an toàn môi trường.",
    parameters: z.object({
      reportId: z.string().optional().describe("Mã báo cáo"),
    }),
  },
  {
    name: "navigateToPage",
    description: "Điều hướng người dùng đến một phân hệ chức năng trong ứng dụng.",
    parameters: z.object({
      route: z.enum([
        "/digital-twin",
        "/workflow",
        "/ai-vision",
        "/risk-assessment",
        "/scenario-simulator",
        "/reports",
        "/explainability",
        "/experience",
      ]).describe("Đường dẫn phân hệ cần mở"),
    }),
  },
];

/**
 * Execute tool call safely with system context
 */
export async function executeCopilotTool(
  toolName: string,
  args: unknown,
  activeRoomId?: string,
  systemContext?: FullSystemContext
): Promise<ToolExecutionResult> {
  const tool = COPILOT_TOOLS.find((entry) => entry.name === toolName);
  if (!tool) return { tool: toolName, success: false, message: "Công cụ không tồn tại trong hệ thống." };
  const parsed = tool.parameters.strict().safeParse(args);
  if (!parsed.success) {
    return { tool: toolName, success: false, message: "Tham số công cụ không hợp lệ.", data: parsed.error.flatten() };
  }
  const input = parsed.data as Record<string, string | undefined>;
  const ctx = systemContext || getSafeHomeSystemContext(activeRoomId);
  const targetRoomId = input.roomId || activeRoomId || ctx.activeRoomId;
  const currentRoom = ctx.rooms.find((r) => r.id === targetRoomId);
  if (!currentRoom) return { tool: toolName, success: false, message: `Không tìm thấy phòng có mã ${targetRoomId}.` };

  // Every case below receives validated arguments only.
  const validatedArgs = input;

  switch (toolName) {
    case "getCurrentRoom": {
      return {
        tool: toolName,
        success: true,
        message: `Đã truy xuất dữ liệu phòng ${currentRoom.name}`,
        data: {
          id: currentRoom.id,
          name: currentRoom.name,
          dimensions: currentRoom.dimensions,
          floorMaterial: currentRoom.floorMaterial,
          lightingLevel: currentRoom.lightingLevel,
          isWet: currentRoom.isWet,
          isSlipResistant: currentRoom.isSlipResistant,
          grabBarsCount: currentRoom.grabBarsCount,
          safetyScore: currentRoom.safetyScore,
          hazardsCount: currentRoom.hazards.length,
        },
      };
    }

    case "getRoomObjects": {
      return {
        tool: toolName,
        success: true,
        message: `Đã tìm thấy ${currentRoom.objects.length} đồ vật trong ${currentRoom.name}`,
        data: currentRoom.objects,
      };
    }

    case "getRoomRiskFindings": {
      let filtered = currentRoom.hazards;
      if (validatedArgs.severity && validatedArgs.severity !== "ALL") {
        filtered = filtered.filter((h) => h.severityCategory === validatedArgs.severity);
      }
      return {
        tool: toolName,
        success: true,
        message: `Ghi nhận ${filtered.length} nguy cơ té ngã cần lưu ý`,
        data: filtered,
      };
    }

    case "getRiskAssessment": {
      return {
        tool: toolName,
        success: true,
        message: `Điểm an toàn hiện tại là ${currentRoom.safetyScore}/100`,
        data: {
          safetyScore: currentRoom.safetyScore,
          totalHazards: currentRoom.hazards.length,
          criticalCount: currentRoom.hazards.filter((h) => h.severityCategory === "HIGH").length,
          standards: ["WHO 2021", "CDC STEADI"],
        },
      };
    }

    case "focus3DObject": {
      const objId = validatedArgs.objectId;
      // Search across all rooms
      let foundObj: any = null;
      let foundRoomId: string = currentRoom.id;

      for (const r of ctx.rooms) {
        const o = r.objects.find((item) => item.id === objId || item.modelType === objId);
        if (o) {
          foundObj = o;
          foundRoomId = r.id;
          break;
        }
      }

      if (!foundObj) {
        return {
          tool: toolName,
          success: false,
          message: `Không tìm thấy đồ vật có mã ${objId} trong mô hình 3D.`,
        };
      }

      return {
        tool: toolName,
        success: true,
        message: `Đã định vị đồ vật [${foundObj.name}]. Bấm mở trên 3D để tập trung vào vị trí này.`,
        data: { object: foundObj, roomId: foundRoomId },
        clientAction: {
          type: "FOCUS_3D_OBJECT",
          payload: { objectId: foundObj.id, roomId: foundRoomId, position: foundObj.position },
        },
      };
    }

    case "focus3DRoom": {
      const rId = validatedArgs.roomId;
      const targetR = ctx.rooms.find((r) => r.id === rId);
      if (!targetR) {
        return {
          tool: toolName,
          success: false,
          message: `Không tìm thấy phòng có mã ${rId}.`,
        };
      }
      return {
        tool: toolName,
        success: true,
        message: `Sẵn sàng mở phòng ${targetR.name} trên không gian 3D.`,
        data: { roomId: targetR.id, name: targetR.name },
        clientAction: {
          type: "FOCUS_3D_ROOM",
          payload: { roomId: targetR.id },
        },
      };
    }

    case "highlight3DRisk": {
      const fId = validatedArgs.findingId;
      const finding = currentRoom.hazards.find((h) => h.id === fId || h.ruleId === fId);
      return {
        tool: toolName,
        success: Boolean(finding),
        message: finding
          ? `Sẵn sàng làm nổi bật điểm cảnh báo [${finding.title}] trên mô hình 3D.`
          : `Không tìm thấy nguy cơ có mã ${fId}.`,
        data: finding,
        clientAction: finding ? {
          type: "HIGHLIGHT_RISK",
          payload: { findingId: finding.id, roomId: currentRoom.id, targetObjectId: finding.targetObjectId },
        } : undefined,
      };
    }

    case "set3DCameraMode": {
      const mode = validatedArgs.mode;
      return {
        tool: toolName,
        success: true,
        message: `Sẵn sàng mở góc nhìn máy quay 3D ở chế độ ${mode}.`,
        data: { mode },
        clientAction: {
          type: "SET_CAMERA_MODE",
          payload: { mode },
        },
      };
    }

    case "getSurveyProgress": {
      const survey = await prisma.surveyRoom.findFirst({
        where: { linked3dRoomId: currentRoom.id },
        orderBy: { updatedAt: "desc" },
        include: { profile: true, _count: { select: { answers: true } } },
      });
      return {
        tool: toolName,
        success: Boolean(survey),
        message: survey ? `Đã truy xuất tiến độ khảo sát phòng ${currentRoom.name}.` : "Chưa có khảo sát liên kết với phòng này.",
        data: survey ? { completed: survey.status === "COMPLETED", status: survey.status,
          answeredCount: survey._count.answers, completenessScore: survey.profile?.completenessScore ?? null } : undefined,
      };
    }

    case "openSurvey": {
      return {
        tool: toolName,
        success: true,
        message: `Đang mở biểu mẫu khảo sát an toàn thích ứng cho phòng ${currentRoom.name}.`,
        clientAction: {
          type: "NAVIGATE",
          payload: { route: "/ai-guided-survey" },
        },
      };
    }

    case "getAvailableScenarios": {
      const scenarios = await prisma.simulationScenario.findMany({
        where: { roomId: currentRoom.id },
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: { id: true, name: true, isBaseline: true },
      });
      return {
        tool: toolName,
        success: true,
        message: `Tìm thấy ${scenarios.length} kịch bản đã lưu cho phòng này.`,
        data: scenarios,
      };
    }

    case "previewScenario": {
      return {
        tool: toolName,
        success: false,
        message: "Hãy chọn kịch bản đã lưu trong bộ mô phỏng để xem trước. Agent chưa thể nạp trực tiếp kịch bản.",
        clientAction: {
          type: "NAVIGATE",
          payload: { route: "/scenario-simulator" },
        },
      };
    }

    case "compareScenarioResults": {
      let beforeScore: number | undefined;
      let afterScore: number | undefined;
      let baselineId: string | undefined;
      let interventionId: string | undefined;

      try {
        const scenarios = await prisma.simulationScenario.findMany({
          where: { roomId: currentRoom.id },
          orderBy: { updatedAt: "desc" },
          include: { assessments: { orderBy: { assessmentDate: "desc" }, take: 1 } },
        });
        const baseline = scenarios.find((scenario) => scenario.isBaseline && scenario.assessments.length);
        const intervention = scenarios.find((scenario) => !scenario.isBaseline && scenario.assessments.length);
        if (baseline && intervention) {
          beforeScore = baseline.assessments[0].safetyScore;
          afterScore = intervention.assessments[0].safetyScore;
          baselineId = baseline.id;
          interventionId = intervention.id;
        }
      } catch {
        return { tool: toolName, success: false, message: "Chưa thể đọc các đánh giá đã lưu để so sánh. Vui lòng thử lại." };
      }

      if (beforeScore === undefined || afterScore === undefined) {
        return { tool: toolName, success: false, message: "Chưa có đủ đánh giá trước và sau của các kịch bản đã lưu để so sánh." };
      }

      return {
        tool: toolName,
        success: true,
        message: `Điểm an toàn từ ${beforeScore}/100 lên ${afterScore}/100 (chênh lệch ${afterScore - beforeScore} điểm).`,
        data: {
          beforeScore,
          afterScore,
          delta: afterScore - beforeScore,
          baselineScenarioId: baselineId,
          comparedScenarioId: interventionId,
        },
        clientAction: {
          type: "NAVIGATE",
          payload: { route: "/analytics" },
        },
      };
    }

    case "openReport": {
      return {
        tool: toolName,
        success: true,
        message: "Đang mở trang Báo cáo an toàn môi trường sống & Dự toán vật tư cải tạo.",
        clientAction: {
          type: "NAVIGATE",
          payload: { route: "/reports" },
        },
      };
    }

    case "navigateToPage": {
      const route = validatedArgs.route;
      return {
        tool: toolName,
        success: true,
        message: `Đang chuyển hướng đến phân hệ ${route}.`,
        clientAction: {
          type: "NAVIGATE",
          payload: { route },
        },
      };
    }

    default:
      return {
        tool: toolName,
        success: false,
        message: `Công cụ ${toolName} không tồn tại trong hệ thống.`,
      };
  }
}

