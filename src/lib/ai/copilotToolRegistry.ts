import { z } from "zod";
import { getSafeHomeSystemContext } from "./safeHomeContextService";

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
  args: any,
  activeRoomId?: string
): Promise<ToolExecutionResult> {
  const ctx = getSafeHomeSystemContext(activeRoomId);
  const targetRoomId = args?.roomId || ctx.activeRoomId;
  const currentRoom = ctx.rooms.find((r) => r.id === targetRoomId) || ctx.rooms[0];

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
      if (args?.severity && args.severity !== "ALL") {
        filtered = filtered.filter((h) => h.severityCategory === args.severity);
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
      const objId = args?.objectId;
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
        message: `Đã định vị đồ vật [${foundObj.name}] trong ${foundRoomId}. Máy quay 3D sẽ tự động tập trung vào vị trí này.`,
        data: { object: foundObj, roomId: foundRoomId },
        clientAction: {
          type: "FOCUS_3D_OBJECT",
          payload: { objectId: foundObj.id, roomId: foundRoomId, position: foundObj.position },
        },
      };
    }

    case "focus3DRoom": {
      const rId = args?.roomId;
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
        message: `Đã chuyển sang xem phòng ${targetR.name} trên không gian 3D.`,
        data: { roomId: targetR.id, name: targetR.name },
        clientAction: {
          type: "FOCUS_3D_ROOM",
          payload: { roomId: targetR.id },
        },
      };
    }

    case "highlight3DRisk": {
      const fId = args?.findingId;
      const finding = currentRoom.hazards.find((h) => h.id === fId || h.ruleId === fId);
      return {
        tool: toolName,
        success: Boolean(finding),
        message: finding
          ? `Đã làm nổi bật điểm cảnh báo [${finding.title}] trên mô hình 3D.`
          : `Không tìm thấy nguy cơ có mã ${fId}.`,
        data: finding,
        clientAction: {
          type: "HIGHLIGHT_RISK",
          payload: { findingId: fId, targetObjectId: finding?.targetObjectId },
        },
      };
    }

    case "set3DCameraMode": {
      const mode = args?.mode || "ISOMETRIC";
      return {
        tool: toolName,
        success: true,
        message: `Đã chuyển góc nhìn máy quay 3D sang chế độ ${mode}.`,
        data: { mode },
        clientAction: {
          type: "SET_CAMERA_MODE",
          payload: { mode },
        },
      };
    }

    case "getSurveyProgress": {
      return {
        tool: toolName,
        success: true,
        message: `Tiến độ khảo sát phòng ${currentRoom.name}: 100% (Đã thu thập đầy đủ câu trả lời)`,
        data: { completed: true, answeredCount: 8, totalQuestions: 8 },
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
      return {
        tool: toolName,
        success: true,
        message: "Đã tải 2 kịch bản cải tạo sẵn có: [Hiện trạng ban đầu] và [Kịch bản can thiệp an toàn tối ưu].",
        data: [
          { id: "baseline", name: "Hiện trạng ban đầu (Điểm: 28/100)" },
          { id: "safe-recommended", name: "Đã dán nẹp thảm, giấu dây, lắp thanh vịn (Điểm: 100/100)" },
        ],
      };
    }

    case "previewScenario": {
      return {
        tool: toolName,
        success: true,
        message: "Đã kích hoạt chế độ xem trước kịch bản can thiệp trên Digital Twin.",
        clientAction: {
          type: "SET_CAMERA_MODE",
          payload: { mode: "COMPARISON" },
        },
      };
    }

    case "compareScenarioResults": {
      return {
        tool: toolName,
        success: true,
        message: "So sánh trước/sau: Điểm an toàn tăng từ 28/100 lên 100/100 (+72 điểm), loại trừ 100% rủi ro trượt ngã và vấp dây.",
        data: { beforeScore: 28, afterScore: 100, delta: 72 },
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
      const route = args?.route || "/digital-twin";
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

